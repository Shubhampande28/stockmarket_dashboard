"""NSE FII/DII cash-market flow fetch, with cookie warm-up and a stale-fallback."""
import requests

NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}

FII_DII_URL = "https://www.nseindia.com/api/fiidiiTradeReact"
TIMEOUT_SECONDS = 10
MAX_ATTEMPTS = 3


def fetch_fii_dii():
    """Returns {date, fii_net, dii_net} in ₹ crore for the latest reported day, or None on failure.

    NSE's fiidiiTradeReact endpoint only ever returns the latest day -- it is
    not a history API. Callers should store each day's result as it arrives
    and keep the previous value (marked stale=true) if this returns None.
    """
    session = requests.Session()
    session.headers.update(NSE_HEADERS)

    for attempt in range(MAX_ATTEMPTS):
        try:
            session.get("https://www.nseindia.com", timeout=TIMEOUT_SECONDS)
            res = session.get(FII_DII_URL, timeout=TIMEOUT_SECONDS)
            res.raise_for_status()
            rows = res.json()
            return _parse_fii_dii_rows(rows)
        except (requests.RequestException, ValueError) as exc:
            print("NSE FII/DII FETCH FAILED (attempt", attempt + 1, "of", MAX_ATTEMPTS, ") =", str(exc))
    return None


def _parse_fii_dii_rows(rows):
    fii_net = None
    dii_net = None
    date = None
    for row in rows or []:
        category = (row.get("category") or "").strip().upper()
        net = row.get("netValue")
        if net is None:
            continue
        date = row.get("date") or date
        if "FII" in category or "FPI" in category:
            fii_net = float(net)
        elif "DII" in category:
            dii_net = float(net)
    if fii_net is None and dii_net is None:
        return None
    return {"date": date, "fii_net": fii_net, "dii_net": dii_net}
