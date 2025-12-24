import { useState } from 'react'
import type { StudentInfo } from '../types'
export default function HomeView({ info, lastUpdate }: { info: StudentInfo | null, lastUpdate: string | null }) {
  const [clearing, setClearing] = useState(false)
  const handleClearCache = async () => {
    if (!confirm('确定重置依赖树缓存？')) return
    setClearing(true)
    try {
      await fetch('http://127.0.0.1:8000/cache/logic', { method: 'DELETE' })
      window.location.reload()
    } catch { setClearing(false) }
  }
  if (!info) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-40 bg-zinc-900/50 rounded-3xl border border-zinc-900" />
      ))}
    </div>
  )
  const items = [
    { k: '年级', v: info.grade, c: 'text-blue-500' },
    { k: '层次', v: info.level === '1' ? '本科生' : info.level === '2' ? '研究生' : '未知', c: 'text-emerald-500' },
    { k: '院系', v: info.department, c: 'text-violet-500' },
    { k: '专业', v: info.major, c: 'text-amber-500' }
  ]
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-800 transition-all group">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] group-hover:text-zinc-500 transition-colors">
              {item.k}
            </div>
            <div className={`text-3xl font-black tracking-tight ${item.c}`}>
              {item.v || "—"}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 p-10 rounded-[3rem] bg-zinc-900/30 border border-zinc-800/50 flex flex-col justify-center items-center text-center space-y-4">
          <h2 className="text-2xl font-black text-white italic">想要排课？</h2>
          <p className="text-zinc-500 font-mono text-xs max-w-lg leading-relaxed">
            全校课程数据已同步。可切换至“全校课表”查询课程，或在“成绩单”查看历史学业表现。
          </p>
        </div>
        <div className="p-8 rounded-[3rem] bg-zinc-950 border border-zinc-900 flex flex-col justify-between gap-6 min-w-[300px]">
          <div className="space-y-2">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">系统维护</div>
            <div className="text-xs font-mono text-zinc-400">
              上次更新: <span className="text-zinc-200">{lastUpdate ? lastUpdate : '从未'}</span>
            </div>
          </div>
          <button
            disabled={clearing}
            onClick={handleClearCache}
            className="w-full py-4 rounded-2xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-black uppercase hover:bg-red-900/40 hover:border-red-500/50 transition-all active:scale-95 disabled:opacity-50">
            {clearing ? '正在重置...' : '重置依赖树缓存'}
          </button>
        </div>
      </div>
    </div>
  )
}