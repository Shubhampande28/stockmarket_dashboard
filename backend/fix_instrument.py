import json

INPUT_FILE = "instruments.json"
OUTPUT_FILE = "instruments_fixed.json"

with open(INPUT_FILE, "r") as f:
    data = json.load(f)

fixed = {}

for symbol in data.keys():
    clean_symbol = symbol.strip().upper()

    # skip invalid symbols
    if not clean_symbol:
        continue

    fixed[clean_symbol] = f"NSE_EQ|{clean_symbol}"

with open(OUTPUT_FILE, "w") as f:
    json.dump(fixed, f, indent=2)

print("Fixed instruments saved")
print("Total:", len(fixed))