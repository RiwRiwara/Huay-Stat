import { useState } from 'react'
import Check from './views/Check.jsx'
import Stats from './views/Stats.jsx'
import Analytics from './views/Analytics.jsx'
import History from './views/History.jsx'
import { DRAWS, thaiDate } from './data/index.js'

const VIEWS = {
  check: { label: 'ตรวจหวย', el: Check },
  stats: { label: 'สถิติ', el: Stats },
  analytics: { label: 'วิเคราะห์', el: Analytics },
  history: { label: 'ย้อนหลัง', el: History },
}

export default function App() {
  const [view, setView] = useState('check')
  const Active = VIEWS[view].el

  return (
    <div className="app">
      <header>
        <div className="brand">
          <h1>หวยสถิติ</h1>
          <span className="sub">
            {DRAWS.length} งวด · ล่าสุด {thaiDate(DRAWS[0].date)} · client-side only
          </span>
        </div>
        <nav>
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={key === view ? 'active' : ''} onClick={() => setView(key)}>
              {v.label}
            </button>
          ))}
        </nav>
      </header>

      <Active />

      <footer>
        <span>
          ข้อมูล: GLO Open Data (สำนักงานสลากกินแบ่งรัฐบาล) · เพื่อการศึกษาสถิติ
          ไม่ใช่เครื่องมือใบ้หวย · ไม่เก็บข้อมูลผู้ใช้
        </span>
        <span className="mono">AIONEDAY</span>
      </footer>
    </div>
  )
}
