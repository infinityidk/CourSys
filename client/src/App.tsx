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
  const [appState, setAppState] = useState<'gate' | 'login' | 'wait' | 'app'>('gate')
  const [tab, setTab] = useState('home')
  const [info, setInfo] = useState<any>(null)
  const [grades, setGrades] = useState<GradeItem[]>([])
  const [timetable, setTimetable] = useState<{ semester: string, data: TimetableCourse[] }>({ semester: '', data: [] })
  const [schedule, setSchedule] = useState<{ semester: string, data: ScheduleCourse[] }>({ semester: '', data: [] })
  const [timestamp, setTimestamp] = useState<string | null>(null)
  useEffect(() => {
    localStorage.removeItem(KEY_DATA)
    fetch('http://127.0.0.1:8000/session/check')
      .then(r => r.ok ? setAppState('wait') : (localStorage.removeItem(KEY_TAB), setAppState('login')))
      .catch(() => (localStorage.removeItem(KEY_TAB), setAppState('login')))
  }, [])
  useEffect(() => {
    if (appState !== 'wait') return
    fetch('http://127.0.0.1:8000/sync')
      .then(res => {
        if (!res.ok) throw new Error('Sync failed')
        return res.json()
      })
      .then(json => {
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
        const savedTab = localStorage.getItem(KEY_TAB)
        if (savedTab) setTab(savedTab)
        setAppState('app')
      })
      .catch(() => {
        localStorage.removeItem(KEY_TAB)
        setAppState('login')
      })
  }, [appState])
  const switchTab = (t: string) => { setTab(t); localStorage.setItem(KEY_TAB, t) }
  const getSubtitle = () => {
    if (tab === 'home') return '欢迎使用 COURSYS'
    if (tab === 'grades') return '已修课程成绩'
    if (tab === 'schedule') return schedule.semester ? formatSemester(schedule.semester) : ''
    if (tab === 'timetable') return timetable.semester ? formatSemester(timetable.semester) : ''
    return ''
  }
  switch (appState) {
    case 'gate':
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase">CourSys</h1>
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
              <span>正在检查登录状态...</span>
            </div>
          </div>
        </div>
      )
    case 'login':
      return (
        <div className="min-h-screen bg-black flex items-center justify-center font-sans">
          <Login onLogin={() => setAppState('wait')} />
        </div>
      )
    case 'wait':
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase">CourSys</h1>
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
              <span>正在同步数据...</span>
            </div>
          </div>
        </div>
      )
    case 'app':
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
}