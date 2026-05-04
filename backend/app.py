from flask import Flask, jsonify, redirect, request, send_from_directory, session
from flask_cors import CORS
import requests
import json
import os
import random
import re
import secrets
import time
from functools import wraps
from html import escape
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus, urlencode
from nifty50 import NIFTY50
from token_manager import get_access_token, is_expired, load_token, save_token

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR))
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "change-this-secret-before-hosting")
CORS(app)

NEWS_CACHE_PATH = BASE_DIR / "news_cache.json"
AI_CACHE_PATH = BASE_DIR / "ai_cache.json"
FINANCIALS_CACHE_PATH = BASE_DIR / "financials_cache.json"
NEWS_CACHE_TTL = 60 * 60 * 24 * 30
AI_CACHE_TTL = 60 * 60 * 24 * 365
FINANCIALS_CACHE_TTL = 60 * 60 * 24 * 30
FINANCIALS_CACHE_VERSION = "nse-inr-v6-top-ratios"
NEWS_LIMIT = 8
AUTH_STATE_PATH = BASE_DIR / "auth_state.json"
UPSTOX_AUTH_URL = "https://api.upstox.com/v2/login/authorization/dialog"
UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"
APIFY_RUN_TIMEOUT = 90

# =========================
# SERVE FRONTEND
# =========================
@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)

# =========================
# LOAD INSTRUMENT JSON
# =========================
def load_instrument_map():
    with open(BASE_DIR / "instruments.json", "r") as f:
        return json.load(f)

def load_json_cache(path):
    if not path.exists():
        return {}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

def save_json_cache(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

def to_nse_base_symbol(symbol):
    return str(symbol or "").upper().strip().replace(".NS", "")

def to_nse_symbol(symbol):
    base_symbol = to_nse_base_symbol(symbol)
    return f"{base_symbol}.NS" if base_symbol else ""

def parse_metric_number(value):
    if value is None:
        return None

    cleaned = re.sub(r"[,%xX\s]+", "", str(value))
    if not cleaned or cleaned == "--":
        return None

    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None

def load_card_metrics():
    cache = load_json_cache(FINANCIALS_CACHE_PATH)
    metrics = {}

    for entry in cache.values():
        payload = entry.get("payload") if isinstance(entry, dict) else None
        if not isinstance(payload, dict):
            continue

        symbol = to_nse_base_symbol(payload.get("symbol"))
        if not symbol:
            continue

        info = payload.get("info") or {}
        valuation = payload.get("valuation") or {}
        metrics[symbol] = {
            "pe": parse_metric_number(info.get("stockPe") or valuation.get("peTrailing")),
            "roe": parse_metric_number(info.get("roe") or valuation.get("roe")),
            "marketCap": parse_metric_number(info.get("marketCap") or valuation.get("marketCap"))
        }

    return metrics

def sort_by_change_desc(stocks):
    return sorted(stocks, key=lambda stock: float(stock.get("change") or 0), reverse=True)

def sort_by_abs_change_desc(stocks):
    return sorted(stocks, key=lambda stock: abs(float(stock.get("change") or 0)), reverse=True)

def get_upstox_config():
    return {
        "client_id": os.environ.get("UPSTOX_CLIENT_ID", "").strip(),
        "client_secret": os.environ.get("UPSTOX_CLIENT_SECRET", "").strip(),
        "redirect_uri": os.environ.get("UPSTOX_REDIRECT_URI", "").strip()
    }

def get_apify_config():
    return {
        "token": os.environ.get("APIFY_TOKEN", "").strip(),
        "actor_id": os.environ.get("APIFY_SCREENER_ACTOR_ID", "").strip()
    }

def configured_redirect_uri():
    configured = get_upstox_config()["redirect_uri"]
    if configured:
        return configured
    return request.host_url.rstrip("/") + "/callback"

def save_auth_state(state):
    save_json_cache(AUTH_STATE_PATH, {"state": state, "createdAt": time.time()})

def is_valid_auth_state(state):
    payload = load_json_cache(AUTH_STATE_PATH)
    saved_state = payload.get("state")
    created_at = payload.get("createdAt", 0)
    if not saved_state or saved_state != state:
        return False
    return time.time() - created_at < 600

def token_profile():
    token = load_token()
    if not token:
        return {"connected": False}

    expired = is_expired(token)
    expires_at = None
    try:
        import base64
        payload = token["access_token"].split(".")[1]
        payload += "=" * (-len(payload) % 4)
        decoded = json.loads(base64.b64decode(payload))
        expires_at = decoded.get("exp")
    except Exception:
        expires_at = None

    return {
        "connected": bool(token.get("access_token")) and not expired,
        "expired": expired,
        "source": token.get("source", "file"),
        "userName": token.get("user_name"),
        "expiresAt": expires_at
    }

def admin_credentials():
    return {
        "username": os.environ.get("ADMIN_USERNAME", "shubham"),
        "password": os.environ.get("ADMIN_PASSWORD", "shreya@0304")
    }

def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get("admin_authenticated"):
            return view(*args, **kwargs)
        return redirect("/admin")
    return wrapped

def exchange_upstox_code(code):
    config = get_upstox_config()
    payload = {
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": configured_redirect_uri(),
        "grant_type": "authorization_code"
    }
    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    res = requests.post(UPSTOX_TOKEN_URL, data=payload, headers=headers, timeout=15)
    token_data = res.json()
    if res.status_code >= 400 or "access_token" not in token_data:
        message = token_data.get("message") or token_data.get("errors") or "Upstox did not return an access token."
        raise ValueError(str(message))

    save_token(token_data)
    return token_data

def render_admin_page(message="", error=False):
    creds = admin_credentials()
    is_logged_in = session.get("admin_authenticated")
    config = get_upstox_config()
    profile = token_profile()
    safe_message = escape(str(message))
    safe_redirect = escape(configured_redirect_uri())
    configured_text = "Configured" if config["client_id"] and config["client_secret"] else "Missing Upstox env vars"
    token_text = "Connected" if profile.get("connected") else ("Expired" if profile.get("expired") else "Not connected")
    message_class = "error" if error else "success"

    if not is_logged_in:
        return f"""<!doctype html>
<html lang="en">
<head>{admin_page_head("Admin Login")}</head>
<body>
    <main class="admin-shell">
        <section class="admin-card">
            <p class="eyebrow">Admin only</p>
            <h1>Dashboard Login</h1>
            <form method="post" action="/admin/login">
                <label>Username<input name="username" autocomplete="username" required></label>
                <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
                <button type="submit">Login</button>
            </form>
            {f'<p class="message {message_class}">{safe_message}</p>' if message else ''}
        </section>
    </main>
</body>
</html>"""

    return f"""<!doctype html>
<html lang="en">
<head>{admin_page_head("Token Admin")}</head>
<body>
    <main class="admin-shell">
        <section class="admin-card wide">
            <div class="admin-top">
                <div>
                    <p class="eyebrow">Admin only</p>
                    <h1>Upstox Token</h1>
                    <p class="muted">Use this page from your hosted VM when the daily token expires.</p>
                </div>
                <a class="link-button" href="/admin/logout">Logout</a>
            </div>

            {f'<p class="message {message_class}">{safe_message}</p>' if message else ''}

            <div class="status-grid">
                <div><span>Token</span><strong>{escape(token_text)}</strong></div>
                <div><span>Upstox config</span><strong>{escape(configured_text)}</strong></div>
                <div><span>Redirect URL</span><strong>{safe_redirect}</strong></div>
            </div>

            <div class="action-row">
                <a class="primary-button" href="/auth/login">Login with Upstox</a>
                <a class="link-button" href="/">Open dashboard</a>
            </div>

            <form method="post" action="/admin/token" class="manual-form">
                <h2>Manual auth code</h2>
                <p class="muted">Use this only if Upstox gives you a code and the automatic callback does not complete.</p>
                <label>Authorization code<input name="code" placeholder="Paste code from Upstox redirect" required></label>
                <button type="submit">Save Token</button>
            </form>
        </section>
    </main>
</body>
</html>"""

def admin_page_head(title):
    return f"""<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escape(title)}</title>
    <style>
        body {{ margin: 0; font-family: Arial, sans-serif; background: #f4f7fb; color: #0f172a; }}
        .admin-shell {{ min-height: 100vh; display: grid; place-items: center; padding: 24px; }}
        .admin-card {{ width: min(440px, 100%); border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 24px; box-shadow: 0 22px 70px rgba(15, 23, 42, 0.12); }}
        .admin-card.wide {{ width: min(780px, 100%); }}
        .admin-top {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }}
        .eyebrow {{ margin: 0 0 8px; color: #0284c7; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }}
        h1 {{ margin: 0 0 8px; font-size: 28px; }}
        h2 {{ margin: 22px 0 8px; font-size: 18px; }}
        .muted {{ margin: 0; color: #64748b; line-height: 1.45; }}
        form {{ display: grid; gap: 14px; margin-top: 18px; }}
        label {{ display: grid; gap: 7px; color: #334155; font-size: 13px; font-weight: 800; }}
        input {{ min-height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font: inherit; }}
        button, .primary-button, .link-button {{ min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; padding: 9px 13px; font-weight: 800; text-decoration: none; cursor: pointer; }}
        button, .primary-button {{ border: 0; background: #0f172a; color: white; }}
        .link-button {{ border: 1px solid #cbd5e1; background: #fff; color: #0f172a; }}
        .message {{ margin: 16px 0 0; padding: 11px; border-radius: 8px; font-size: 13px; }}
        .message.success {{ background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }}
        .message.error {{ background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }}
        .status-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }}
        .status-grid div {{ min-width: 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }}
        .status-grid span {{ display: block; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; }}
        .status-grid strong {{ display: block; margin-top: 5px; overflow-wrap: anywhere; font-size: 13px; }}
        .action-row {{ display: flex; flex-wrap: wrap; gap: 10px; }}
        @media (max-width: 640px) {{ .status-grid {{ grid-template-columns: 1fr; }} .admin-top {{ flex-direction: column; }} }}
    </style>"""

# =========================
# SECTOR GROUPS
# =========================
SECTOR_GROUPS = {
    "it": [
        "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "NAUKRI", "COFORGE", "MPHASIS",
        "PERSISTENT", "LTIM", "OFSS", "CYIENT", "KPITTECH", "SONATSOFTW", "ZENSARTECH",
        "BIRLASOFT", "TANLA", "ROUTE", "HAPPSTMNDS", "INTELLECT", "ECLERX", "NEWGEN",
        "DATAPATTNS", "INDIAMART", "JUSTDIAL"
    ],
    "bank": [
        "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK",
        "INDUSINDBK", "BANKBARODA", "PNB", "IDFCFIRSTB", "FEDERALBNK",
        "CANBK", "YESBANK", "BANDHANBNK", "AUBANK", "MAHABANK", "UCOBANK",
        "INDIANB", "CENTRALBK", "UNIONBANK", "IOB", "PSB", "SOUTHBANK",
        "RBLBANK", "CSBBANK", "DCBBANK", "KARURVYSYA", "CITYUNION", "J&KBANK",
        "EQUITASBNK", "UJJIVANSFB"
    ],
    "finance": [
        "BAJFINANCE", "BAJAJFINSV", "HDFCLIFE", "SBILIFE", "LICI", "PEL", "IRFC",
        "TATAINVEST", "BAJAJHLDNG", "LICHSGFIN", "PFC", "RECLTD", "HUDCO", "IREDA",
        "MUTHOOTFIN", "MANAPPURAM", "CHOLAFIN", "SHRIRAMFIN", "LTF", "ICICIPRULI",
        "ICICIGI", "SBICARD", "ABCAPITAL", "ANGELONE", "CAMS", "CDSL", "BSE",
        "MCX", "IEX", "KFINTECH", "POLICYBZR"
    ],
    "auto": [
        "MARUTI", "EICHERMOT", "HEROMOTOCO", "TATAMOTORS", "M&M", "ASHOKLEY",
        "TVSMOTOR", "BAJAJ-AUTO", "BOSCHLTD", "ESCORTS", "ESCORTSKUBOTA",
        "VSTTILLERS", "SKFINDIA", "SCHAEFFLER", "TIMKEN", "NRBBEARING",
        "EXIDEIND", "AMARAJABAT", "HBLENGINE", "APOLLOTYRE", "MRF", "CEATLTD",
        "JKTYRE", "BALKRISIND", "MOTHERSON", "SONACOMS", "UNOMINDA", "ENDURANCE"
    ],
    "pharma": [
        "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "TORNTPHARM", "LUPIN",
        "AUROPHARMA", "BIOCON", "ALKEM", "APOLLOHOSP", "MAXHEALTH", "FORTIS",
        "RAINBOW", "KIMS", "ASTERDM", "NARAYANA", "METROPOLIS", "LALPATHLAB",
        "THYROCARE", "ERIS", "GLENMARK", "ZYDUSLIFE", "IPCALAB", "LAURUSLABS",
        "GRANULES", "AJANTPHARM", "NATCOPHARM", "STRIDES", "WOCKPHARMA",
        "PFIZER", "GLAXO", "SANOFI", "ABBOTINDIA", "CAPLIPOINT", "SUVENPHAR",
        "ASTRAZEN"
    ],
    "fmcg": ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA", "DABUR", "COLPAL", "GODREJCP", "MCDOWELL-N", "TATACONSUM"],
    "metal": ["JSWSTEEL", "TATASTEEL", "VEDL", "HINDALCO", "JINDALSTEL", "NMDC", "SAIL"],
    "energy": [
        "RELIANCE", "ONGC", "BPCL", "IOC", "GAIL", "NTPC", "POWERGRID",
        "COALINDIA", "ADANIGREEN", "NHPC", "ADANIPOWER", "ATGL", "IGL",
        "MGL", "PETRONET", "GUJGASLTD", "SJVN", "OIL", "TATAPOWER", "JSWENERGY",
        "TORNTPOWER", "CESC"
    ],
    "cement": ["ULTRACEMCO", "SHREECEM", "AMBUJACEM", "ACC", "GRASIM"],
    "consumer": ["ASIANPAINT", "TITAN", "PIDILITIND", "HAVELLS", "PAGEIND", "BERGEPAINT", "DMART", "ZOMATO", "PAYTM", "IRCTC"],
    "infra": [
        "LT", "ADANIPORTS", "ADANIENT", "ADANITRANS", "SIEMENS", "ABB", "RVNL",
        "IRB", "PNCINFRA", "HGINFRA", "KNRCON", "ASHOKA", "NBCC", "ENGINEERSIN",
        "IRCON", "RITES", "CONCOR", "BLUEDART", "TCIEXP", "ALLCARGO", "MAHLOG",
        "VRLLOG", "INDIGO", "SPICEJET", "GMRINFRA", "JSWINFRA", "TITAGARH", "JWL",
        "TEXRAIL", "BEML", "BEL", "HAL", "BDL", "COCHINSHIP", "GRSE", "MAZDOCK",
        "MIDHANI"
    ]
}

INDEX_GROUPS = {
    "nifty50": NIFTY50,
    "banknifty": [
        "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSINDBK",
        "BANKBARODA", "PNB", "IDFCFIRSTB", "FEDERALBNK", "AUBANK", "BANDHANBNK"
    ],
    "finnifty": [
        "HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK", "SBIN", "BAJFINANCE",
        "BAJAJFINSV", "HDFCLIFE", "SBILIFE", "ICICIPRULI", "ICICIGI", "CHOLAFIN",
        "SHRIRAMFIN", "MUTHOOTFIN", "PFC", "RECLTD", "LICHSGFIN", "SBICARD",
        "ABCAPITAL", "LICI"
    ],
    "sensex": [
        "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "LT", "SBIN",
        "BHARTIARTL", "AXISBANK", "KOTAKBANK", "HINDUNILVR", "ASIANPAINT",
        "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO", "NESTLEIND", "BAJFINANCE",
        "HCLTECH", "POWERGRID", "NTPC", "TATASTEEL", "TECHM", "JSWSTEEL",
        "M&M", "TATAMOTORS", "BAJAJFINSV", "ADANIPORTS", "INDUSINDBK"
    ],
    "midcpnifty": [
        "COFORGE", "MPHASIS", "PERSISTENT", "LTIM", "OFSS", "AUBANK", "FEDERALBNK",
        "IDFCFIRSTB", "BANDHANBNK", "PNB", "BANKBARODA", "CANBK", "LICI", "IRFC",
        "PFC", "RECLTD", "HUDCO", "MUTHOOTFIN", "CHOLAFIN", "SHRIRAMFIN",
        "AUROPHARMA", "LUPIN", "ALKEM", "BIOCON", "TORNTPHARM", "TVSMOTOR",
        "ASHOKLEY", "BOSCHLTD", "INDIGO", "CONCOR", "ABB", "SIEMENS",
        "HAVELLS", "PIDILITIND", "DABUR", "COLPAL", "GODREJCP", "PAGEIND",
        "BERGEPAINT", "DMART", "ZOMATO"
    ]
}

STOCK_NAMES = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy",
    "HDFCBANK": "HDFC Bank",
    "ICICIBANK": "ICICI Bank",
    "INFY": "Infosys",
    "ITC": "ITC",
    "LT": "Larsen & Toubro",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "AXISBANK": "Axis Bank",
    "HINDUNILVR": "Hindustan Unilever",
    "ASIANPAINT": "Asian Paints",
    "MARUTI": "Maruti Suzuki",
    "SUNPHARMA": "Sun Pharma",
    "TITAN": "Titan Company",
    "ULTRACEMCO": "UltraTech Cement",
    "NESTLEIND": "Nestle India",
    "WIPRO": "Wipro",
    "BAJFINANCE": "Bajaj Finance",
    "HCLTECH": "HCLTech",
    "POWERGRID": "Power Grid",
    "NTPC": "NTPC",
    "ONGC": "ONGC",
    "TECHM": "Tech Mahindra",
    "JSWSTEEL": "JSW Steel",
    "TATASTEEL": "Tata Steel",
    "ADANIPORTS": "Adani Ports",
    "COALINDIA": "Coal India",
    "GRASIM": "Grasim Industries",
    "INDUSINDBK": "IndusInd Bank",
    "DRREDDY": "Dr. Reddy's Labs",
    "CIPLA": "Cipla",
    "BRITANNIA": "Britannia",
    "EICHERMOT": "Eicher Motors",
    "HEROMOTOCO": "Hero MotoCorp",
    "APOLLOHOSP": "Apollo Hospitals",
    "BAJAJFINSV": "Bajaj Finserv",
    "DIVISLAB": "Divi's Labs",
    "SBILIFE": "SBI Life",
    "HDFCLIFE": "HDFC Life",
    "ADANIENT": "Adani Enterprises",
    "UPL": "UPL",
    "BPCL": "BPCL",
    "IOC": "Indian Oil",
    "GAIL": "GAIL",
    "SHREECEM": "Shree Cement",
    "VEDL": "Vedanta",
    "DABUR": "Dabur India",
    "PIDILITIND": "Pidilite Industries",
    "HAVELLS": "Havells India",
    "SIEMENS": "Siemens",
    "ABB": "ABB India",
    "BOSCHLTD": "Bosch",
    "COLPAL": "Colgate-Palmolive",
    "GODREJCP": "Godrej Consumer",
    "MCDOWELL-N": "United Spirits",
    "PAGEIND": "Page Industries",
    "BERGEPAINT": "Berger Paints",
    "TORNTPHARM": "Torrent Pharma",
    "LUPIN": "Lupin",
    "AUROPHARMA": "Aurobindo Pharma",
    "BIOCON": "Biocon",
    "ALKEM": "Alkem Labs",
    "NAUKRI": "Info Edge",
    "ZOMATO": "Zomato",
    "PAYTM": "One 97 Communications",
    "IRCTC": "IRCTC",
    "DMART": "Avenue Supermarts",
    "TATACONSUM": "Tata Consumer",
    "AMBUJACEM": "Ambuja Cements",
    "ACC": "ACC",
    "ADANIGREEN": "Adani Green Energy",
    "ADANITRANS": "Adani Transmission",
    "PEL": "Piramal Enterprises",
    "PNB": "Punjab National Bank",
    "BANKBARODA": "Bank of Baroda",
    "CANBK": "Canara Bank",
    "IDFCFIRSTB": "IDFC First Bank",
    "FEDERALBNK": "Federal Bank",
    "YESBANK": "Yes Bank",
    "BANDHANBNK": "Bandhan Bank",
    "LICI": "LIC India",
    "IRFC": "Indian Railway Finance",
    "RVNL": "Rail Vikas Nigam",
    "NHPC": "NHPC",
    "SAIL": "SAIL",
    "HINDALCO": "Hindalco",
    "JINDALSTEL": "Jindal Steel",
    "NMDC": "NMDC",
    "TATAMOTORS": "Tata Motors",
    "M&M": "Mahindra & Mahindra",
    "ASHOKLEY": "Ashok Leyland",
    "TVSMOTOR": "TVS Motor",
    "BAJAJ-AUTO": "Bajaj Auto"
}

FINANCIAL_MODULES = {
    "profitLoss": ("incomeStatementHistory", "incomeStatementHistory"),
    "balanceSheet": ("balanceSheetHistory", "balanceSheetStatements"),
    "cashFlow": ("cashflowStatementHistory", "cashflowStatements")
}

FINANCIAL_LABELS = {
    "totalRevenue": "Total revenue",
    "costOfRevenue": "Cost of revenue",
    "grossProfit": "Gross profit",
    "operatingIncome": "Operating income",
    "netIncome": "Net income",
    "ebit": "EBIT",
    "incomeBeforeTax": "Income before tax",
    "incomeTaxExpense": "Income tax expense",
    "totalAssets": "Total assets",
    "totalLiab": "Total liabilities",
    "totalStockholderEquity": "Shareholder equity",
    "cash": "Cash",
    "shortTermInvestments": "Short-term investments",
    "netReceivables": "Receivables",
    "inventory": "Inventory",
    "totalCurrentAssets": "Current assets",
    "longTermDebt": "Long-term debt",
    "totalCurrentLiabilities": "Current liabilities",
    "totalCashFromOperatingActivities": "Cash from operations",
    "totalCashflowsFromInvestingActivities": "Cash from investing",
    "totalCashFromFinancingActivities": "Cash from financing",
    "capitalExpenditures": "Capital expenditure",
    "changeInCash": "Change in cash",
    "freeCashFlow": "Free cash flow",
    "TotalRevenue": "Total revenue",
    "CostOfRevenue": "Cost of revenue",
    "GrossProfit": "Gross profit",
    "OperatingIncome": "Operating income",
    "EBIT": "EBIT",
    "PretaxIncome": "Profit before tax",
    "TaxProvision": "Tax expense",
    "NetIncome": "Net income",
    "CashAndCashEquivalents": "Cash and equivalents",
    "AccountsReceivable": "Receivables",
    "CurrentAssets": "Current assets",
    "TotalAssets": "Total assets",
    "CurrentLiabilities": "Current liabilities",
    "LongTermDebt": "Long-term debt",
    "TotalDebt": "Total debt",
    "TotalLiabilitiesNetMinorityInterest": "Total liabilities",
    "StockholdersEquity": "Shareholders equity",
    "OperatingCashFlow": "Cash from operations",
    "InvestingCashFlow": "Cash from investing",
    "FinancingCashFlow": "Cash from financing",
    "CapitalExpenditure": "Capital expenditure",
    "FreeCashFlow": "Free cash flow",
    "EndCashPosition": "Ending cash position"
}

FINANCIAL_FIELD_ORDER = {
    "profitLoss": [
        "TotalRevenue", "CostOfRevenue", "GrossProfit", "OperatingIncome",
        "EBIT", "PretaxIncome", "TaxProvision", "NetIncome"
    ],
    "balanceSheet": [
        "CashAndCashEquivalents", "AccountsReceivable", "Inventory",
        "CurrentAssets", "TotalAssets", "CurrentLiabilities",
        "LongTermDebt", "TotalDebt", "TotalLiabilitiesNetMinorityInterest",
        "StockholdersEquity"
    ],
    "cashFlow": [
        "OperatingCashFlow", "InvestingCashFlow", "FinancingCashFlow",
        "CapitalExpenditure", "FreeCashFlow", "EndCashPosition"
    ]
}

FINANCIAL_TIMESERIES_FIELDS = {
    statement_type: [f"annual{field}" for field in fields]
    for statement_type, fields in FINANCIAL_FIELD_ORDER.items()
}

NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/companies-listing/corporate-filings-annual-reports"
}

# =========================
# STOCK API
# =========================
@app.route("/stocks")
def get_stocks():

    access_token = get_access_token()
    if not access_token:
        return jsonify({"error": "TOKEN_EXPIRED"})

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    instrument_map = load_instrument_map()
    instrument_keys = list(instrument_map.values())
    card_metrics = load_card_metrics()

    url = "https://api.upstox.com/v2/market-quote/quotes"
    params = {"instrument_key": ",".join(instrument_keys)}

    res = requests.get(url, headers=headers, params=params)

    if res.status_code != 200:
        return jsonify({"all": [], "gainers": [], "losers": []})

    data = res.json().get("data", {})

    stocks_data = []

    for key, val in data.items():
        symbol = val["symbol"]
        ltp = val.get("last_price", 0)
        change = val.get("net_change", 0)
        ohlc = val.get("ohlc", {}) or {}
        metrics = card_metrics.get(symbol, {})

        previous_close = ltp - change
        day_open = ohlc.get("open", previous_close)
        close_value = ohlc.get("close", ltp)
        high_value = ohlc.get("high", ltp)
        low_value = ohlc.get("low", ltp)
        percent = (change / previous_close) * 100 if previous_close != 0 else 0

        stocks_data.append({
            "symbol": symbol + ".NS",
            "name": STOCK_NAMES.get(symbol, symbol),
            "price": round(ltp, 2),
            "open": round(day_open, 2),
            "close": round(close_value, 2),
            "previousClose": round(previous_close, 2),
            "high": round(high_value, 2),
            "low": round(low_value, 2),
            "change": round(percent, 2),
            "netChange": round(change, 2),
            "pe": metrics.get("pe"),
            "roe": metrics.get("roe"),
            "marketCap": metrics.get("marketCap")
        })

    # =========================
    # FILTER + SORT
    # =========================
    positive = [s for s in stocks_data if s["change"] > 0]
    negative = [s for s in stocks_data if s["change"] < 0]

    gainers = sorted(positive, key=lambda x: x["change"], reverse=True)[:10]
    losers = sorted(negative, key=lambda x: x["change"])[:10]
    movers = sort_by_abs_change_desc(gainers + losers)

    sector_stocks = {sector: [] for sector in SECTOR_GROUPS}
    grouped_symbols = set()

    for s in stocks_data:
        sym = s["symbol"].replace(".NS", "")

        for sector, symbols in SECTOR_GROUPS.items():
            if sym in symbols:
                sector_stocks[sector].append(s)
                grouped_symbols.add(sym)

    others = [s for s in stocks_data if s["symbol"].replace(".NS", "") not in grouped_symbols]
    sector_stocks = {
        sector: sort_by_change_desc(stocks)
        for sector, stocks in sector_stocks.items()
    }
    index_stocks = {
        index: sort_by_change_desc([
            s for s in stocks_data
            if s["symbol"].replace(".NS", "") in set(symbols)
        ])
        for index, symbols in INDEX_GROUPS.items()
    }

    return jsonify({
        "movers": movers,
        "all": sort_by_change_desc(stocks_data),
        "gainers": gainers,
        "losers": losers,
        **sector_stocks,
        **index_stocks,
        "others": sort_by_change_desc(others)
    })

def yahoo_raw_value(value):
    if isinstance(value, dict):
        return value.get("raw", value.get("fmt"))
    return value

def readable_financial_label(field):
    plain_field = field.replace("annual", "", 1)
    if plain_field in FINANCIAL_LABELS:
        return FINANCIAL_LABELS[plain_field]
    spaced = re.sub(r"(?<!^)([A-Z])", r" \1", plain_field)
    return spaced.replace(" E B I T", " EBIT").title()

def yahoo_statement_date(statement):
    end_date = yahoo_raw_value(statement.get("endDate"))
    if not end_date:
        return "Period"
    try:
        from datetime import datetime
        return datetime.utcfromtimestamp(int(end_date)).strftime("%Y")
    except (TypeError, ValueError, OSError):
        return str(end_date)

def normalize_statement_rows(statement_type, statements):
    if not statements:
        return {"periods": [], "rows": []}

    periods = [yahoo_statement_date(statement) for statement in statements]
    fields = list(FINANCIAL_FIELD_ORDER.get(statement_type, []))
    seen = set(fields)

    for statement in statements:
        for key in statement.keys():
            if key not in seen and key not in {"endDate", "maxAge"}:
                fields.append(key)
                seen.add(key)

    rows = []
    for field in fields:
        values = [yahoo_raw_value(statement.get(field)) for statement in statements]
        if any(value is not None for value in values):
            rows.append({
                "key": field,
                "label": FINANCIAL_LABELS.get(field, re.sub(r"(?<!^)([A-Z])", r" \1", field).title()),
                "values": values
            })

    return {"periods": periods, "rows": rows}

def get_yahoo_session():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    })
    session.get("https://fc.yahoo.com", timeout=10)
    crumb = session.get("https://query1.finance.yahoo.com/v1/test/getcrumb", timeout=10).text.strip()
    return session, crumb

def extract_statement(result, module_name, statement_key):
    module = result.get(module_name, {}) or {}
    return module.get(statement_key, []) or []

def normalize_timeseries_rows(timeseries_result):
    rows_by_field = {}
    periods = set()

    for item in timeseries_result:
        for field in item.get("meta", {}).get("type", []):
            points = item.get(field, []) or []
            values_by_period = {}

            for point in points:
                period = point.get("asOfDate", "")[:4]
                value = yahoo_raw_value(point.get("reportedValue"))
                if period and value is not None:
                    periods.add(period)
                    values_by_period[period] = value

            rows_by_field[field] = values_by_period

    sorted_periods = sorted(periods, reverse=True)
    statements = {}

    for statement_type, fields in FINANCIAL_TIMESERIES_FIELDS.items():
        rows = []
        for field in fields:
            values_by_period = rows_by_field.get(field, {})
            values = [values_by_period.get(period) for period in sorted_periods]
            if any(value is not None for value in values):
                rows.append({
                    "key": field,
                    "label": readable_financial_label(field),
                    "values": values
                })

        statements[statement_type] = {
            "periods": sorted_periods,
            "rows": rows
        }

    return statements

def get_yahoo_timeseries(session, crumb, symbol):
    symbol = to_nse_symbol(symbol)
    fields = [
        field
        for statement_fields in FINANCIAL_TIMESERIES_FIELDS.values()
        for field in statement_fields
    ]
    url = f"https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}"
    params = {
        "symbol": symbol,
        "type": ",".join(fields),
        "period1": 0,
        "period2": int(time.time()),
        "crumb": crumb
    }
    res = session.get(url, params=params, timeout=12)
    res.raise_for_status()
    return res.json().get("timeseries", {}).get("result", []) or []

def get_yahoo_quote_summary(session, symbol):
    symbol = to_nse_symbol(symbol)
    modules = "price,summaryDetail,defaultKeyStatistics,financialData"
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    res = session.get(url, params={"modules": modules}, timeout=12)
    res.raise_for_status()
    result = res.json().get("quoteSummary", {}).get("result", []) or []
    return result[0] if result else {}

def is_yahoo_india_inr_summary(summary):
    price = summary.get("price", {}) or {}
    currencies = {
        str(yahoo_raw_value(price.get("currency")) or "").upper(),
        str(yahoo_raw_value(price.get("financialCurrency")) or "").upper()
    }
    exchange = str(yahoo_raw_value(price.get("exchangeName")) or "").upper()
    quote_source = str(yahoo_raw_value(price.get("quoteSourceName")) or "").upper()
    symbol = str(yahoo_raw_value(price.get("symbol")) or "").upper()

    return (
        "INR" in currencies
        and symbol.endswith(".NS")
        and (
            exchange in {"NSI", "NSE"}
            or "NSE" in exchange
            or "NATIONAL STOCK EXCHANGE" in quote_source
        )
    )

def validated_yahoo_quote_summary(session, symbol):
    summary = get_yahoo_quote_summary(session, symbol)
    if not is_yahoo_india_inr_summary(summary):
        raise ValueError("Yahoo response was not NSE/INR data.")
    return summary

def compact_yahoo_value(value):
    raw = yahoo_raw_value(value)
    if raw in ("", None):
        return None
    return raw

def build_valuation_payload(summary, symbol):
    price = summary.get("price", {}) or {}
    detail = summary.get("summaryDetail", {}) or {}
    stats = summary.get("defaultKeyStatistics", {}) or {}
    financial = summary.get("financialData", {}) or {}

    return {
        "marketCap": compact_yahoo_value(price.get("marketCap") or detail.get("marketCap")),
        "peTrailing": compact_yahoo_value(stats.get("trailingPE") or detail.get("trailingPE")),
        "peForward": compact_yahoo_value(stats.get("forwardPE") or financial.get("forwardPE")),
        "epsTrailing": compact_yahoo_value(stats.get("trailingEps")),
        "bookValue": compact_yahoo_value(stats.get("bookValue")),
        "priceToBook": compact_yahoo_value(stats.get("priceToBook")),
        "dividendYield": compact_yahoo_value(detail.get("dividendYield")),
        "roe": compact_yahoo_value(financial.get("returnOnEquity")),
        "roce": None,
        "faceValue": None,
        "fiftyTwoWeekLow": compact_yahoo_value(detail.get("fiftyTwoWeekLow")),
        "fiftyTwoWeekHigh": compact_yahoo_value(detail.get("fiftyTwoWeekHigh")),
        "source": {
            "provider": "Yahoo Finance quote summary",
            "label": "Valuation and market statistics",
            "url": f"https://finance.yahoo.com/quote/{symbol}"
        }
    }

def safe_valuation_payload(session, symbol):
    try:
        quote_summary = validated_yahoo_quote_summary(session, symbol)
        return build_valuation_payload(quote_summary, symbol)
    except (requests.RequestException, ValueError):
        return {
            "source": {
                "provider": "Yahoo Finance quote summary",
                "label": "Valuation and market statistics",
                "url": f"https://finance.yahoo.com/quote/{symbol}"
            }
        }

def get_nse_session():
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    session.get("https://www.nseindia.com", timeout=10)
    return session

def get_nse_quote_summary(symbol):
    base_symbol = to_nse_base_symbol(symbol)
    session = get_nse_session()
    res = session.get(
        "https://www.nseindia.com/api/quote-equity",
        params={"symbol": base_symbol},
        timeout=12
    )
    res.raise_for_status()
    return res.json()

def find_first_number(payload, keys):
    if isinstance(payload, dict):
        for key, value in payload.items():
            normalized_key = str(key).lower().replace("_", "").replace(" ", "")
            if normalized_key in keys:
                parsed = normalize_statement_value(value)
                if isinstance(parsed, (int, float)):
                    return parsed
            found = find_first_number(value, keys)
            if found is not None:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = find_first_number(item, keys)
            if found is not None:
                return found
    return None

def build_nse_valuation_payload(summary, symbol):
    base_symbol = to_nse_base_symbol(symbol)
    return {
        "marketCap": find_first_number(summary, {"marketcap", "ffmc", "mcap", "marketcapitalisation"}),
        "peTrailing": find_first_number(summary, {"symbolpe", "pdsymbolpe", "pe", "peratio"}),
        "peForward": None,
        "epsTrailing": find_first_number(summary, {"eps", "trailingepe", "trailingepeps", "trailingePS".lower()}),
        "bookValue": None,
        "priceToBook": find_first_number(summary, {"pb", "pbratio", "pricebookvalue"}),
        "dividendYield": find_first_number(summary, {"dividendyield", "dy"}),
        "roe": None,
        "roce": None,
        "faceValue": find_first_number(summary, {"facevalue", "fv"}),
        "fiftyTwoWeekLow": find_first_number(summary, {"weeklow", "low52", "fiftytwoweeklow"}),
        "fiftyTwoWeekHigh": find_first_number(summary, {"weekhigh", "high52", "fiftytwoweekhigh"}),
        "source": {
            "provider": "NSE quote equity",
            "label": "NSE market and valuation statistics",
            "url": f"https://www.nseindia.com/get-quotes/equity?symbol={base_symbol}"
        }
    }

def safe_nse_valuation_payload(symbol):
    try:
        return build_nse_valuation_payload(get_nse_quote_summary(symbol), symbol)
    except requests.RequestException:
        base_symbol = to_nse_base_symbol(symbol)
        return {
            "marketCap": None,
            "peTrailing": None,
            "peForward": None,
            "epsTrailing": None,
            "bookValue": None,
            "priceToBook": None,
            "dividendYield": None,
            "roe": None,
            "roce": None,
            "faceValue": None,
            "fiftyTwoWeekLow": None,
            "fiftyTwoWeekHigh": None,
            "source": {
                "provider": "NSE quote equity",
                "label": "NSE market and valuation statistics",
                "url": f"https://www.nseindia.com/get-quotes/equity?symbol={base_symbol}"
            }
        }

def get_nse_annual_report_source(symbol):
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    session.get("https://www.nseindia.com/companies-listing/corporate-filings-annual-reports", timeout=10)
    res = session.get(
        "https://www.nseindia.com/api/annual-reports",
        params={"index": "equities", "symbol": symbol},
        timeout=12
    )
    res.raise_for_status()
    reports = res.json().get("data", []) or []
    if not reports:
        return None

    latest = reports[0]
    report_url = latest.get("fileName") or latest.get("attchmntFile")
    year = latest.get("year") or latest.get("financialYear")
    if not year and report_url:
        year_match = re.search(r"(20\d{2})[_-](20\d{2})", report_url)
        if year_match:
            year = f"{year_match.group(1)}-{year_match.group(2)}"

    return {
        "provider": "NSE annual report",
        "label": latest.get("reportName") or "Latest annual report",
        "year": year,
        "url": report_url,
        "allReportsUrl": (
            "https://www.nseindia.com/companies-listing/corporate-filings-annual-reports"
            f"?symbol={symbol}&tabIndex=equity"
        )
    }

def cache_get(cache_path, key, ttl):
    cache = load_json_cache(cache_path)
    cached = cache.get(key)
    if not isinstance(cached, dict):
        return None
    if time.time() - cached.get("cachedAt", 0) > ttl:
        return None
    return cached.get("payload")

def cache_set(cache_path, key, payload):
    cache = load_json_cache(cache_path)
    cache[key] = {"cachedAt": time.time(), "payload": payload}
    save_json_cache(cache_path, cache)

def get_case_value(payload, names):
    if not isinstance(payload, dict):
        return None

    lowered = {str(key).lower().replace("_", "").replace(" ", ""): key for key in payload.keys()}
    for name in names:
        normalized = name.lower().replace("_", "").replace(" ", "")
        key = lowered.get(normalized)
        if key is not None:
            return payload.get(key)

    return None

def normalize_period_label(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    year_match = re.search(r"(20\d{2}|19\d{2})", text)
    if year_match:
        return year_match.group(1)
    return text

def normalize_statement_value(value):
    if isinstance(value, dict):
        for key in ("value", "raw", "amount", "reportedValue"):
            if key in value:
                return normalize_statement_value(value.get(key))
        return None
    if value in ("", "-", "--", None):
        return None
    if isinstance(value, str):
        cleaned = value.replace(",", "").replace("Cr.", "").replace("Cr", "").replace("%", "").strip()
        if cleaned.startswith("(") and cleaned.endswith(")"):
            cleaned = f"-{cleaned[1:-1]}"
        try:
            return float(cleaned)
        except ValueError:
            return value
    return value

def normalize_rows_from_dict(statement):
    periods = statement.get("periods") or statement.get("years") or statement.get("columns") or []
    rows = statement.get("rows") or statement.get("data") or statement.get("items") or []

    if rows and isinstance(rows, list):
        normalized_periods = [normalize_period_label(period) for period in periods]
        normalized_rows = []
        for index, row in enumerate(rows):
            if isinstance(row, dict):
                label = row.get("label") or row.get("name") or row.get("metric") or row.get("particular") or row.get("particulars")
                values = row.get("values")
                if values is None:
                    values = [
                        row.get(period)
                        for period in periods
                        if period in row
                    ]
                if label and isinstance(values, list):
                    normalized_rows.append({
                        "key": re.sub(r"\W+", "", str(label)) or f"row{index}",
                        "label": str(label),
                        "values": [normalize_statement_value(value) for value in values]
                    })
        return {"periods": [period for period in normalized_periods if period], "rows": normalized_rows}

    period_keys = [key for key in statement.keys() if normalize_period_label(key)]
    metric_keys = [key for key in statement.keys() if key not in period_keys]
    if period_keys and metric_keys:
        return {
            "periods": [normalize_period_label(period) for period in period_keys],
            "rows": [
                {
                    "key": re.sub(r"\W+", "", str(metric)),
                    "label": str(metric),
                    "values": [normalize_statement_value(statement.get(period, {}).get(metric)) for period in period_keys]
                }
                for metric in metric_keys
                if isinstance(statement.get(period_keys[0]), dict)
            ]
        }

    return {"periods": [], "rows": []}

def normalize_rows_from_list(statement):
    if not statement:
        return {"periods": [], "rows": []}

    if all(isinstance(item, dict) for item in statement):
        period_keys = []
        for item in statement:
            period = normalize_period_label(item.get("year") or item.get("period") or item.get("date"))
            if period:
                period_keys.append(period)

        if period_keys:
            metric_names = []
            ignored = {"year", "period", "date"}
            for item in statement:
                for key in item.keys():
                    if str(key).lower() not in ignored and key not in metric_names:
                        metric_names.append(key)

            return {
                "periods": period_keys,
                "rows": [
                    {
                        "key": re.sub(r"\W+", "", str(metric)),
                        "label": readable_financial_label(str(metric)),
                        "values": [normalize_statement_value(item.get(metric)) for item in statement]
                    }
                    for metric in metric_names
                ]
            }

    return {"periods": [], "rows": []}

def normalize_apify_statement(statement):
    if isinstance(statement, dict):
        normalized = normalize_rows_from_dict(statement)
    elif isinstance(statement, list):
        normalized = normalize_rows_from_list(statement)
    else:
        normalized = {"periods": [], "rows": []}

    row_length = len(normalized["periods"])
    if row_length:
        normalized["rows"] = [
            row for row in normalized["rows"]
            if any(value is not None for value in row.get("values", [])[:row_length])
        ]
    return normalized

def normalize_apify_financials(item, symbol):
    if not isinstance(item, dict):
        return None

    statements = {
        "profitLoss": normalize_apify_statement(get_case_value(item, ["profitLoss", "profit_loss", "pnl", "incomeStatement", "income_statement"])),
        "balanceSheet": normalize_apify_statement(get_case_value(item, ["balanceSheet", "balance_sheet", "balancesheet"])),
        "cashFlow": normalize_apify_statement(get_case_value(item, ["cashFlow", "cash_flow", "cashflow"]))
    }

    if not any(statement["rows"] for statement in statements.values()):
        return None

    source_url = (
        item.get("url")
        or item.get("sourceUrl")
        or f"https://www.screener.in/company/{symbol.replace('.NS', '')}/consolidated/"
    )
    return {
        "symbol": symbol,
        "name": item.get("name") or item.get("companyName") or STOCK_NAMES.get(symbol.replace(".NS", ""), symbol),
        "currency": "INR Cr",
        "source": {
            "provider": "Apify Screener actor",
            "label": "Screener financial statements",
            "url": source_url
        },
        "sourceNote": "Numbers are fetched as INR crore figures through the configured Apify Screener actor. NSE annual report is linked as the official filing reference where available. Verify figures with NSE/company filings before making decisions.",
        "statements": statements
    }

def fetch_apify_financials(symbol):
    config = get_apify_config()
    if not config["token"] or not config["actor_id"]:
        return None

    cached = cache_get(FINANCIALS_CACHE_PATH, f"{FINANCIALS_CACHE_VERSION}:apify:{symbol}", FINANCIALS_CACHE_TTL)
    if cached:
        return cached

    base_symbol = to_nse_base_symbol(symbol)
    screener_url = f"https://www.screener.in/company/{base_symbol}/consolidated/"
    actor_id = config["actor_id"].replace("/", "~")
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    payload = {
        "symbol": base_symbol,
        "symbols": [base_symbol],
        "url": screener_url,
        "urls": [screener_url],
        "startUrls": [{"url": screener_url}]
    }
    params = {
        "token": config["token"],
        "timeout": APIFY_RUN_TIMEOUT,
        "memory": 1024
    }

    res = requests.post(url, params=params, json=payload, timeout=APIFY_RUN_TIMEOUT + 15)
    res.raise_for_status()
    items = res.json()
    if isinstance(items, dict):
        items = [items]

    for item in items or []:
        normalized = normalize_apify_financials(item, symbol)
        if normalized:
            cache_set(FINANCIALS_CACHE_PATH, f"{FINANCIALS_CACHE_VERSION}:apify:{symbol}", normalized)
            return normalized

    return None

def parse_screener_number(value):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = text.replace(",", "").replace("%", "").replace("+", "").strip()
    if not text or text in {"-", "--"}:
        return None
    if text.startswith("(") and text.endswith(")"):
        text = f"-{text[1:-1]}"
    try:
        return float(text)
    except ValueError:
        return text

def parse_screener_table(section):
    table = section.find("table") if section else None
    if table is None:
        return {"periods": [], "rows": []}

    header_cells = table.select("thead th")
    if not header_cells:
        first_row = table.find("tr")
        header_cells = first_row.find_all(["th", "td"]) if first_row else []

    periods = [
        normalize_period_label(cell.get_text(" ", strip=True))
        for cell in header_cells[1:]
    ]
    periods = [period for period in periods if period]

    rows = []
    for row_index, row in enumerate(table.select("tbody tr")):
        cells = row.find_all(["th", "td"])
        if len(cells) < 2:
            continue

        label = re.sub(r"\s+", " ", cells[0].get_text(" ", strip=True)).replace("+", "").strip()
        values = [parse_screener_number(cell.get_text(" ", strip=True)) for cell in cells[1:1 + len(periods)]]
        if label and any(value is not None for value in values):
            rows.append({
                "key": re.sub(r"\W+", "", label) or f"row{row_index}",
                "label": label,
                "values": values
            })

    return {"periods": periods, "rows": rows}

def normalize_info_label(label):
    return re.sub(r"[^a-z0-9]+", "", str(label or "").lower())

def parse_screener_top_ratios(soup):
    ratios = {}
    key_map = {
        "marketcap": "marketCap",
        "currentprice": "currentPrice",
        "highlow": "highLow",
        "stockpe": "stockPe",
        "bookvalue": "bookValue",
        "dividendyield": "dividendYield",
        "roce": "roce",
        "roe": "roe",
        "facevalue": "faceValue"
    }

    for item in soup.select("#top-ratios li"):
        spans = item.find_all("span")
        if len(spans) < 2:
            continue

        label = spans[0].get_text(" ", strip=True)
        value_parts = [
            span.get_text(" ", strip=True)
            for span in spans[1:]
            if span.get_text(" ", strip=True)
        ]
        if len(value_parts) % 2 == 0:
            mid = len(value_parts) // 2
            if value_parts[:mid] == value_parts[mid:]:
                value_parts = value_parts[:mid]

        value = " ".join(value_parts)
        key = key_map.get(normalize_info_label(label))
        if key and value:
            ratios[key] = re.sub(r"\s+", " ", value).strip()

    return ratios

def fetch_screener_financials(symbol):
    cached = cache_get(FINANCIALS_CACHE_PATH, f"{FINANCIALS_CACHE_VERSION}:screener:{symbol}", FINANCIALS_CACHE_TTL)
    if cached:
        return cached

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return None

    base_symbol = to_nse_base_symbol(symbol)
    urls = [
        f"https://www.screener.in/company/{base_symbol}/consolidated/",
        f"https://www.screener.in/company/{base_symbol}/"
    ]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    for url in urls:
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code == 404:
            continue
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        statements = {
            "profitLoss": parse_screener_table(soup.find(id="profit-loss")),
            "balanceSheet": parse_screener_table(soup.find(id="balance-sheet")),
            "cashFlow": parse_screener_table(soup.find(id="cash-flow"))
        }

        if any(statement["rows"] for statement in statements.values()):
            name_tag = soup.select_one("h1")
            info = parse_screener_top_ratios(soup)
            payload = {
                "symbol": symbol,
                "name": name_tag.get_text(" ", strip=True) if name_tag else STOCK_NAMES.get(base_symbol, symbol),
                "currency": "INR Cr",
                "source": {
                    "provider": "Screener.in",
                    "label": "Profit & Loss, Balance Sheet and Cash Flow",
                    "url": url
                },
                "sourceNote": "P&L, Balance Sheet and Cash Flow are fetched as INR crore figures from Screener.in company pages, with NSE annual report linked as the official filing reference where available. Verify figures with NSE/company filings before making decisions.",
                "info": info,
                "statements": statements
            }
            cache_set(FINANCIALS_CACHE_PATH, f"{FINANCIALS_CACHE_VERSION}:screener:{symbol}", payload)
            return payload

    return None

def debug_screener_financials(symbol):
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return {"error": "beautifulsoup4 is not installed."}

    clean_symbol = to_nse_symbol(symbol)
    base_symbol = to_nse_base_symbol(clean_symbol)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    urls = [
        f"https://www.screener.in/company/{base_symbol}/consolidated/",
        f"https://www.screener.in/company/{base_symbol}/"
    ]
    attempts = []

    for url in urls:
        attempt = {"url": url}
        try:
            res = requests.get(url, headers=headers, timeout=15)
            attempt["statusCode"] = res.status_code
            attempt["contentType"] = res.headers.get("content-type")
            attempt["contentLength"] = len(res.text or "")
            attempt["redirectedUrl"] = res.url
            soup = BeautifulSoup(res.text, "html.parser")
            attempt["title"] = soup.title.get_text(" ", strip=True) if soup.title else None
            sections = {}
            for section_id in ("profit-loss", "balance-sheet", "cash-flow"):
                section = soup.find(id=section_id)
                parsed = parse_screener_table(section)
                sections[section_id] = {
                    "found": section is not None,
                    "periods": parsed.get("periods", [])[:6],
                    "rowCount": len(parsed.get("rows", [])),
                    "sampleRows": [
                        {"label": row.get("label"), "values": row.get("values", [])[:3]}
                        for row in parsed.get("rows", [])[:3]
                    ]
                }
            attempt["sections"] = sections
        except requests.RequestException as exc:
            attempt["error"] = str(exc)
        attempts.append(attempt)

    return {
        "symbol": clean_symbol,
        "baseSymbol": base_symbol,
        "attempts": attempts
    }

def normalize_news_item(item):
    title = item.findtext("title", default="").strip()
    link = item.findtext("link", default="").strip()
    published = item.findtext("pubDate", default="").strip()
    source = item.find("source")
    publisher = source.text.strip() if source is not None and source.text else ""

    if " - " in title and not publisher:
        title_part, publisher_part = title.rsplit(" - ", 1)
        title = title_part.strip()
        publisher = publisher_part.strip()

    return {
        "title": title,
        "publisher": publisher or "Google News",
        "link": link,
        "published": published
    }

def fetch_stock_news(symbol):
    cache = load_json_cache(NEWS_CACHE_PATH)
    cached = cache.get(symbol)
    now = time.time()
    if isinstance(cached, dict):
        return cached.get("items", [])
    if isinstance(cached, list) and len(cached) == 2:
        return cached[0]

    base_symbol = symbol.replace(".NS", "")
    company_name = STOCK_NAMES.get(base_symbol, base_symbol)
    query = quote_plus(f"{company_name} {base_symbol} stock news")
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    res = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()

    root = ET.fromstring(res.content)
    items = [
        normalize_news_item(item)
        for item in root.findall("./channel/item")[:NEWS_LIMIT]
    ]
    items = [item for item in items if item["title"] and item["link"]]

    cache[symbol] = {"cachedAt": now, "items": items}
    save_json_cache(NEWS_CACHE_PATH, cache)
    return items

def fallback_news_summary(title):
    lowered = title.lower()
    positive_terms = ["rises", "gains", "surges", "jumps", "beats", "record", "upgrade", "buy", "rally"]
    negative_terms = ["falls", "drops", "slips", "tanks", "miss", "downgrade", "sell", "loss", "pressure"]

    positive_score = sum(term in lowered for term in positive_terms)
    negative_score = sum(term in lowered for term in negative_terms)
    if positive_score > negative_score:
        sentiment = "positive"
    elif negative_score > positive_score:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "summary": title,
        "sentiment": sentiment
    }

def summarize_news_with_openai(news_item, symbol):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return fallback_news_summary(news_item["title"])

    prompt = (
        "Summarize this stock-market news headline in one short sentence and classify sentiment "
        "for the stock as positive, negative, or neutral. Return only JSON with keys summary and sentiment.\n\n"
        f"Symbol: {symbol}\n"
        f"Publisher: {news_item.get('publisher', '')}\n"
        f"Headline: {news_item['title']}"
    )
    res = requests.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": os.environ.get("OPENAI_SUMMARY_MODEL", "gpt-4.1-mini"),
            "input": prompt,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "news_sentiment",
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "summary": {"type": "string"},
                            "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]}
                        },
                        "required": ["summary", "sentiment"]
                    }
                }
            }
        },
        timeout=20
    )
    res.raise_for_status()
    payload = res.json()
    text = payload.get("output_text", "")
    if not text:
        for output in payload.get("output", []):
            for content in output.get("content", []):
                if content.get("type") == "output_text":
                    text = content.get("text", "")
                    break

    try:
        summary = json.loads(text)
    except json.JSONDecodeError:
        return fallback_news_summary(news_item["title"])

    sentiment = summary.get("sentiment", "neutral")
    if sentiment not in {"positive", "negative", "neutral"}:
        sentiment = "neutral"

    return {
        "summary": summary.get("summary") or news_item["title"],
        "sentiment": sentiment
    }

def enrich_news_with_ai(symbol, news_items):
    cache = load_json_cache(AI_CACHE_PATH)
    now = time.time()
    enriched = []

    for item in news_items:
        key = item.get("link") or f"{symbol}:{item['title']}"
        cached = cache.get(key)
        if cached and "summary" in cached and "sentiment" in cached:
            ai = {
                "summary": cached.get("summary") or item["title"],
                "sentiment": cached.get("sentiment") or "neutral"
            }
        elif cached and isinstance(cached, dict) and "ai" in cached:
            ai = cached.get("ai", fallback_news_summary(item["title"]))
        else:
            try:
                ai = summarize_news_with_openai(item, symbol)
            except requests.RequestException:
                ai = fallback_news_summary(item["title"])

            cache[key] = {
                "cachedAt": now,
                "symbol": symbol,
                "title": item["title"],
                "ai": ai
            }

        enriched.append({**item, **ai})

    save_json_cache(AI_CACHE_PATH, cache)
    return enriched

@app.route("/news/<symbol>")
def get_news(symbol):
    clean_symbol = symbol.upper().strip()
    if not re.fullmatch(r"[A-Z0-9&.-]{1,24}", clean_symbol):
        return jsonify({"error": "Invalid stock symbol."}), 400

    if "." not in clean_symbol:
        clean_symbol = f"{clean_symbol}.NS"

    try:
        news_items = fetch_stock_news(clean_symbol)
        return jsonify({
            "symbol": clean_symbol,
            "generatedAt": datetime.utcnow().isoformat(),
            "items": enrich_news_with_ai(clean_symbol, news_items)
        })
    except (requests.RequestException, ET.ParseError):
        return jsonify({"error": "Unable to load stock news right now."}), 502

@app.route("/financials/<symbol>")
def get_financials(symbol):
    clean_symbol = symbol.upper().strip()
    if not re.fullmatch(r"[A-Z0-9&.-]{1,24}", clean_symbol):
        return jsonify({"error": "Invalid stock symbol."}), 400

    clean_symbol = to_nse_symbol(clean_symbol)

    try:
        try:
            screener_payload = fetch_screener_financials(clean_symbol)
            if screener_payload:
                report_source = get_nse_annual_report_source(clean_symbol.replace(".NS", ""))
                screener_payload["source"]["annualReport"] = report_source
                screener_payload["valuation"] = safe_nse_valuation_payload(clean_symbol)
                return jsonify(screener_payload)
        except requests.RequestException:
            screener_payload = None

        try:
            apify_payload = fetch_apify_financials(clean_symbol)
            if apify_payload:
                report_source = get_nse_annual_report_source(clean_symbol.replace(".NS", ""))
                apify_payload["source"]["annualReport"] = report_source
                apify_payload["valuation"] = safe_nse_valuation_payload(clean_symbol)
                return jsonify(apify_payload)
        except requests.RequestException:
            apify_payload = None

        return jsonify({
            "error": (
                "INR financial statements are not available from Indian sources for this stock right now. "
                "Yahoo/ADR dollar financials are intentionally blocked to avoid wrong currency values."
            )
        }), 404
    except requests.RequestException:
        return jsonify({"error": "Unable to load financial statements right now."}), 502

@app.route("/debug/screener/<symbol>")
@admin_required
def debug_screener(symbol):
    clean_symbol = symbol.upper().strip()
    if not re.fullmatch(r"[A-Z0-9&.-]{1,24}", clean_symbol):
        return jsonify({"error": "Invalid stock symbol."}), 400
    return jsonify(debug_screener_financials(clean_symbol))

# =========================
# TOKEN SAVE
# =========================
@app.route("/admin")
def admin_page():
    return render_admin_page()

@app.route("/admin/login", methods=["POST"])
def admin_login():
    credentials = admin_credentials()
    username = request.form.get("username", "")
    password = request.form.get("password", "")
    if secrets.compare_digest(username, credentials["username"]) and secrets.compare_digest(password, credentials["password"]):
        session["admin_authenticated"] = True
        return redirect("/admin")

    return render_admin_page("Invalid admin username or password.", True), 401

@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_authenticated", None)
    return redirect("/admin")

@app.route("/admin/token", methods=["POST"])
@admin_required
def admin_token():
    code = request.form.get("code", "").strip()
    if not code:
        return render_admin_page("Please paste the Upstox authorization code.", True), 400

    try:
        exchange_upstox_code(code)
    except (requests.RequestException, ValueError) as exc:
        return render_admin_page(f"Token save failed: {exc}", True), 400

    return render_admin_page("Token saved successfully. Live market data can be refreshed now.")

@app.route("/auth/status")
def auth_status():
    config = get_upstox_config()
    return jsonify({
        "configured": bool(config["client_id"] and config["client_secret"]),
        "redirectUri": configured_redirect_uri(),
        "token": token_profile()
    })

@app.route("/auth/login")
@admin_required
def auth_login():
    config = get_upstox_config()
    if not config["client_id"] or not config["client_secret"]:
        return jsonify({
            "error": "UPSTOX_CONFIG_MISSING",
            "message": "Set UPSTOX_CLIENT_ID and UPSTOX_CLIENT_SECRET in backend environment variables."
        }), 400

    state = secrets.token_urlsafe(24)
    save_auth_state(state)
    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": configured_redirect_uri(),
        "state": state
    }
    return redirect(f"{UPSTOX_AUTH_URL}?{urlencode(params)}")

@app.route("/callback")
def upstox_callback():
    code = request.args.get("code", "").strip()
    state = request.args.get("state", "").strip()
    error = request.args.get("error", "").strip()

    if error:
        return auth_result_page("Upstox login failed", error, False), 400
    if not code:
        return auth_result_page("Upstox login failed", "No auth code was returned.", False), 400
    if state and not is_valid_auth_state(state):
        return auth_result_page("Upstox login failed", "The login session expired. Please connect again.", False), 400

    try:
        exchange_upstox_code(code)
    except requests.RequestException:
        return auth_result_page("Token exchange failed", "Unable to reach Upstox token service.", False), 502
    except ValueError as exc:
        return auth_result_page("Token exchange failed", str(exc), False), 400

    return auth_result_page("Upstox connected", "Market token saved. You can refresh live data now.", True, "/admin")

def auth_result_page(title, message, success, back_url="/"):
    status = "success" if success else "error"
    safe_title = escape(str(title))
    safe_message = escape(str(message))
    safe_back_url = escape(str(back_url), quote=True)
    return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{safe_title}</title>
    <style>
        body {{ margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }}
        main {{ min-height: 100vh; display: grid; place-items: center; padding: 24px; }}
        section {{ width: min(520px, 100%); border: 1px solid #e2e8f0; border-radius: 10px; background: white; padding: 24px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); }}
        p {{ color: #475569; line-height: 1.5; }}
        a {{ display: inline-flex; margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #0f172a; color: white; text-decoration: none; }}
        .success {{ color: #15803d; }}
        .error {{ color: #be123c; }}
    </style>
</head>
<body>
    <main>
        <section>
            <h1 class="{status}">{safe_title}</h1>
            <p>{safe_message}</p>
            <a href="{safe_back_url}">Continue</a>
        </section>
    </main>
</body>
</html>"""

@app.route("/set-token", methods=["POST"])
@admin_required
def set_token():
    data = request.json
    save_token(data)
    return jsonify({"status": "saved"})

# =========================
# RUN
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
