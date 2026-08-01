#!/usr/bin/env python3
"""Compile raw draw JSONs (from harvest.py) into src/data/draws.json."""
import json, pathlib
RAW = pathlib.Path(__file__).parent.parent / "raw"
OUT = pathlib.Path(__file__).parent.parent / "src/data/draws.json"
KEYS = ["first","near1","second","third","fourth","fifth","last3f","last3b","last2"]
draws = []
for p in sorted(RAW.glob("*.json")):
    r = json.loads(p.read_text())
    res = r.get("result", r)
    data = res.get("data") or {}
    d = {"date": p.name[:10]}
    for k in KEYS:
        cat = data.get(k) or {}
        d[k] = sorted(x["value"] for x in cat.get("number", []))
        d[k+"_p"] = float(cat.get("price") or 0)
    draws.append(d)
json.dump(draws, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print(len(draws), "draws ->", OUT)
