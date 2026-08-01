import { useMemo, useState } from 'react'
import { DRAWS, thaiDate, baht, checkNumber } from '../data/index.js'

const MAX_TICKETS = 10

export default function Check() {
  const [drawIdx, setDrawIdx] = useState(0)
  const [tickets, setTickets] = useState([''])
  const [checked, setChecked] = useState(null) // results snapshot

  const draw = DRAWS[drawIdx]

  const setTicket = (i, v) => {
    const clean = v.replace(/\D/g, '').slice(0, 6)
    const next = [...tickets]
    next[i] = clean
    setTickets(next)
    setChecked(null)
  }

  const valid = tickets.filter((t) => t.length === 6)

  const run = () => {
    const results = valid.map((num) => ({ num, wins: checkNumber(draw, num) }))
    setChecked({ date: draw.date, results })
  }

  const total = checked
    ? checked.results.flatMap((r) => r.wins).reduce((s, w) => s + w.amount, 0)
    : 0

  return (
    <div className="check">
      <div className="field-row">
        <label className="lbl">งวดวันที่</label>
        <select
          className="draw-select"
          value={drawIdx}
          onChange={(e) => {
            setDrawIdx(Number(e.target.value))
            setChecked(null)
          }}
        >
          {DRAWS.map((d, i) => (
            <option key={d.date} value={i}>
              {thaiDate(d.date)}
            </option>
          ))}
        </select>
      </div>

      <label className="lbl">เลขสลาก (6 หลัก สูงสุด {MAX_TICKETS} ใบ)</label>
      <div className="tickets">
        {tickets.map((t, i) => (
          <input
            key={i}
            className={'ticket mono' + (t && t.length < 6 ? ' incomplete' : '')}
            inputMode="numeric"
            placeholder="______"
            value={t}
            onChange={(e) => setTicket(i, e.target.value)}
          />
        ))}
        {tickets.length < MAX_TICKETS && (
          <button className="add-ticket" onClick={() => setTickets([...tickets, ''])}>
            + เพิ่มใบ
          </button>
        )}
      </div>

      <button className="primary-btn" disabled={!valid.length} onClick={run}>
        ตรวจ {valid.length || ''} ใบ
      </button>

      {checked && (
        <div className="results">
          <div className={'verdict' + (total > 0 ? ' win' : '')}>
            {total > 0 ? `ถูกรางวัล รวม ${baht(total)}` : 'ไม่ถูกรางวัล — งวดหน้ายังมี (ทางสถิติก็ประมาณนี้แหละครับ)'}
          </div>
          <ul className="result-list">
            {checked.results.map((r) => (
              <li key={r.num} className={'result-row' + (r.wins.length ? ' hit' : '')}>
                <span className="mono num">{r.num}</span>
                <span className="detail">
                  {r.wins.length
                    ? r.wins.map((w) => `${w.label} (${baht(w.amount)})`).join(' · ')
                    : 'ไม่ถูกรางวัล'}
                </span>
              </li>
            ))}
          </ul>
          <p className="fineprint">
            ตรวจกับผลงวด {thaiDate(checked.date)} จากข้อมูล GLO Open Data —
            โปรดตรวจซ้ำกับประกาศทางการก่อนขึ้นเงินรางวัลเสมอ
          </p>
        </div>
      )}

      <h3 className="sec-head">ผลรางวัลงวด {thaiDate(draw.date)}</h3>
      <DrawTable draw={draw} />
    </div>
  )
}

function perPrize(price, count) {
  if (!price) return ''
  return count > 1 ? `${count} รางวัลๆ ละ ${baht(price)}` : `รางวัลละ ${baht(price)}`
}

function PrizeSet({ label, nums, price }) {
  return (
    <section className="prize-set">
      <div className="prize-set-head">
        <b>{label}</b>
        <span className="prize-sub">{perPrize(price, nums.length)}</span>
      </div>
      <div className="prize-grid mono">
        {nums.length ? nums.map((n) => <span key={n}>{n}</span>) : <span className="muted">—</span>}
      </div>
    </section>
  )
}

export function DrawTable({ draw }) {
  return (
    <div className="board">
      <div className="board-top">
        <div className="bcard bcard-first">
          <div className="bcard-title">รางวัลที่ 1</div>
          <div className="bcard-sub">รางวัลละ {baht(draw.first_p)}</div>
          <div className="bcard-nums mono big">
            {draw.first.map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>
        {[
          ['เลขหน้า 3 ตัว', draw.last3f, draw.last3f_p],
          ['เลขท้าย 3 ตัว', draw.last3b, draw.last3b_p],
          ['เลขท้าย 2 ตัว', draw.last2, draw.last2_p],
        ].map(([label, nums, price]) => (
          <div className="bcard" key={label}>
            <div className="bcard-title">{label}</div>
            <div className="bcard-sub">{perPrize(price, nums.length)}</div>
            <div className="bcard-nums mono">
              {nums.map((n) => <span key={n}>{n}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="near1-row">
        <div className="near1-label">
          <b>รางวัลข้างเคียงรางวัลที่ 1</b>
          <span className="prize-sub">{perPrize(draw.near1_p, draw.near1.length)}</span>
        </div>
        <div className="near1-nums mono">
          {draw.near1.map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>

      <PrizeSet label="รางวัลที่ 2" nums={draw.second} price={draw.second_p} />
      <PrizeSet label="รางวัลที่ 3" nums={draw.third} price={draw.third_p} />
      <PrizeSet label="รางวัลที่ 4" nums={draw.fourth} price={draw.fourth_p} />
      <PrizeSet label="รางวัลที่ 5" nums={draw.fifth} price={draw.fifth_p} />
    </div>
  )
}
