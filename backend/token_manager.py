import json
import os
import time
import requests
from pathlib import Path

TOKEN_FILE = Path(__file__).resolve().parent / "token.json"

def save_token(data):
    data["created_at"] = time.time()
    with open(TOKEN_FILE, "w") as f:
        json.dump(data, f)

def load_token():
    env_token = os.environ.get("UPSTOX_ACCESS_TOKEN")
    if env_token:
        return {"access_token": env_token, "source": "env"}

    try:
        with open(TOKEN_FILE, "r") as f:
            return json.load(f)
    except:
        return None

def is_expired(token):
    try:
        import base64
        payload = token["access_token"].split(".")[1]

        # fix padding
        payload += '=' * (-len(payload) % 4)

        decoded = json.loads(base64.b64decode(payload))

        return time.time() > decoded["exp"]

    except Exception as e:
        print("❌ Token decode error:", e)
        return True

def get_access_token():
    token = load_token()

    if not token:
        return None

    if is_expired(token):
        print("❌ TOKEN EXPIRED (REAL)")
        return None

    return token["access_token"]
