// Thai government lottery results — harvested from GLO open data API
// (gdcatalog.glo.or.th / glo.or.th), 390 draws, 2010-03-01 .. 2026-08-01
import raw from './draws.json'

// newest first for UI
export const DRAWS = [...raw].reverse()

export const PRIZE_META = [
  ['first', 'รางวัลที่ 1'],
  ['near1', 'ข้างเคียงรางวัลที่ 1'],
  ['second', 'รางวัลที่ 2'],
  ['third', 'รางวัลที่ 3'],
  ['fourth', 'รางวัลที่ 4'],
  ['fifth', 'รางวัลที่ 5'],
  ['last3f', 'เลขหน้า 3 ตัว'],
  ['last3b', 'เลขท้าย 3 ตัว'],
  ['last2', 'เลขท้าย 2 ตัว'],
]

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function thaiDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`
}

export const baht = (n) =>
  n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' บาท'

/** Check one 6-digit number against one draw. Returns array of {prize, label, amount}. */
export function checkNumber(draw, num) {
  const wins = []
  const add = (key, label, amount) => wins.push({ key, label, amount })
  if (draw.first.includes(num)) add('first', 'รางวัลที่ 1', draw.first_p)
  if (draw.near1.includes(num)) add('near1', 'ข้างเคียงรางวัลที่ 1', draw.near1_p)
  if (draw.second.includes(num)) add('second', 'รางวัลที่ 2', draw.second_p)
  if (draw.third.includes(num)) add('third', 'รางวัลที่ 3', draw.third_p)
  if (draw.fourth.includes(num)) add('fourth', 'รางวัลที่ 4', draw.fourth_p)
  if (draw.fifth.includes(num)) add('fifth', 'รางวัลที่ 5', draw.fifth_p)
  if (draw.last3f.includes(num.slice(0, 3))) add('last3f', 'เลขหน้า 3 ตัว', draw.last3f_p)
  if (draw.last3b.includes(num.slice(3))) add('last3b', 'เลขท้าย 3 ตัว', draw.last3b_p)
  if (draw.last2.includes(num.slice(4))) add('last2', 'เลขท้าย 2 ตัว', draw.last2_p)
  return wins
}
