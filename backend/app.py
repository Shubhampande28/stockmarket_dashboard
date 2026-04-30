from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import requests
import json
from token_manager import get_access_token, save_token

app = Flask(__name__, static_folder="../frontend")
CORS(app)

# =========================
# SERVE FRONTEND
# =========================
@app.route("/")
def home():
    return send_from_directory("../frontend", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("../frontend", path)

# =========================
# LOAD INSTRUMENT JSON
# =========================
def load_instrument_map():
    with open("instruments.json", "r") as f:
        return json.load(f)

# =========================
# SECTOR GROUPS
# =========================
NIFTY_IT = [
    "TCS","INFY","HCLTECH","WIPRO","TECHM",
    "LTIM","PERSISTENT","COFORGE"
]

NIFTY_BANK = [
    "HDFCBANK","ICICIBANK","SBIN","KOTAKBANK",
    "AXISBANK","INDUSINDBK","BANKBARODA",
    "PNB","IDFCFIRSTB","FEDERALBNK"
]

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
    instrument_keys = list(instrument_map.values())[:80]  # safe limit

    url = "https://api.upstox.com/v2/market-quote/quotes"
    params = {"instrument_key": ",".join(instrument_keys)}

    res = requests.get(url, headers=headers, params=params)

    if res.status_code != 200:
        return jsonify({"all": [], "gainers": [], "losers": []})

    data = res.json().get("data", {})

    stocks_data = []

    for key, val in data.items():
        symbol = val["symbol"]
        ltp = val["last_price"]
        change = val["net_change"]

        open_price = ltp - change
        percent = (change / open_price) * 100 if open_price != 0 else 0

        stocks_data.append({
            "symbol": symbol + ".NS",
            "price": round(ltp, 2),
            "change": round(percent, 2)
        })

    # =========================
    # FILTER + SORT
    # =========================
    positive = [s for s in stocks_data if s["change"] > 0]
    negative = [s for s in stocks_data if s["change"] < 0]

    gainers = sorted(positive, key=lambda x: x["change"], reverse=True)[:10]
    losers = sorted(negative, key=lambda x: x["change"])[:20]

    # =========================
    # SECTOR SPLIT
    # =========================
    it_stocks = []
    bank_stocks = []
    others = []

    for s in stocks_data:
        sym = s["symbol"].replace(".NS", "")

        if sym in NIFTY_IT:
            it_stocks.append(s)
        elif sym in NIFTY_BANK:
            bank_stocks.append(s)
        else:
            others.append(s)

    return jsonify({
        "all": stocks_data,
        "gainers": gainers,
        "losers": losers,
        "it": it_stocks,
        "bank": bank_stocks,
        "others": others
    })

# =========================
# TOKEN SAVE
# =========================
@app.route("/set-token", methods=["POST"])
def set_token():
    data = request.json
    save_token(data)
    return jsonify({"status": "saved"})

# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)