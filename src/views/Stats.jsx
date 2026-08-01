import { useMemo } from 'react'
import { useDrawRange } from '../components/RangePicker.jsx'

export default function Stats() {
  const [draws, rangeControl] = useDrawRange()

  const { freq, max, min, expected, chi2 } = useMemo(() => {
    const freq = Array(100).fill(0)
    for (const d of draws) for (const n of d.last2) freq[Number(n)]++
    const expected = draws.length / 100
    const entries = freq.map((c, i) => [i, c])
    const max = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const min = [...entries].sort((a, b) => a[1] - b[1]).slice(0, 5)
    const chi2 = freq.reduce((s, c) => s + (c - expected) ** 2 / expected, 0)
    return { freq, max, min, expected, chi2 }
  }, [draws])

  const peak = Math.max(...freq, 1)
  const pad = (i) => String(i).padStart(2, '0')

  // chi-square critical value for df=99 at p=0.05 is ~123.2
  const CHI_CRIT = 123.2
  const uniform = chi2 < CHI_CRIT

  return (
    <div className="stats">
      {rangeControl}
      <p className="fineprint">ค่าคาดหมายต่อเลข {expected.toFixed(2)} ครั้ง</p>

      <h3 className="sec-head">ความถี่เลขท้าย 2 ตัว (00–99)</h3>
      <div className="heatmap">
        {freq.map((c, i) => (
          <div
            key={i}
            className={'cell' + (c / peak > 0.55 ? ' dark' : '')}
            style={{ '--v': c / peak }}
            title={`${pad(i)} ออก ${c} ครั้ง`}
          >
            <span className="cell-num mono">{pad(i)}</span>
            <span className="cell-count mono">{c}</span>
          </div>
        ))}
      </div>

      <div className="split">
        <div>
          <h3 className="sec-head">ออกบ่อยสุด</h3>
          <ol className="rank mono">
            {max.map(([i, c]) => (
              <li key={i}>
                <b>{pad(i)}</b> — {c} ครั้ง
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="sec-head">ออกน้อยสุด</h3>
          <ol className="rank mono">
            {min.map(([i, c]) => (
              <li key={i}>
                <b>{pad(i)}</b> — {c} ครั้ง
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mythbox">
        <h3>แล้ว "เลขดัง" มีจริงไหม</h3>
        <p>
          ทดสอบไคสแควร์กับข้อมูล {draws.length} งวด: χ² = {chi2.toFixed(1)} (ค่าวิกฤต df=99,
          p=0.05 คือ {CHI_CRIT}) —{' '}
          {uniform ? (
            <b>สรุปว่าการกระจายไม่ต่างจากการสุ่มล้วน ๆ อย่างมีนัยสำคัญ</b>
          ) : (
            <b>ค่าเกินเกณฑ์ ควรตรวจสอบข้อมูลเพิ่ม</b>
          )}
          {' '}เลขที่ "ออกบ่อย" ในตารางข้างบนคือความผันผวนปกติของการสุ่ม
          ไม่ได้บอกอะไรเกี่ยวกับงวดหน้าเลย — ทุกเลขมีโอกาส 1 ใน 100 เท่ากันทุกงวด
        </p>
        <p className="fineprint">
          เว็บนี้ทำเพื่อการศึกษาสถิติ ไม่ใช่เครื่องมือใบ้หวย และไม่สนับสนุนการพนันเกินตัว
        </p>
      </div>
    </div>
  )
}
