import json

def load_instrument_map():
    with open("data/instruments.json", "r") as f:
        return json.load(f)


def get_nifty50_keys():
    mapping = load_instrument_map()
    return list(mapping.values())