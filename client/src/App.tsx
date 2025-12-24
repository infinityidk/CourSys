import { useState, useEffect } from 'react'
import Login from './views/Login'
import HomeView from './views/HomeView'
import GradesView from './views/GradesView'
import ScheduleView from './views/ScheduleView'
import TimetableView from './views/TimetableView'
import { formatSemester } from './utils'
import type { ScheduleCourse, GradeItem, TimetableCourse } from './types'
const KEY_DATA = 'coursys_data'
const KEY_TAB = 'coursys_tab'
const TAB_NAMES: Record<string, string> = { home: '首页', timetable: '课程表', grades: '成绩单', schedule: '全校课表' }
export default function App() {
  const [auth, setAuth] = useState(false)
  const [tab, setTab] = useState('home')
  const [info, setInfo] = useState<any>(null)
  const [grades, setGrades] = useState<GradeItem[]>([])
  const [timetable, setTimetable] = useState<{ semester: string, data: TimetableCourse[] }>({ semester: '', data: [] })
  const [schedule, setSchedule] = useState<{ semester: string, data: ScheduleCourse[] }>({ semester: '', data: [] })
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const sync = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/sync')
      const json = await res.json()
      if (res.ok && json.status === 1) {
        setInfo(json.info)
        setGrades(json.grades)
        setTimetable(json.timetable)
        setSchedule(json.schedule)
        setTimestamp(json.timestamp)
        localStorage.setItem(KEY_DATA, JSON.stringify({
          info: json.info,
          grades: json.grades,
          timetable: json.timetable,
          schedule: json.schedule,
          timestamp: json.timestamp,
          storageTimestamp: Date.now()
        }))
      } else if (res.status === 401) setAuth(false)
    } catch { }
  }
  useEffect(() => {
    const cached = localStorage.getItem(KEY_DATA)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        setInfo(d.info); setGrades(d.grades); setTimetable(d.timetable); setSchedule(d.schedule); setTimestamp(d.timestamp)
        const lastTab = localStorage.getItem(KEY_TAB)
        if (lastTab) setTab(lastTab)
      } catch { localStorage.removeItem(KEY_DATA) }
    }
    fetch('http://127.0.0.1:8000/session/check').then(r => {
      if (r.ok) { setAuth(true); sync() } else setAuth(false)
    }).catch(() => setAuth(false))
  }, [])
  const switchTab = (t: string) => { setTab(t); localStorage.setItem(KEY_TAB, t) }
  const getSubtitle = () => {
    if (tab === 'home') return '欢迎使用 COURSYS'
    if (tab === 'grades') return '已修课程成绩'
    if (tab === 'schedule') return schedule.semester ? formatSemester(schedule.semester) : ''
    if (tab === 'timetable') return timetable.semester ? formatSemester(timetable.semester) : ''
    return ''
  }
  if (!auth) return <div className="min-h-screen bg-black flex items-center justify-center font-sans"><Login onLogin={() => { setAuth(true); sync(); }} /></div>
  return (
    <div className="min-h-screen bg-black text-zinc-300 p-8 font-sans selection:bg-blue-500/30">
      <header className="max-w-[100rem] mx-auto flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div className="space-y-1">
          <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase leading-none">CourSys</h1>
          <p className="text-blue-500 font-mono text-xs font-bold tracking-[0.2em] uppercase pl-1">{getSubtitle()}</p>
        </div>
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
          {['home', 'timetable', 'grades', 'schedule'].map(t => (
            <button key={t} onClick={() => switchTab(t)} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${tab === t ? 'bg-zinc-950 text-white shadow-lg ring-1 ring-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {TAB_NAMES[t]}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-[100rem] mx-auto pb-20 animate-fade-in-up">
        {tab === 'home' && <HomeView info={info} lastUpdate={timestamp} />}
        {tab === 'grades' && <GradesView data={grades} />}
        {tab === 'schedule' && <ScheduleView data={schedule.data} />}
        {tab === 'timetable' && <TimetableView data={timetable.data} />}
      </main>
    </div>
  )
}