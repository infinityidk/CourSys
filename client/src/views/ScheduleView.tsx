import { formatSlot, formatEra, translateKind, translateOption } from '../utils'
import type { ScheduleCourse, Task } from '../types'
import { useState, useMemo } from 'react'
const COLORS: Record<string, string> = {
  "1": "text-emerald-400 border-emerald-900 bg-emerald-950/30",
  "2": "text-cyan-400 border-cyan-900 bg-cyan-950/30",
  "3": "text-violet-400 border-violet-900 bg-violet-950/30",
  "4": "text-rose-400 border-rose-900 bg-rose-950/30",
  "G": "text-amber-400 border-amber-900 bg-amber-950/30",
  "O": "text-zinc-400 border-zinc-700 bg-zinc-900"
}
export default function ScheduleView({ data }: { data: ScheduleCourse[] }) {
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return data
    return data.reduce<ScheduleCourse[]>((res, c) => {
      const courseMatch = c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
      let teacherMatch = false
      const filteredTasks = c.tasks?.map(t => {
        const tMatch = t.teacher.toLowerCase().includes(term)
        if (tMatch) teacherMatch = true
        const opts = t.options.filter(o => {
          const oMatch = o.teacher?.toLowerCase().includes(term) ?? false
          if (oMatch) teacherMatch = true
          return tMatch || oMatch
        })
        return opts.length ? { ...t, options: opts } : null
      }).filter((t): t is Task => t !== null) ?? []
      if (courseMatch || teacherMatch) {
        res.push(courseMatch || c.status ? c : { ...c, tasks: filteredTasks })
      }
      return res
    }, [])
  }, [data, searchTerm])
  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            className="w-full max-w-xl pl-12 pr-4 py-3.5 bg-zinc-900/80 border border-zinc-700/80 rounded-2xl text-white placeholder-zinc-500 hover:border-zinc-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            placeholder="搜索课程代码、名称或教师（按回车搜索）"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTerm(searchInput.trim()) } }}
          />
        </div>
      </div>
      <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 pb-20">
        {filteredData.map((c, i) => {
          const done = c.status === 'completed'
          const studying = c.status === 'studying'
          return (
            <div key={`${c.code}-${i}`} className={`break-inside-avoid border-2 rounded-3xl overflow-hidden shadow-2xl transition-all ${done ? "bg-zinc-950 border-amber-600/40 shadow-amber-900/10" : studying ? "bg-zinc-950 border-blue-600/40 shadow-blue-900/10" : "bg-zinc-950 border-zinc-900"}`}>
              <div className={`p-5 flex flex-col gap-3 ${done ? "bg-amber-900/5 border-b border-amber-900/20" : studying ? "bg-blue-900/5 border-b border-blue-900/20" : "bg-zinc-900/50 border-b border-zinc-900"}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black border rounded uppercase tracking-wider ${COLORS[c.era] || COLORS["O"]}`}>{formatEra(c.era)}</span>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">{c.category}</span>
                      {done ? <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-wider">已修读</span> : studying ? <span className="px-2 py-0.5 bg-blue-500 text-black text-[10px] font-black rounded uppercase tracking-wider">修读中</span> :
                        <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">{c.type}</span>}
                    </div>
                    <h2 className={`text-xl font-black leading-tight tracking-tight ${done ? studying ? "text-blue-100" : "text-amber-100" : "text-white"}`}>{c.name}</h2>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <div className={`text-4xl font-black italic leading-none ${done ? "text-amber-500" : studying ? "text-blue-500" : "text-white"}`}>{done ? c.grade : c.credits}</div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      {done ? <span className="text-amber-200/60">{c.score} | {c.credits} 学分</span> : "学分"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide">
                  <span className={done ? "text-amber-700/70 font-mono" : "text-blue-600 font-mono"}>{c.code}</span>
                  <span className="text-zinc-700">/</span>
                  <span className="text-zinc-500">{c.dept}</span>
                  {!done && !studying && c.target && <span className="ml-auto text-amber-500 border border-amber-900/50 bg-amber-950/30 px-1.5 rounded">{c.target}</span>}
                </div>
              </div>
              {!done && !studying && (
                <>
                  {c.req && <div className="px-5 py-2 bg-blue-950/20 border-b border-blue-900/10"><p className="text-[10px] text-blue-300/80 font-medium leading-relaxed line-clamp-3" title={c.req}><span className="font-black text-blue-500 mr-1">REQ:</span>{c.req}</p></div>}
                  <div className="p-2 space-y-2">
                    {c.tasks && c.tasks.map((t, j) => (
                      <div key={`${t.className}-${j}`} className="bg-zinc-900 rounded-2xl border border-zinc-800/60 p-3">
                        <div className="flex items-center gap-2 mb-3 px-1"><div className="w-1 h-4 bg-blue-600 rounded-full" /><h3 className="text-xs font-bold text-zinc-200">{t.className}</h3><span className="text-[10px] text-zinc-500">{t.teacher}</span></div>
                        <div className="flex flex-col gap-2">
                          {t.options.map((opt, k) => (
                            <button key={`${opt.name}-${k}`} className="group flex flex-col bg-black/40 border border-zinc-800/50 hover:bg-zinc-800 hover:border-blue-500/30 rounded-xl p-3 transition-all text-left">
                              <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-300 group-hover:text-blue-400 transition-colors">
                                    {translateOption(opt.name)}
                                  </span>
                                  {opt.teacher && (<span className="text-[10px] text-zinc-500">{opt.teacher}</span>)}
                                </div>
                                <div className="flex gap-2 text-[9px] font-mono text-zinc-600"><span className={Number(opt.capacity) <= 0 ? "text-red-500" : ""}>容:{opt.capacity}</span><span className="text-zinc-700">|</span><span>座:{opt.seats}</span></div>
                              </div>
                              <div className="space-y-1.5 w-full">
                                {opt.slots.map((s, l) => (
                                  <div key={l} className="flex gap-2 items-start text-[10px] leading-snug">
                                    <span className={`px-1.5 py-px rounded-[3px] text-[9px] font-black shrink-0 ${s.kind === 'LAB' ? 'bg-amber-950 text-amber-500 border border-amber-900/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{translateKind(s.kind)}</span>
                                    <span className={`font-medium ${s.kind === 'LAB' ? 'text-amber-100/80' : 'text-zinc-400'} group-hover:text-zinc-200 transition-colors`}>{formatSlot(s)}</span>
                                  </div>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}