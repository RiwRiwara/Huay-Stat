import { useState } from 'react'

/* Hand-rolled SVG marks — monochrome, one ink hue for observed data and one
   gray for the "fair draw" reference. Every chart carries a hover readout. */

export function Panel({ title, lede, children, foot }) {
  return (
    <section className="panel">
      <h3 className="panel-title">{title}</h3>
      {lede && <p className="panel-lede">{lede}</p>}
      {children}
      {foot && <p className="fineprint">{foot}</p>}
    </section>
  )
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span className="legend-item" key={it.label}>
          <span className={'legend-key ' + (it.kind || 'bar')} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function useTip() {
  const [tip, setTip] = useState(null)
  const node = tip && (
    <div
      className="tip"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
      role="status"
    >
      <b>{tip.value}</b>
      <span>{tip.label}</span>
    </div>
  )
  return [node, setTip]
}

export function StatTile({ label, value, note, wide }) {
  return (
    <div className={'tile' + (wide ? ' wide' : '')}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  )
}

export function Meter({ value, label, right }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="meter-wrap">
      <div className="meter-head">
        <span>{label}</span>
        <span className="mono">{right}</span>
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  )
}

const W = 720
const H = 250
const M = { t: 14, r: 10, b: 34, l: 44 }

function niceTicks(max, count = 4) {
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) * mag
  const out = []
  for (let v = 0; v <= max + step / 2; v += step) out.push(v)
  return out
}

/**
 * Columns for the observed counts with the expected-under-randomness curve
 * riding on top. Two series → legend required; the forms differ too, so the
 * pair never depends on color alone.
 */
export function ColumnsVsExpected({ data, xLabel, yLabel, fmt = (v) => v.toFixed(1) }) {
  const [tipNode, setTip] = useTip()
  const iw = W - M.l - M.r
  const ih = H - M.t - M.b
  const max = Math.max(...data.flatMap((d) => [d.observed, d.expected]), 1)
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const band = iw / data.length
  const bw = Math.min(24, band * 0.62)
  const y = (v) => M.t + ih - (v / top) * ih
  const cx = (i) => M.l + band * (i + 0.5)
  const showEvery = Math.ceil(data.length / 12)

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${cx(i)},${y(d.expected)}`).join(' ')

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={M.l - 8} y={y(t) + 4} className="axis-txt" textAnchor="end">
              {t.toLocaleString('th-TH')}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const h = Math.max(0, (d.observed / top) * ih)
          return (
            <g key={d.label ?? d.k}>
              <rect
                x={cx(i) - bw / 2}
                y={y(d.observed)}
                width={bw}
                height={h}
                rx={Math.min(4, h / 2)}
                className="bar"
              />
              <rect
                x={M.l + band * i}
                y={M.t}
                width={band}
                height={ih}
                fill="transparent"
                onPointerEnter={() =>
                  setTip({
                    x: (cx(i) / W) * 100,
                    y: 4,
                    value: `${d.observed.toLocaleString('th-TH')} ${yLabel}`,
                    label: `${d.label ?? d.k} · สุ่มล้วนคาดว่า ${fmt(d.expected)}`,
                  })
                }
                onPointerLeave={() => setTip(null)}
              />
            </g>
          )
        })}

        <path d={line} className="ref-line" />
        {data.map((d, i) => (
          <circle key={'e' + i} cx={cx(i)} cy={y(d.expected)} r={4} className="ref-dot" />
        ))}

        <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="axis" />
        {data.map((d, i) =>
          i % showEvery === 0 ? (
            <text key={'x' + i} x={cx(i)} y={H - 14} className="axis-txt" textAnchor="middle">
              {d.label ?? d.k}
            </text>
          ) : null
        )}
        <text x={M.l + iw / 2} y={H - 1} className="axis-cap" textAnchor="middle">{xLabel}</text>
      </svg>
      {tipNode}
    </div>
  )
}

/**
 * Convergence funnel: the band between the most- and least-frequent ending,
 * closing on the 1% line as draws accumulate.
 */
export function ConvergenceBand({ data, reference, refLabel }) {
  const [tipNode, setTip] = useTip()
  const iw = W - M.l - M.r
  const ih = H - M.t - M.b
  const top = Math.max(...data.map((d) => d.hi)) * 1.05
  const n0 = data[0].n
  const n1 = data[data.length - 1].n
  const x = (n) => M.l + ((n - n0) / (n1 - n0)) * iw
  const y = (v) => M.t + ih - (v / top) * ih
  const ticks = niceTicks(top * 100).map((t) => t / 100)

  const area =
    data.map((d, i) => `${i ? 'L' : 'M'}${x(d.n)},${y(d.hi)}`).join(' ') +
    ' ' +
    [...data].reverse().map((d) => `L${x(d.n)},${y(d.lo)}`).join(' ') +
    ' Z'

  const nearest = (evt) => {
    const box = evt.currentTarget.getBoundingClientRect()
    const px = ((evt.clientX - box.left) / box.width) * W
    let best = data[0]
    for (const d of data) if (Math.abs(x(d.n) - px) < Math.abs(x(best.n) - px)) best = d
    setTip({
      x: (x(best.n) / W) * 100,
      y: 4,
      value: `${(best.lo * 100).toFixed(2)}% – ${(best.hi * 100).toFixed(2)}%`,
      label: `หลัง ${best.n} งวด`,
    })
  }

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={M.l - 8} y={y(t) + 4} className="axis-txt" textAnchor="end">
              {(t * 100).toFixed(1)}%
            </text>
          </g>
        ))}

        <path d={area} className="band" />
        <path d={data.map((d, i) => `${i ? 'L' : 'M'}${x(d.n)},${y(d.hi)}`).join(' ')} className="band-edge" />
        <path d={data.map((d, i) => `${i ? 'L' : 'M'}${x(d.n)},${y(d.lo)}`).join(' ')} className="band-edge" />

        <line x1={M.l} x2={W - M.r} y1={y(reference)} y2={y(reference)} className="ref-line" />
        <text x={W - M.r} y={y(reference) - 7} className="axis-txt" textAnchor="end">
          {refLabel}
        </text>

        <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="axis" />
        <text x={M.l} y={H - 14} className="axis-txt">{n0} งวด</text>
        <text x={W - M.r} y={H - 14} className="axis-txt" textAnchor="end">{n1} งวด</text>

        <rect
          x={M.l} y={M.t} width={iw} height={ih} fill="transparent"
          onPointerMove={nearest}
          onPointerLeave={() => setTip(null)}
        />
      </svg>
      {tipNode}
    </div>
  )
}

/** Sequential heat grid — one ink ramp, more-is-darker. */
export function HeatGrid({ rows, cols, colLabel, rowLabel, cell }) {
  const [tipNode, setTip] = useTip()
  const peak = Math.max(...rows.flatMap((r) => r.counts), 1)
  const floor = Math.min(...rows.flatMap((r) => r.counts))
  return (
    <div className="chart heat-chart">
      <div className="heat-grid" style={{ '--cols': cols.length }}>
        <div className="heat-corner" />
        {cols.map((c) => (
          <div className="heat-col-lbl mono" key={c}>{c}</div>
        ))}
        {rows.map((r, ri) => (
          <Row key={ri} r={r} ri={ri} />
        ))}
      </div>
      {tipNode}
      <div className="heat-scale">
        <span className="mono">{floor}</span>
        <span className="heat-ramp" />
        <span className="mono">{peak}</span>
        <span className="heat-scale-cap">{colLabel}</span>
      </div>
    </div>
  )

  function Row({ r, ri }) {
    return (
      <>
        <div className="heat-row-lbl">{rowLabel(r, ri)}</div>
        {r.counts.map((c, ci) => {
          const v = peak === floor ? 0.5 : (c - floor) / (peak - floor)
          return (
            <div
              key={ci}
              className={'heat-cell mono' + (v > 0.6 ? ' dark' : '')}
              style={{ '--v': v }}
              tabIndex={0}
              onPointerEnter={(e) => {
                const box = e.currentTarget.closest('.heat-chart').getBoundingClientRect()
                const b = e.currentTarget.getBoundingClientRect()
                setTip({
                  x: ((b.left + b.width / 2 - box.left) / box.width) * 100,
                  y: 0,
                  value: `${c} ครั้ง`,
                  label: cell(r, ri, ci),
                })
              }}
              onPointerLeave={() => setTip(null)}
            >
              {c}
            </div>
          )
        })}
      </>
    )
  }
}
