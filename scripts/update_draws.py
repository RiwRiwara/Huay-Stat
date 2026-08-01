#!/usr/bin/env python3
"""Incrementally append new lottery draws to src/data/draws.json.

Designed for CI: probes only dates AFTER the newest draw already in the dataset,
so a run on a non-draw day makes zero-to-few requests and changes nothing.
Exit code is always 0; CI decides whether to commit by checking `git diff`.

Usage:  python3 scripts/update_draws.py
"""
import datetime
import json
import pathlib
import sys
import time
import urllib.request

API = "https://www.glo.or.th/api/checking/getLotteryResult"
DATA = pathlib.Path(__file__).resolve().parent.parent / "src/data/draws.json"
KEYS = ["first", "near1", "second", "third", "fourth", "fifth", "last3f", "last3b", "last2"]

# plausible draw days per month (normal 1/16 + holiday shifts)
def candidates(m):
    days = {1, 2, 3, 16, 17, 18}
    if m == 12: days |= {29, 30}
    if m == 5: days |= {4, 5}
    if m in (4, 6): days |= {15}
    return sorted(days)

def fetch(y, m, d):
    body = json.dumps({"date": f"{d:02d}", "month": f"{m:02d}", "year": str(y)}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r).get("response")
        except Exception as e:
            if attempt == 2:
                print(f"  warn {y}-{m:02d}-{d:02d}: {e}", file=sys.stderr)
                return None
            time.sleep(2)

def compact(date_iso, resp):
    res = resp.get("result", resp)
    data = res.get("data") or {}
    d = {"date": date_iso}
    for k in KEYS:
        cat = data.get(k) or {}
        d[k] = sorted(x["value"] for x in cat.get("number", []))
        d[k + "_p"] = float(cat.get("price") or 0)
    return d

def main():
    draws = json.loads(DATA.read_text())
    have = {d["date"] for d in draws}
    last = max(have)
    today = datetime.date.today()
    print(f"dataset: {len(draws)} draws, newest {last}")

    y0, m0 = int(last[:4]), int(last[5:7])
    added = 0
    y, m = y0, m0
    while (y, m) <= (today.year, today.month):
        for d in candidates(m):
            iso = f"{y}-{m:02d}-{d:02d}"
            if iso in have or iso <= last:
                continue
            if datetime.date(y, m, min(d, 28)) > today and datetime.date(y, m, 1) >= today.replace(day=1):
                # rough future guard; exact per-day check below
                pass
            try:
                if datetime.date(y, m, d) > today:
                    continue
            except ValueError:
                continue
            resp = fetch(y, m, d)
            time.sleep(0.3)
            if resp:
                draws.append(compact(iso, resp))
                have.add(iso)
                added += 1
                print(f"  + new draw {iso}")
        m += 1
        if m > 12:
            m, y = 1, y + 1

    if added:
        draws.sort(key=lambda x: x["date"])
        DATA.write_text(json.dumps(draws, ensure_ascii=False, separators=(",", ":")))
        print(f"updated: +{added} draw(s), total {len(draws)}")
    else:
        print("no new draws")

if __name__ == "__main__":
    main()
