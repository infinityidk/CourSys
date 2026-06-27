import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from './api'
import { useStore } from './store'
import Login from './pages/Login'
import Home from './pages/Home'
import Grades from './pages/Grades'
import Timetable from './pages/Timetable'
import Catalog from './pages/Catalog'
import UpdateBanner from './UpdateBanner'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })

const TAB_NAMES: Record<string, string> = { home: '首页', timetable: '我的课表', grades: '成绩单', schedule: '全校开课 / 排课' }

function AppShell() {
  const { tab, setTab, setSemester, setUser } = useStore()
  const [appState, setAppState] = useState<'gate' | 'login' | 'loading' | 'app'>('gate')

  // Search & Filter state lifted for Schedule tab
  const [globalSearch, setGlobalSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/meta'), api.get('/user/info')])
      .then(([m, u]) => {
        setSemester(m.data.current_semester)
        setUser(u.data)
        const savedTab = localStorage.getItem('coursys_tab')
        if (savedTab && TAB_NAMES[savedTab]) setTab(savedTab)
        setAppState('app')
      })
      .catch(() => setAppState('login'))

    const t = setInterval(() => api.post('/online').catch(() => { }), 290000)
    return () => clearInterval(t)
  }, [])

  const handleLogin = () => {
    setAppState('loading')
    Promise.all([api.get('/meta'), api.get('/user/info')])
      .then(([m, u]) => {
        setSemester(m.data.current_semester)
        setUser(u.data)
        setAppState('app')
      })
      .catch(() => setAppState('login'))
  }

  // Gate / Loading splash
  if (appState === 'gate' || appState === 'loading') return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase animate-pulse">CourSys</h1>
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase">
            {appState === 'gate' ? 'Initializing...' : 'Syncing Data...'}
          </span>
        </div>
      </div>
    </div>
  )

  // Login
  if (appState === 'login') return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans">
      <Login onLogin={handleLogin} />
    </div>
  )

  // Main App
  return (
    <div className="h-screen bg-black text-zinc-300 p-6 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      <UpdateBanner />
      <header className="flex-none flex flex-col xl:flex-row justify-between items-end xl:items-center mb-6 gap-6">
        {/* Left: Logo */}
        <div className="shrink-0">
          <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none">CourSys</h1>
        </div>

        {/* Middle: Search & Filter (Schedule tab only) */}
        {tab === 'schedule' && (
          <div className="flex-1 w-full max-w-2xl flex gap-4 animate-fade-in-up">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 hover:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-bold text-xs"
                placeholder="搜索课程代码、名称或教师 (Ctrl+F)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                id="global-search-input"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`px-6 py-3 rounded-2xl font-black text-xs border transition-all flex items-center gap-2 ${showFilter ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              筛选
            </button>
          </div>
        )}

        {/* Right: Semester Selector & Tabs */}
        <div className="flex items-center gap-3 shrink-0">
          <div id="semester-selector" className="empty:hidden" />
          <div className="flex gap-2 shrink-0">
            {(['home', 'timetable', 'grades', 'schedule'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 rounded-2xl font-black text-xs border transition-all ${tab === t
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                  }`}
              >
                {TAB_NAMES[t]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative animate-fade-in-up">
        {tab === 'home' && <Home />}
        {tab === 'grades' && <Grades />}
        {tab === 'schedule' && <Catalog searchTerm={globalSearch} showFilters={showFilter} />}
        {tab === 'timetable' && <Timetable />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppShell />
    </QueryClientProvider>
  )
}