import { formatSlot, formatEra, translateKind, translateOption, formatSemester } from '../utils'
import type { ScheduleCourse, Task } from '../types'
import { useState, useMemo } from 'react'
const COLORS: Record<string, string> = {
  "1": "text-emerald-400 border-emerald-900 bg-emerald-950/30",
  "2": "text-cyan-400 border-cyan-900 bg-cyan-950/30",
  "3": "text-violet-400 border-violet-900 bg-violet-950/30",
  "4": "text-rose-400 border-rose-900 bg-rose-950/30",
  "5": "text-white-400 border-white-900 bg-white-950/30",
  "G": "text-amber-400 border-amber-900 bg-amber-950/30",
  "O": "text-zinc-400 border-zinc-700 bg-zinc-900"
}
const PERIOD_MAP: Record<string, number[]> = {
  "1-2": [1, 2], "3-4": [3, 4], "5-6": [5, 6], "7-8": [7, 8], "9-10": [9, 10], "11": [11]
}
export default function ScheduleView({ data }: { data: ScheduleCourse[] }) {
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [hideForbidden, setHideForbidden] = useState(false)
  const [hideMissing, setHideMissing] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [hideStudying, setHideStudying] = useState(false)
  const [selDepts, setSelDepts] = useState<string[]>([])
  const [selCats, setSelCats] = useState<string[]>([])
  const [selTypes, setSelTypes] = useState<string[]>([])
  const [selEras, setSelEras] = useState<string[]>([])
  const [selCredits, setSelCredits] = useState<string[]>([])
  const [selDays, setSelDays] = useState<number[]>([])
  const [selPeriods, setSelPeriods] = useState<string[]>([])
  const options = useMemo(() => {
    const d = new Set<string>(), c = new Set<string>(), t = new Set<string>(), e = new Set<string>(), cr = new Set<string>()
    data.forEach(item => {
      if (item.dept) d.add(item.dept)
      if (item.category) c.add(item.category)
      if (item.type) t.add(item.type)
      if (item.era) e.add(item.era)
      if (item.credits) cr.add(item.credits)
    })
    return {
      depts: Array.from(d).sort(), cats: Array.from(c).sort(),
      types: Array.from(t).sort(), eras: Array.from(e).sort(), credits: Array.from(cr).sort((a, b) => Number(a) - Number(b))
    }
  }, [data])
  const toggle = <T,>(set: Set<T>, val: T) => {
    const newSet = new Set(set); newSet.has(val) ? newSet.delete(val) : newSet.add(val); return Array.from(newSet)
  }
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    const depts = new Set(selDepts), cats = new Set(selCats), types = new Set(selTypes), eras = new Set(selEras), creds = new Set(selCredits)
    const days = new Set(selDays)
    const periods = new Set(selPeriods.flatMap(p => PERIOD_MAP[p]))
    return data.reduce<ScheduleCourse[]>((res, c) => {
      if (hideCompleted && c.status === 'completed') return res
      if (hideStudying && c.status === 'studying') return res
      if (hideForbidden && c.forbidden) return res
      if (hideMissing && c.missing?.length) return res
      if (depts.size && !depts.has(c.dept)) return res
      if (cats.size && !cats.has(c.category)) return res
      if (types.size && (!c.type || !types.has(c.type))) return res
      if (eras.size && !eras.has(c.era)) return res
      if (creds.size && !creds.has(c.credits)) return res
      const courseMatch = !term || c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
      let teacherMatch = false
      const filteredTasks = c.tasks?.map(t => {
        if (hideForbidden && t.forbidden) return null
        const tMatch = t.teacher.toLowerCase().includes(term)
        if (tMatch) teacherMatch = true
        const validOptions = t.options.filter(o => {
          if (days.size > 0 || periods.size > 0) {
            const timeSubset = o.slots.every(s =>
              (days.size === 0 || days.has(s.day)) &&
              (periods.size === 0 || (s.periods[0] === s.periods[1] ? periods.has(s.periods[0]) :
                Array.from({ length: s.periods[1] - s.periods[0] + 1 }, (_, i) => s.periods[0] + i).every(p => periods.has(p))))
            )
            if (!timeSubset) return false
          }
          const oMatch = !term || courseMatch || tMatch || (o.teacher?.toLowerCase().includes(term) ?? false)
          if (oMatch) teacherMatch = true
          return oMatch
        })
        return validOptions.length ? { ...t, options: validOptions } : null
      }).filter((t): t is Task => t !== null) ?? []
      if (courseMatch || teacherMatch) {
        if (!c.tasks || filteredTasks.length > 0 || c.status) {
          res.push(c.status ? c : { ...c, tasks: filteredTasks })
        }
      }
      return res
    }, [])
  }, [data, searchTerm, hideForbidden, hideMissing, hideCompleted, hideStudying, selDepts, selCats, selTypes, selEras, selCredits, selDays, selPeriods])
  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/80 border border-zinc-700/80 rounded-2xl text-white placeholder-zinc-500 hover:border-zinc-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              placeholder="搜索课程代码、名称或教师"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTerm(searchInput.trim()) } }}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`px-6 rounded-2xl font-bold border transition-all ${showFilters ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"}`}>
            筛选
          </button>
        </div>
        {showFilters && (
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-3xl p-6 space-y-6 animate-fade-in-up shadow-xl">
            <div className="flex flex-wrap gap-4 pb-4 border-b border-zinc-900">
              {[
                { l: "隐藏不可选", v: hideForbidden, s: setHideForbidden },
                { l: "隐藏先修未满", v: hideMissing, s: setHideMissing },
                { l: "隐藏已修读", v: hideCompleted, s: setHideCompleted },
                { l: "隐藏修读中", v: hideStudying, s: setHideStudying },
              ].map(f => (
                <button key={f.l} onClick={() => f.s(!f.v)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${f.v ? "bg-blue-500 border-blue-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                  {f.l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">时间可用性 (全选代表无限制)</div>
                  <div className="flex gap-2">
                    {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => (
                      <button key={d} onClick={() => setSelDays(toggle(new Set(selDays), i + 1))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selDays.includes(i + 1) ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {Object.keys(PERIOD_MAP).map(p => (
                      <button key={p} onClick={() => setSelPeriods(toggle(new Set(selPeriods), p))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selPeriods.includes(p) ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  { k: "年级", opt: options.eras, v: selEras, s: setSelEras, fmt: formatEra },
                  { k: "性质", opt: options.types, v: selTypes, s: setSelTypes },
                  { k: "类别", opt: options.cats, v: selCats, s: setSelCats },
                  { k: "学分", opt: options.credits, v: selCredits, s: setSelCredits },
                ].map(g => (
                  <div key={g.k} className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{g.k}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.opt.map(o => (
                        <button key={o} onClick={() => g.s(toggle(new Set(g.v), o))} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${g.v.includes(o) ? "bg-zinc-200 text-black border-zinc-200" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>
                          {g.fmt ? g.fmt(o) : o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">开课院系</div>
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto content-start pr-2 custom-scrollbar">
                  {options.depts.map(d => (
                    <button key={d} onClick={() => setSelDepts(toggle(new Set(selDepts), d))} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-left ${selDepts.includes(d) ? "bg-blue-900/30 text-blue-400 border-blue-500/50" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 pb-20">
        {filteredData.map((c, i) => {
          const done = c.status === 'completed'
          const studying = c.status === 'studying'
          const isAccessDenied = !!c.forbidden
          return (
            <div key={`${c.code}-${i}`} className={`break-inside-avoid border-2 rounded-3xl overflow-hidden shadow-2xl transition-all ${done ? "bg-zinc-950 border-amber-600/40 shadow-amber-900/10"
              : studying ? "bg-zinc-950 border-blue-600/40 shadow-blue-900/10"
                : isAccessDenied ? "bg-red-950/20 border-red-600/40 shadow-red-900/10"
                  : "bg-zinc-950 border-zinc-900"
              }`}>
              <div className={`p-5 flex flex-col gap-3 ${done ? "bg-amber-900/5 border-b border-amber-900/20"
                : studying ? "bg-blue-900/5 border-b border-blue-900/20"
                  : isAccessDenied ? "bg-red-900/10 border-b border-red-900/20"
                    : "bg-zinc-900/50 border-b border-zinc-900"
                }`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black border rounded uppercase tracking-wider ${COLORS[c.era] || COLORS["O"]}`}>{formatEra(c.era)}</span>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">{c.category}</span>
                      {done ? <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-wider">已修读</span> : studying ? <span className="px-2 py-0.5 bg-blue-500 text-black text-[10px] font-black rounded uppercase tracking-wider">修读中</span> :
                        c.type ? <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">{c.type}</span> : null}
                    </div>
                    <h2 className={`text-xl font-black leading-tight tracking-tight ${done ? studying ? "text-blue-100" : "text-amber-100" : "text-white"}`}>{c.name}</h2>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <div className={`text-4xl font-black italic leading-none ${done ? "text-amber-500" : studying ? "text-blue-500" : "text-white"}`}>{done ? c.grade : c.credits}</div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      {done ? (
                        <>
                          <span className="text-amber-200/60">{c.score} | {c.credits} 学分</span>
                          <div className="text-[8px] text-amber-700/70 mt-0.5 font-mono">
                            {c.semester && formatSemester(c.semester)}
                          </div>
                        </>
                      ) : "学分"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide">
                  <span className={done ? "text-amber-700/70 font-mono" : "text-blue-600 font-mono"}>{c.code}</span>
                  <span className="text-zinc-700">/</span>
                  <span className="text-zinc-500">{c.dept}</span>
                  <div className="ml-auto flex items-center gap-3">
                    <a href={`https://ncesnext.com/search/?q=${c.code}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors group/link" title="NCES 评教">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      <span className="group-hover/link">NCES</span>
                    </a>
                    {c.courseId && (
                      <a href={`http://127.0.0.1:8000/syllabus/${c.courseId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors group/link" title="教学大纲">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <span className="group-hover/link">大纲</span>
                      </a>
                    )}
                  </div>
                </div>
                {(c.missing?.length || c.pending?.length) && (
                  <div className="mt-2 pt-3 border-t border-dashed border-zinc-700/30 space-y-3">
                    {!!c.missing?.length && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-wider flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          未修读
                        </div>
                        <div className="flex flex-col gap-1.5 pl-1">
                          {c.missing.map((group, idx) => (
                            <div key={idx} className="text-[10px] text-red-300/80 font-mono leading-tight flex items-start">
                              <span className="mr-2 text-red-500/40 select-none">•</span>
                              <span>
                                {group.map(item => `${item.code} ${item.name}`).join(' | ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!!c.pending?.length && (
                      <div className="text-[10px] text-emerald-500 font-medium">
                        <span className="font-black mr-1">修读中:</span>
                        {c.pending.map((item) => `${item.code} ${item.name}`).join(" & ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!done && !studying && (
                <div className="p-2 space-y-2">
                  {c.tasks && c.tasks.map((t, j) => (
                    <div key={`${t.className}-${j}`} className={`rounded-2xl border p-3 ${t.forbidden ? "bg-red-950/10 border-red-500/20 opacity-75" : "bg-zinc-900 border-zinc-800/60"}`}>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-1 h-4 rounded-full ${t.forbidden ? "bg-red-600" : "bg-blue-600"}`} />
                          <h3 className={`text-xs font-bold ${t.forbidden ? "text-red-200" : "text-zinc-200"}`}>{t.className}</h3>
                          <span className="text-[10px] text-zinc-500">{t.teacher}</span>
                        </div>
                        {t.forbidden && <span className="text-[9px] font-black bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">不可选择</span>}
                      </div>
                      {t.info && <div className="mb-2 px-1 text-[9px] font-mono text-blue-400 leading-relaxed"><span className="font-black mr-1">公告:</span>{t.info}
                      </div>}
                      {t.forbidden && (t.allowedTarget || t.deniedTarget) && (
                        <div className="mb-3 px-1 text-[9px] font-mono leading-tight">
                          {t.allowedTarget && <div className="text-zinc-500"><span className="text-red-400 mr-1">面向:</span>{t.allowedTarget}</div>}
                          {t.deniedTarget && <div className="text-zinc-500"><span className="text-red-400 mr-1">禁止:</span>{t.deniedTarget}</div>}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        {t.options.map((opt, k) => opt.slots.length > 0 && (
                          <button key={`${opt.name}-${k}`} disabled={t.forbidden} className={`group flex flex-col border rounded-xl p-3 transition-all text-left ${t.forbidden ? "bg-transparent border-red-900/20 cursor-not-allowed" : "bg-black/40 border-zinc-800/50 hover:bg-zinc-800 hover:border-blue-500/30"}`}>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-800/50">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold transition-colors ${t.forbidden ? "text-zinc-500" : "text-zinc-300 group-hover:text-blue-400"}`}>
                                  {translateOption(opt.name)}
                                </span>
                                {opt.teacher && (<span className="text-[10px] text-zinc-500">{opt.teacher}</span>)}
                              </div>
                              <div className="flex gap-2 text-[9px] font-mono text-zinc-600"><span className={Number(opt.capacity) <= 0 ? "text-red-500" : ""}>容量:{opt.capacity}</span><span className="text-zinc-700">|</span><span>座位:{opt.seats}</span></div>
                            </div>
                            <div className="space-y-1.5 w-full">
                              {opt.slots.map((s, l) => (
                                <div key={l} className="flex gap-2 items-start text-[10px] leading-snug">
                                  <span className={`px-1.5 py-px rounded-[3px] text-[9px] font-black shrink-0 ${s.kind === 'LAB' ? 'bg-amber-950 text-amber-500 border border-amber-900/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{translateKind(s.kind)}</span>
                                  <span className={`font-medium transition-colors ${t.forbidden ? "text-zinc-600" : s.kind === 'LAB' ? 'text-amber-100/80' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{formatSlot(s)}</span>
                                </div>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}