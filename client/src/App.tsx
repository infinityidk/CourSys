import { useState, useEffect } from 'react'
import Login from './views/Login'
import GradesView from './views/GradesView'
import ScheduleView from './views/ScheduleView'
import { formatSemester } from './utils'
import type { ScheduleCourse, GradeItem } from './types'

export default function App() {
  const [auth, setAuth] = useState(false)
  const [tab, setTab] = useState<'grades' | 'schedule'>('grades')
  const [grades, setGrades] = useState<GradeItem[]>([])
  const [schedule, setSchedule] = useState<ScheduleCourse[]>([])
  const [sem, setSem] = useState('')
  const [loading, setLoading] = useState(false)

  const sync = async (target: 'grades' | 'all') => {
    setLoading(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/sync/${target}`)
      const json = await res.json()

      if (res.ok && json.status === 1) {
        if (target === 'grades') {
          setGrades(json.data)
        } else {
          setSchedule(json.data)
          setSem(json.semester)
        }
      } else {
        alert(json.detail || '同步失败，请重试')
      }
    } catch {
      alert('服务器连接中断')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth && grades.length === 0) sync('grades')
  }, [auth])

  if (!auth) return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans">
      <Login onLogin={() => setAuth(true)} />
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-zinc-300 p-8 font-sans selection:bg-blue-500/30">
      <header className="max-w-[100rem] mx-auto flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div className="space-y-1">
          <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase leading-none">CourSys</h1>
          <p className="text-blue-500 font-mono text-xs font-bold tracking-[0.2em] uppercase pl-1">
            {tab === 'schedule' ? (sem ? formatSemester(sem) : 'WAITING FOR SYNC...') : 'ACADEMIC TRANSCRIPT'}
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setTab('grades')}
              className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${tab === 'grades' ? 'bg-zinc-950 text-white shadow-lg ring-1 ring-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              成绩单
            </button>
            <button
              onClick={() => setTab('schedule')}
              className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${tab === 'schedule' ? 'bg-zinc-950 text-white shadow-lg ring-1 ring-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              选课表
            </button>
          </div>

          <button
            disabled={loading}
            onClick={() => sync(tab === 'grades' ? 'grades' : 'all')}
            className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? 'SYNCING...' : '同步数据'}
          </button>
        </div>
      </header>

      <main className="max-w-[100rem] mx-auto pb-20 animate-fade-in-up">
        {tab === 'grades'
          ? <GradesView data={grades} />
          : <ScheduleView data={schedule} />
        }
      </main>
    </div>
  )
}