import { useMemo, useState } from 'react'
import { DRAWS, baht } from '../data/index.js'
import {
  uniformityTest, hitCountDistribution, gapAnalysis, gapHistogram,
  digitPositions, convergenceBand, ticketOdds, projectSpend, drawStrategies,
  oneIn, pct, pad2, DRAWS_PER_YEAR, FACE_PRICE,
} from '../lib/stats.js'
import {
  Panel, Legend, StatTile, Meter, ColumnsVsExpected, ConvergenceBand, HeatGrid,
} from '../components/charts.jsx'
import { useDrawRange } from '../components/RangePicker.jsx'

const FAIR = [
  { label: 'ที่ออกจริง', kind: 'bar' },
  { label: 'ที่ควรเป็นถ้าสุ่มล้วน', kind: 'line' },
]

export default function Analytics() {
  const [tickets, setTickets] = useState(2)
  const [years, setYears] = useState(10)
  const [draws, rangeControl] = useDrawRange()

  const uni = useMemo(() => uniformityTest(draws), [draws])
  const hits = useMemo(() => hitCountDistribution(draws), [draws])
  const gaps = useMemo(() => gapAnalysis(draws), [draws])
  const gapHist = useMemo(() => gapHistogram(gaps.gaps), [gaps])
  const digits = useMemo(() => digitPositions(draws), [draws])
  const band = useMemo(() => convergenceBand(DRAWS), [])

  const [priceInput, setPriceInput] = useState(String(FACE_PRICE))
  const price = Math.min(10000, Math.max(1, Number(priceInput) || FACE_PRICE))

  const latest = DRAWS[0]
  const odds = useMemo(() => ticketOdds(latest, price), [latest, price])
  const plan = useMemo(
    () => projectSpend(odds, latest, tickets, years),
    [odds, latest, tickets, years]
  )

  const [batch, setBatch] = useState(10)
  const strat = useMemo(
    () => drawStrategies(odds, latest, batch, price),
    [odds, latest, batch, price]
  )

  const uniform = uni.p > 0.05
  const evPerTicket = Math.round(odds.ev)
  const loss = plan.spend - plan.expectedReturn

  return (
    <div className="analytics">
      {rangeControl}

      <div className="price-row">
        <label className="lbl" htmlFor="price">ราคาหวยที่ซื้อจริง</label>
        <div className="price-field">
          <input
            id="price"
            type="number"
            min="1"
            max="10000"
            step="1"
            className="mono"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onBlur={() => setPriceInput(String(price))}
          />
          <span>บาท / ใบ</span>
        </div>
        <div className="chip-group">
          {[80, 100, 120, 150].map((p) => (
            <button
              key={p}
              className={'chip' + (price === p ? ' active' : '')}
              onClick={() => setPriceInput(String(p))}
            >
              {p}
              {p === FACE_PRICE ? ' (ราคาป้าย)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- headline: what a ticket is actually worth ---------- */}
      <Panel
        title="มูลค่าจริงของสลาก 1 ใบ"
        lede="คำนวณจากโครงสร้างรางวัลของงวดล่าสุด — เป็นตัวเลขที่ตายตัว ไม่ขึ้นกับว่าคุณเลือกเลขอะไร"
      >
        <div className="hero-row">
          <div className="hero">
            <div className="hero-pair">
              <div className="hero-part">
                <div className="hero-num paid">{price.toLocaleString('th-TH')}</div>
                <div className="hero-cap">จ่ายจริงต่อใบ</div>
              </div>
              <span className="hero-arrow" aria-hidden="true">→</span>
              <div className="hero-part">
                <div className="hero-num">{baht(evPerTicket)}</div>
                <div className="hero-cap">ได้กลับโดยเฉลี่ย — คงที่ ไม่ขึ้นกับราคาที่จ่าย</div>
              </div>
            </div>
          </div>
          <div className="tile-grid">
            <StatTile
              label="โอกาสถูกรางวัลใดก็ได้"
              value={pct(odds.pWin)}
              note={oneIn(odds.pWin) + ' ใบ'}
            />
            <StatTile
              label="โอกาสถูกรางวัลที่ 1"
              value={oneIn(latest.first.length / 1e6)}
              note="เท่ากันทุกเลข ทุกงวด"
            />
            <StatTile
              label={odds.rtp > 1 ? 'ส่วนที่ได้เปรียบ' : 'ส่วนที่ไม่กลับมาเป็นรางวัล'}
              value={pct(Math.abs(1 - odds.rtp), 0)}
              note={
                odds.rtp > 1
                  ? `กำไรเฉลี่ย ${baht(evPerTicket - price)} ต่อใบ`
                  : `ขาดทุนเฉลี่ย ${baht(price - evPerTicket)} ต่อใบ`
              }
            />
          </div>
        </div>

        <Meter
          value={odds.rtp}
          label={`อัตราจ่ายคืน เมื่อซื้อใบละ ${baht(price)}`}
          right={pct(odds.rtp, 0)}
        />
        <p className="fineprint">
          ราคาป้ายคือ {baht(FACE_PRICE)} แต่หน้าแผงมักขายแพงกว่า — เงินรางวัลไม่ได้เพิ่มตาม
          ทุกบาทที่จ่ายเกินจึงหายไปทั้งหมด ลองปรับตัวเลขดูว่าที่ซื้อจริงเหลืออัตราจ่ายคืนเท่าไร
        </p>

        <table className="odds-table">
          <thead>
            <tr>
              <th>รางวัล</th>
              <th className="num">โอกาส</th>
              <th className="num">เงินรางวัล</th>
              <th className="num">คิดเป็นมูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {odds.tiers.map((t) => (
              <tr key={t.label}>
                <td>{t.label}</td>
                <td className="num mono">{oneIn(t.p)}</td>
                <td className="num mono">{t.prize.toLocaleString('th-TH')}</td>
                <td className="num mono">{t.ev.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>รวม</td>
              <td className="num mono">{pct(odds.pWin)}</td>
              <td />
              <td className="num mono">{odds.ev.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* ---------- one draw: how many tickets, picked how ---------- */}
      <Panel
        title="งวดนี้ซื้อกี่ใบ แล้วเลือกเลขแบบไหน"
        lede="ซื้อเลขเดียวกันหลายใบ กับซื้อคนละเลข ให้ค่าเฉลี่ยเท่ากันเป๊ะ ต่างกันแค่รูปร่างของความเสี่ยง"
      >
        <div className="sliders">
          <label className="slider">
            <span>งวดนี้ซื้อ <b className="mono">{batch}</b> ใบ</span>
            <input
              type="range" min="1" max="100" value={batch}
              onChange={(e) => setBatch(Number(e.target.value))}
            />
          </label>
          <div className="batch-head">
            <StatTile label="จ่ายงวดนี้" value={baht(strat.spend)} />
            <StatTile
              label="มูลค่าคาดหมาย"
              value={baht(Math.round(strat.ev))}
              note="เท่ากันทั้งสองกลยุทธ์"
            />
          </div>
        </div>

        <table className="odds-table strat-table">
          <thead>
            <tr>
              <th></th>
              <th className="num">ซื้อคนละเลข ({batch} เลข)</th>
              <th className="num">เลขเดียวซ้ำ {batch} ใบ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>โอกาสไม่ได้อะไรเลย</td>
              <td className="num mono">{pct(strat.distinct.pNothing)}</td>
              <td className="num mono">{pct(strat.same.pNothing)}</td>
            </tr>
            <tr>
              <td>โอกาสได้รางวัลบ้าง</td>
              <td className="num mono">{pct(strat.distinct.pWin)}</td>
              <td className="num mono">{pct(strat.same.pWin)}</td>
            </tr>
            <tr>
              <td>โอกาสคุ้มทุนขึ้นไป</td>
              <td className="num mono">{pct(strat.distinct.pBreakEven)}</td>
              <td className="num mono">{pct(strat.same.pBreakEven)}</td>
            </tr>
            <tr>
              <td>โอกาสถูกรางวัลที่ 1</td>
              <td className="num mono">{oneIn(strat.distinct.pFirst)}</td>
              <td className="num mono">{oneIn(strat.same.pFirst)}</td>
            </tr>
            <tr>
              <td>ถ้าถูกรางวัลที่ 1 ได้เท่าไร</td>
              <td className="num mono">{baht(latest.first_p)}</td>
              <td className="num mono">{baht(latest.first_p * batch)}</td>
            </tr>
          </tbody>
        </table>

        <p className="fineprint">
          ซื้อคนละเลขคือกระจายความเสี่ยง — ได้รางวัลเล็กบ่อยขึ้น แต่รางวัลใหญ่ก็ได้แค่ชุดเดียว
          ซื้อเลขซ้ำคือรวมความเสี่ยง — โอกาสได้อะไรกลับมาเท่าเดิมกับซื้อใบเดียว
          ({pct(strat.same.pWin)}) แต่ถ้าถูกก็ได้เป็น {batch} เท่า
          ค่าเฉลี่ยระยะยาวของสองแบบนี้เท่ากันทุกบาท ไม่มีกลยุทธ์เลือกเลขไหนเอาชนะได้ ·
          ตัวเลข "คุ้มทุน" ของคอลัมน์ซ้ายมาจากการจำลอง 50,000 งวด (คลาดเคลื่อนราว ±0.05%)
          ที่เหลือคำนวณตรง
        </p>
      </Panel>

      {/* ---------- simulator ---------- */}
      <Panel
        title="ถ้าซื้อไปเรื่อย ๆ จะเป็นอย่างไร"
        lede={`ปีละ ${DRAWS_PER_YEAR} งวด ที่ราคา ${baht(price)} ต่อใบ — ลองปรับจำนวนใบและจำนวนปีดู`}
      >
        <div className="sliders">
          <label className="slider">
            <span>ซื้อครั้งละ <b className="mono">{tickets}</b> ใบ</span>
            <input
              type="range" min="1" max="20" value={tickets}
              onChange={(e) => setTickets(Number(e.target.value))}
            />
          </label>
          <label className="slider">
            <span>ต่อเนื่อง <b className="mono">{years}</b> ปี</span>
            <input
              type="range" min="1" max="50" value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="tile-grid four">
          <StatTile
            label="จ่ายไปทั้งหมด"
            value={baht(plan.spend)}
            note={`${plan.tickets.toLocaleString('th-TH')} ใบ`}
          />
          <StatTile
            label="คาดว่าได้คืน"
            value={baht(Math.round(plan.expectedReturn))}
            note={`ถูกรางวัลราว ${plan.expectedWins.toFixed(1)} ครั้ง`}
          />
          <StatTile
            label="คาดว่าหายไป"
            value={baht(Math.round(loss))}
            note={`เฉลี่ยปีละ ${baht(Math.round(loss / years))}`}
          />
          <StatTile
            label="โอกาสถูกรางวัลที่ 1 สักครั้ง"
            value={pct(plan.pAnyFirst, 3)}
            note={oneIn(plan.pAnyFirst)}
          />
        </div>
        <p className="fineprint">
          ตัวเลข "คาดว่าได้คืน" คือค่าเฉลี่ยระยะยาว ผลจริงของคนส่วนใหญ่จะต่ำกว่านี้
          เพราะรางวัลก้อนใหญ่กระจุกอยู่กับคนไม่กี่คน
        </p>
      </Panel>

      {/* ---------- uniformity ---------- */}
      <Panel
        title="เลขท้าย 2 ตัว ออกเท่ากันจริงไหม"
        lede={`นับว่าเลข 00–99 แต่ละตัวออกกี่ครั้งใน ${draws.length} งวด แล้วเทียบรูปร่างกับการแจกแจงทวินามที่การสุ่มล้วนควรให้`}
      >
        <div className="verdict-strip">
          <div>
            <span className="vs-label">χ² (df=99)</span>
            <span className="vs-value mono">{uni.chi2.toFixed(1)}</span>
          </div>
          <div>
            <span className="vs-label">p-value</span>
            <span className="vs-value mono">{uni.p.toFixed(3)}</span>
          </div>
          <div>
            <span className="vs-label">ค่าคาดหมายต่อเลข</span>
            <span className="vs-value mono">{uni.expected.toFixed(1)}</span>
          </div>
          <div className={'vs-badge' + (uniform ? '' : ' warn')}>
            {uniform ? 'สอดคล้องกับการสุ่มล้วน' : 'เบี่ยงเบนเกินเกณฑ์ p<0.05'}
          </div>
        </div>
        {uni.expected < 5 && (
          <p className="fineprint caveat">
            หมายเหตุ: การทดสอบไคสแควร์อยากให้แต่ละช่องมีค่าคาดหมายอย่างน้อย 5 ครั้ง
            (ต้องมีราว 500 งวด) ช่วงนี้ได้ {uni.expected.toFixed(1)} ครั้ง
            ค่า p จึงเป็นค่าประมาณ ยิ่งเลือกช่วงสั้นยิ่งอ่านเอาความหมายไม่ได้
          </p>
        )}

        <Legend items={FAIR} />
        <ColumnsVsExpected
          data={hits}
          xLabel="จำนวนครั้งที่เลขนั้นออก"
          yLabel="เลข"
        />
        <p className="fineprint">
          อ่านว่า: มีเลขอยู่กี่ตัว (จาก 100 ตัว) ที่ออกครบตามจำนวนครั้งในแกนนอน
          ถ้าเส้นกับแท่งซ้อนกันดี แปลว่า "เลขดัง" กับ "เลขเย็น" คือความผันผวนปกติของการสุ่ม
          ไม่ใช่รูปแบบที่เอาไปทำนายงวดหน้าได้
        </p>
      </Panel>

      {/* ---------- convergence ---------- */}
      <Panel
        title="ยิ่งงวดเยอะ ช่องว่างยิ่งแคบ"
        lede="แถบคือช่วง 90% กลางของความถี่เลข 100 ตัว (เปอร์เซ็นไทล์ที่ 5 ถึง 95) วัดเป็นสัดส่วนต่องวด สะสมตั้งแต่งวดแรกของชุดข้อมูล"
      >
        <ConvergenceBand data={band} reference={0.01} refLabel="1% — ค่าที่ควรเป็น" />
        <p className="fineprint">
          ช่วงแรกแถบกว้างมากจนดูเหมือนมี "เลขดัง" จริง ๆ แต่พอสะสมครบ {DRAWS.length} งวด
          แถบก็บีบเข้าหา 1% ตามกฎจำนวนมาก — นี่คือหน้าตาของการสุ่ม ไม่ใช่ของระบบที่มีเลขโปรด
          (ใช้เปอร์เซ็นไทล์แทนค่าสูงสุด–ต่ำสุด เพราะปลายสุดถูกครอบงำด้วยเลขไม่กี่ตัวที่บังเอิญยังไม่เคยออก)
        </p>
      </Panel>

      {/* ---------- gaps & droughts ---------- */}
      <Panel
        title="เลขที่ 'ไม่ออกนาน' แปลว่าใกล้จะออกหรือเปล่า"
        lede="ระยะห่างระหว่างการออกแต่ละครั้งของเลขท้าย 2 ตัว เทียบกับการแจกแจงเรขาคณิตของการสุ่มล้วน"
      >
        <Legend items={FAIR} />
        <ColumnsVsExpected
          data={gapHist}
          xLabel="ระยะห่าง (งวด)"
          yLabel="ครั้ง"
        />

        <div className="split">
          <div>
            <h4 className="sub-head">ไม่ออกนานที่สุดตอนนี้</h4>
            <ol className="rank mono">
              {gaps.droughts.slice(0, 6).map((d) => (
                <li key={d.v}>
                  <b>{pad2(d.v)}</b> — {d.seen ? `${d.drought} งวด` : 'ยังไม่เคยออกในช่วงนี้'}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="sub-head">ตัวเลขอ้างอิง</h4>
            <ul className="rank mono">
              <li>ระยะห่างเฉลี่ยที่วัดได้ — {gaps.meanGap.toFixed(1)} งวด</li>
              <li>ระยะห่างที่เคยยาวสุด — {gaps.maxGap} งวด</li>
              <li>ค่าคาดหมายทางทฤษฎี — 100 งวด</li>
            </ul>
          </div>
        </div>
        <p className="fineprint">
          การแจกแจงเรขาคณิตไม่มีความจำ: เลขที่หายไป 300 งวด มีโอกาสออกงวดหน้า 1%
          เท่ากับเลขที่เพิ่งออกเมื่องวดที่แล้วเป๊ะ ๆ ความรู้สึกว่า "ถึงคิวแล้ว" คือ gambler's fallacy ·
          หมายเหตุ: ช่วงข้อมูลมีจำกัด ระยะห่างยาว ๆ จึงถูกตัดปลาย
          ค่าเฉลี่ยที่วัดได้และแท่งขวาสุดจึงต่ำกว่าทฤษฎีเป็นปกติ
        </p>
      </Panel>

      {/* ---------- digit positions ---------- */}
      <Panel
        title="แต่ละหลักของรางวัลที่ 1"
        lede={`ความถี่ของเลข 0–9 ในแต่ละตำแหน่ง จาก ${digits.n} งวด — ค่าคาดหมายคือ ${digits.expected.toFixed(1)} ครั้งต่อช่อง`}
      >
        <HeatGrid
          rows={digits.rows}
          cols={Array.from({ length: 10 }, (_, i) => String(i))}
          colLabel="ครั้ง"
          rowLabel={(r) => `หลักที่ ${r.pos + 1}`}
          cell={(r, ri, ci) => `หลักที่ ${ri + 1} · เลข ${ci}`}
        />
        <ul className="chi-list">
          {digits.rows.map((r) => (
            <li key={r.pos}>
              <span>หลักที่ {r.pos + 1}</span>
              <span className="mono">χ² {r.chi2.toFixed(1)} · p {r.p.toFixed(3)}</span>
              <span className={'chi-tag' + (r.p > 0.05 ? '' : ' warn')}>
                {r.p > 0.05 ? 'ปกติ' : 'ควรดูเพิ่ม'}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mythbox">
        <h3>สรุปสั้น ๆ</h3>
        <p>
          ทุกแผนภูมิในหน้านี้ชี้ไปทางเดียวกัน — ผลหวยไทยมีพฤติกรรมเหมือนการสุ่มล้วน
          สถิติย้อนหลังบอก "อะไรเคยเกิด" ได้ดี แต่ไม่มีอำนาจทำนายงวดหน้าเลยสักนิด
          สิ่งเดียวที่พยากรณ์ได้แม่นยำคือ มูลค่าคาดหมายต่อใบ {baht(evPerTicket)} เทียบกับที่จ่ายจริง {baht(price)}
        </p>
        <p className="fineprint">
          เว็บนี้ทำเพื่อการศึกษาสถิติ ไม่ใช่เครื่องมือใบ้หวย และไม่สนับสนุนการพนันเกินตัว
        </p>
      </div>
    </div>
  )
}
