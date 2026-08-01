#!/usr/bin/env python3
"""Harvest Thai government lottery results from the GLO open-data API.

Draws are normally on the 1st and 16th; holidays shift them (Dec 30, Jan 17,
May 2, ...). For each month we probe candidate days until we find two draws.
Raw responses are cached to disk so re-runs only fetch what's missing.
"""
import json
import pathlib
import sys
import time
import urllib.request

API = "https://www.glo.or.th/api/checking/getLotteryResult"
RAW = pathlib.Path("/tmp/lotto/raw")
RAW.mkdir(parents=True, exist_ok=True)

# first-half candidates then second-half candidates, in likelihood order
FIRST_HALF = [1, 2, 3, 30, 31]   # 30/31 = previous-month-end draws credited to this slot (Dec 30)
SECOND_HALF = [16, 17, 18]

def fetch(y, m, d):
    body = json.dumps({"date": f"{d:02d}", "month": f"{m:02d}", "year": str(y)}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 2:
                print(f"  !! {y}-{m:02d}-{d:02d}: {e}", file=sys.stderr)
                return None
            time.sleep(1.5)

def probe(y, m, d):
    key = RAW / f"{y}-{m:02d}-{d:02d}.json"
    if key.exists():
        return json.loads(key.read_text()) is not None
    miss = RAW / f"{y}-{m:02d}-{d:02d}.miss"
    if miss.exists():
        return False
    data = fetch(y, m, d)
    time.sleep(0.25)
    resp = (data or {}).get("response")
    if resp:
        key.write_text(json.dumps(resp, ensure_ascii=False))
        return True
    miss.write_text("")
    return False

def month_slots(y, m):
    found = 0
    for cand in (FIRST_HALF, SECOND_HALF):
        for d in cand:
            if probe(y, m, d):
                found += 1
                break
    return found

import datetime
today = datetime.date(2026, 8, 1)
total = 0
for y in range(2010, 2027):
    got = 0
    for m in range(1, 13):
        if datetime.date(y, m, 1) > today:
            break
        got += month_slots(y, m)
    total += got
    print(f"{y}: {got} draws")
print("total draws found:", total)
