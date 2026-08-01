import { useMemo, useSyncExternalStore } from 'react'
import { DRAWS, thaiDate } from '../data/index.js'

/* Draws are twice a month, so preset sizes are expressed in draws but labelled
   in the period a reader actually thinks in. */
const PRESETS = [
  ['all', 'ทุกงวด'],
  [240, '10 ปี'],
  [120, '5 ปี'],
  [48, '2 ปี'],
  [24, '1 ปี'],
  [12, '6 เดือน'],
]

const OLDEST = DRAWS[DRAWS.length - 1].date
const NEWEST = DRAWS[0].date

/* The selection lives outside React so switching tabs keeps the range the
   reader picked — every view reads the same store. */
let state = { preset: 'all', from: OLDEST, to: NEWEST }
const listeners = new Set()

function update(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * One filter row that scopes everything below it. Returns the selected slice
 * plus the control to render — so every view stays in sync with one source.
 */
export function useDrawRange() {
  const { preset, from, to } = useSyncExternalStore(subscribe, () => state)
  const setPreset = (v) => update({ preset: v })
  const setFrom = (v) => update({ from: v })
  const setTo = (v) => update({ to: v })

  const draws = useMemo(() => {
    if (preset === 'custom') return DRAWS.filter((d) => d.date >= from && d.date <= to)
    return preset === 'all' ? DRAWS : DRAWS.slice(0, preset)
  }, [preset, from, to])

  // keep the two ends from crossing — a custom range always holds ≥ 1 draw
  const fromOptions = DRAWS.filter((d) => d.date <= to)
  const toOptions = DRAWS.filter((d) => d.date >= from)

  const control = (
    <div className="range-picker">
      <div className="filter-row">
        <label className="lbl">ช่วงข้อมูล</label>
        <div className="chip-group">
          {PRESETS.map(([v, label]) => (
            <button
              key={v}
              className={'chip' + (preset === v ? ' active' : '')}
              onClick={() => setPreset(v)}
            >
              {label}
            </button>
          ))}
          <button
            className={'chip' + (preset === 'custom' ? ' active' : '')}
            onClick={() => setPreset('custom')}
          >
            กำหนดเอง
          </button>
        </div>
      </div>

      {preset === 'custom' && (
        <div className="custom-range">
          <label>
            <span>ตั้งแต่งวด</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {fromOptions.map((d) => (
                <option key={d.date} value={d.date}>{thaiDate(d.date)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>ถึงงวด</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {toOptions.map((d) => (
                <option key={d.date} value={d.date}>{thaiDate(d.date)}</option>
              ))}
            </select>
          </label>
          <button
            className="chip"
            onClick={() => update({ from: OLDEST, to: NEWEST })}
          >
            ล้างช่วง
          </button>
        </div>
      )}

      <p className="range-summary">
        {draws.length} งวด · {thaiDate(draws[draws.length - 1].date)} — {thaiDate(draws[0].date)}
        {draws.length < 40 && (
          <span className="range-warn">
            ช่วงสั้น — ตัวเลขสถิติจะแกว่งมากและการทดสอบนัยสำคัญยังเชื่อถือไม่ได้
          </span>
        )}
      </p>
    </div>
  )

  return [draws, control]
}
