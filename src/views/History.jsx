import { useMemo, useState } from 'react'
import { DRAWS, thaiDate } from '../data/index.js'
import { DrawTable } from './Check.jsx'

const PAGE = 24

export default function History() {
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState(null)

  const query = q.replace(/\D/g, '')

  // "เลขนี้เคยออกไหม": search across prize categories appropriate to query length
  const matches = useMemo(() => {
    if (!query) return null
    const hits = []
    for (const d of DRAWS) {
      const where = []
      if (query.length === 2) {
        if (d.last2.includes(query)) where.push('เลขท้าย 2 ตัว')
        if (d.first[0]?.endsWith(query)) where.push('ท้ายรางวัลที่ 1')
      } else if (query.length === 3) {
        if (d.last3f.includes(query)) where.push('เลขหน้า 3 ตัว')
        if (d.last3b.includes(query)) where.push('เลขท้าย 3 ตัว')
        if (d.first[0]?.endsWith(query)) where.push('ท้ายรางวัลที่ 1')
      } else if (query.length === 6) {
        for (const [k, label] of [
          ['first', 'รางวัลที่ 1'], ['near1', 'ข้างเคียงที่ 1'], ['second', 'รางวัลที่ 2'],
          ['third', 'รางวัลที่ 3'], ['fourth', 'รางวัลที่ 4'], ['fifth', 'รางวัลที่ 5'],
        ]) {
          if (d[k].includes(query)) where.push(label)
        }
      }
      if (where.length) hits.push({ d, where })
    }
    return hits
  }, [query])

  return (
    <div className="history">
      <input
        className="search mono"
        inputMode="numeric"
        placeholder="เลขนี้เคยออกไหม — ใส่ 2, 3 หรือ 6 หลัก"
        value={q}
        onChange={(e) => setQ(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />

      {query && ![2, 3, 6].includes(query.length) && (
        <p className="fineprint">ใส่ให้ครบ 2, 3 หรือ 6 หลักก่อนครับ</p>
      )}

      {matches && [2, 3, 6].includes(query.length) && (
        <div className="mythbox">
          <b className="mono">{query}</b> เคยออก {matches.length} ครั้ง จาก {DRAWS.length} งวด
          {query.length === 2 && (
            <>
              {' '}(ค่าคาดหมายจากการสุ่ม ≈ {(DRAWS.length / 100).toFixed(1)} ครั้ง)
            </>
          )}
          <ul className="hit-list">
            {matches.slice(0, 20).map(({ d, where }) => (
              <li key={d.date}>
                {thaiDate(d.date)} — {where.join(', ')}
              </li>
            ))}
            {matches.length > 20 && <li>… และอีก {matches.length - 20} งวด</li>}
          </ul>
        </div>
      )}

      <h3 className="sec-head">ผลย้อนหลังทุกงวด</h3>
      <ul className="draw-list">
        {DRAWS.slice(0, limit).map((d) => (
          <li key={d.date} className="draw-item">
            <button className="draw-row" onClick={() => setOpen(open === d.date ? null : d.date)}>
              <span>{thaiDate(d.date)}</span>
              <span className="mono">
                {d.first[0]} · ท้าย 2 ตัว {d.last2[0]}
              </span>
            </button>
            {open === d.date && <DrawTable draw={d} />}
          </li>
        ))}
      </ul>
      {limit < DRAWS.length && (
        <button className="load-more" onClick={() => setLimit(limit + PAGE)}>
          แสดงเพิ่ม ({DRAWS.length - limit} งวด)
        </button>
      )}
    </div>
  )
}
