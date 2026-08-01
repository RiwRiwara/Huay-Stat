# หวยสถิติ (Huay Stat)
<img width="853" height="887" alt="image" src="https://github.com/user-attachments/assets/24ea551c-c9ed-414e-b9c3-b76011cb6b03" />
<img width="850" height="855" alt="image" src="https://github.com/user-attachments/assets/a3aebfaf-4db5-42a7-bd19-000b490e070e" />

ตรวจหวย + สถิติสลากกินแบ่งรัฐบาล 390 งวดย้อนหลัง (มี.ค. 2553 – ปัจจุบัน)
ทำงานบนเบราว์เซอร์ล้วน ไม่มี backend ไม่เก็บข้อมูลผู้ใช้

## Features

- **ตรวจหวย** — ตรวจได้สูงสุด 10 ใบต่อครั้ง กับทุกงวดย้อนหลัง เช็คครบทุกรางวัล
  (ที่ 1, ข้างเคียง, ที่ 2–5, เลขหน้า/ท้าย 3 ตัว, เลขท้าย 2 ตัว) พร้อมยอดเงินรวม
- **สถิติ** — heatmap ความถี่เลขท้าย 2 ตัว 00–99 เลือกช่วงข้อมูลได้
  พร้อมทดสอบไคสแควร์ตอบคำถาม "เลขดังมีจริงไหม" ด้วยข้อมูลจริง
- **ย้อนหลัง** — ไล่ดูผลทุกงวด + ค้น "เลขนี้เคยออกไหม" (2/3/6 หลัก)

## Data

ผลรางวัลจาก [GLO Open Data](https://gdcatalog.glo.or.th) (สำนักงานสลากกินแบ่งรัฐบาล)
เก็บด้วย `scripts/harvest.py` ตอน build แล้วฝังเป็น `src/data/draws.json`
ไม่มีการเรียก API ตอนใช้งาน
<img width="359" height="105" alt="image" src="https://github.com/user-attachments/assets/b35a0ca4-66c2-479d-ba57-e13f5d1e69d0" />

### อัปเดตอัตโนมัติ

`.github/workflows/update-draws.yml` รัน 17:15 น. (ไทย) เฉพาะช่วงที่หวยออก — เรียก
`scripts/update_draws.py` ซึ่ง probe เฉพาะวันที่หลังงวดล่าสุดใน dataset
(วันที่ไม่มีงวดจึงยิง API แค่หลักสิบครั้งและไม่ commit อะไร) เจองวดใหม่เมื่อไหร่
จะ commit `draws.json` แล้ว Cloudflare Pages build ใหม่ให้เอง

ตารางรัน: วันที่ **30, 31, 1, 2, 3** และ **14–18** ของทุกเดือน (เดือนละ 10 ครั้ง)
— จาก 390 งวดที่มีในชุดข้อมูล วันที่ออกมีแค่ 1, 2, 16, 17 และ 30 เท่านั้น
สองช่วงนี้จึงครอบคลุมงวดพิเศษทั้งหมด (30 ธ.ค., 2 ม.ค., 17 ม.ค., 2 พ.ค. ฯลฯ)
และยังเผื่อไว้ข้างละวันเผื่อ API ขึ้นช้า

อัปเดตมือ: `python3 scripts/update_draws.py`
สร้าง dataset ใหม่ทั้งก้อน: `harvest.py` + `compile.py`

### Deploy บน Cloudflare Pages

1. push โฟลเดอร์นี้เป็น repo (โฟลเดอร์นี้ = repo root เพื่อให้ `.github/` ทำงาน)
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → connect repo
3. Build command: `npm run build` · Output: `dist` — จบ ทุก commit deploy เอง

## Run

```bash
npm install
npm run dev      # localhost:5173
npm run build    # dist/ — วาง static host ใดก็ได้ (base './')
```

## Disclaimer

เพื่อการศึกษาสถิติเท่านั้น ไม่ใช่เครื่องมือใบ้หวย ทุกเลขมีโอกาส 1/100 เท่ากันทุกงวด
โปรดตรวจผลซ้ำกับประกาศทางการของ GLO ก่อนขึ้นเงินรางวัลเสมอ

## Design

Monochrome ตาม AI วันละเจค Brand CI — IBM Plex Sans Thai / Archivo / JetBrains Mono
