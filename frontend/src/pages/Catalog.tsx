import { useEffect, useRef, useState, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useStore, type CartOption } from '../store'
import { formatSlot, formatEra } from '../utils/format'
import { createMask, hasConflict } from '../utils/bitwise'
import SolverWorker from '../utils/worker?worker'
import PlannerSidebar from './Planner/PlannerSidebar'
import type { Course } from '../bindings/Course'
import type { Class } from '../bindings/Class'
import type { Group } from '../bindings/Group'

const ERA_COLORS: Record<string, string> = {
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

// Build cart option from a Group
function makeCartOption(cls: Class, g: Group, c: Course): CartOption {
  return {
    id: g.id,
    code: c.code,
    name: `${c.name} ${cls.seq}班-${g.seq}组`,
    teacher: g.teacher || cls.teacher || '',
    slots: [...(cls.slots || []), ...(g.slots || [])],
    credits: c.credits
  }
}

// Portaled dropdown for add-to-group (avoids clipping by overflow:hidden parents)
function AddDropdown({ btnRef, onClose, courseCode, courseName, opts }: {
  btnRef: React.RefObject<HTMLButtonElement | null>, onClose: () => void, courseCode: string, courseName: string, opts: CartOption[]
}) {
  const { cart, addToGroup } = useStore()
  const cartKeys = Object.keys(cart)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: Math.min(r.right - 160, window.innerWidth - 170) })
    }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  return createPortal(
    <div ref={menuRef} className="fixed z-[9999] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 min-w-[160px] animate-fade-in-up" style={{ top: pos.top, left: pos.left }}>
      <button
        onClick={() => { addToGroup(courseCode, courseName, null, opts); onClose() }}
        className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        + 新建课程组
      </button>
      {cartKeys.map(k => (
        <button
          key={k}
          onClick={() => { addToGroup(courseCode, courseName, k, opts); onClose() }}
          className="w-full text-left px-3 py-2 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors truncate"
        >
          {cart[k].name}
        </button>
      ))}
    </div>,
    document.body
  )
}

// Group add-to-cart button
function AddToGroupButton({ courseCode, courseName, cls, g }: { courseCode: string, courseName: string, cls: Class, g: Group }) {
  const { cart, toggleCartOption } = useStore()
  const [showMenu, setShowMenu] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const opt = makeCartOption(cls, g, { code: courseCode, name: courseName } as Course)
  const inCart = Object.values(cart).some(cg => cg.options.some(o => o.id === g.id))

  if (inCart) {
    return (
      <button
        onClick={() => toggleCartOption(courseCode, courseName, opt)}
        className="px-2 py-1 bg-blue-500 text-white text-[9px] font-bold rounded-lg hover:bg-blue-600 transition-colors shrink-0"
      >
        已添加 ✓
      </button>
    )
  }

  return (
    <>
      <button ref={btnRef} onClick={() => setShowMenu(!showMenu)} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[9px] font-bold rounded-lg hover:bg-zinc-700 transition-colors shrink-0">加入</button>
      {showMenu && <AddDropdown btnRef={btnRef} onClose={() => setShowMenu(false)} courseCode={courseCode} courseName={courseName} opts={[opt]} />}
    </>
  )
}

// Class-level add button (adds all groups of a class)
function AddClassButton({ courseCode, courseName, cls, c }: { courseCode: string, courseName: string, cls: Class, c: Course }) {
  const [showMenu, setShowMenu] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const allOpts = cls.groups.map(g => makeCartOption(cls, g, c))
  return (
    <>
      <button ref={btnRef} onClick={() => setShowMenu(!showMenu)} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-bold rounded hover:bg-zinc-700 transition-colors" title="添加此班级所有组">+ 班级</button>
      {showMenu && <AddDropdown btnRef={btnRef} onClose={() => setShowMenu(false)} courseCode={courseCode} courseName={courseName} opts={allOpts} />}
    </>
  )
}

// Course-level add button (adds all groups of all classes)
function AddCourseButton({ c }: { c: Course }) {
  const [showMenu, setShowMenu] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const allOpts = c.classes.flatMap(cls => cls.groups.map(g => makeCartOption(cls, g, c)))
  return (
    <>
      <button ref={btnRef} onClick={() => setShowMenu(!showMenu)} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-bold rounded hover:bg-zinc-700 transition-colors" title="添加此课程所有组">+ 整门</button>
      {showMenu && <AddDropdown btnRef={btnRef} onClose={() => setShowMenu(false)} courseCode={c.code} courseName={c.name} opts={allOpts} />}
    </>
  )
}

// Conflict detection helper for filtering
function isGroupDead(cls: Class, g: Group, cart: any, solutions: any[], validIds: Set<string>): boolean {
  const cartKeys = Object.keys(cart)
  if (cartKeys.length === 0) return false
  const inCart = Object.values(cart).some((cg: any) => cg.options.some((o: any) => o.id === g.id))
  if (inCart) return solutions.length > 0 && !validIds.has(g.id)
  if (solutions.length === 0 && cartKeys.length > 0) return true
  if (solutions.length > 0) {
    const gMask = createMask([...(cls.slots || []), ...(g.slots || [])])
    return solutions.every((sol: any) => hasConflict(sol.mask, gMask))
  }
  return false
}

const CourseCard = memo(({ c, cart, validIds, solutions, selectMut, updateMut }: {
  c: Course, cart: any, validIds: Set<string>, solutions: any[], selectMut: any, updateMut: any
}) => {

  return (
    <div className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 w-full h-fit hover:border-zinc-700">
      {/* Header */}
      <div className="p-5 flex flex-col gap-3 bg-zinc-900/50 border-b border-zinc-900">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5 overflow-hidden">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-2 py-0.5 text-[10px] font-black border rounded uppercase ${ERA_COLORS[c.era] || ERA_COLORS["O"]}`}>{formatEra(c.era)}</span>
              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase truncate max-w-[120px]">{c.category}</span>
              {c.nature && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded uppercase">{c.nature}</span>}
            </div>
            <h2 className="text-xl font-black leading-tight tracking-tight text-white truncate" title={c.name}>{c.name}</h2>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end pl-2">
            <div className="text-4xl font-black italic leading-none text-white">{c.credits}</div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">学分</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide">
          <span className="text-blue-600 font-mono">{c.code}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-500 truncate max-w-[150px]">{c.department}</span>
          <div className="ml-auto flex items-center gap-3">
            <AddCourseButton c={c} />
            <a href={`https://ncesnext.com/search/?q=${c.code}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors group/link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span className="group-hover/link:underline">NCES</span>
            </a>
            <a href={`/api/syllabus/${c.code}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors group/link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span className="group-hover/link:underline">大纲</span>
            </a>
          </div>
        </div>

        {/* Dependencies */}
        {c.dependencies && c.dependencies.length > 0 && (
          <div className="mt-2 pt-3 border-t border-dashed border-zinc-700/30 space-y-1.5">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />先修要求
              <button onClick={() => updateMut.mutate(c.code)} disabled={updateMut.isPending} className="ml-auto text-zinc-500 hover:text-blue-400 text-[10px] font-bold disabled:opacity-30">↻ 刷新</button>
            </div>
            <div className="flex flex-col gap-1 pl-1">
              {c.dependencies.map((group, idx) => (
                <div key={idx} className="text-[10px] text-amber-200/80 font-mono leading-tight flex items-start">
                  <span className="mr-2 text-amber-600 font-bold select-none">{idx + 1}.</span>
                  <span className="break-words">{group.map(item => `${item.code} ${item.name}`).join(' | ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Classes & Groups */}
      <div className="p-2 space-y-2">
        {c.classes.map((cls, j) => {
          return (
            <div key={`${cls.seq}-${j}`} className="rounded-2xl border p-3 transition-colors bg-zinc-900 border-zinc-800/60">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-1 h-4 rounded-full shrink-0 bg-blue-600" />
                  <h3 className="text-xs font-bold truncate text-zinc-200">{cls.seq}班</h3>
                  <span className="text-[10px] text-zinc-500 truncate">{cls.teacher || ''}</span>
                  {cls.language && <span className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{cls.language}</span>}
                </div>
                <AddClassButton courseCode={c.code} courseName={c.name} cls={cls} c={c} />
              </div>
              {cls.info && <div className="mb-2 px-1 text-[9px] font-mono text-blue-400 leading-relaxed"><span className="font-black mr-1">公告:</span>{cls.info}</div>}
              {(cls.allowed || cls.denied) && (
                <div className="mb-3 px-1 text-[9px] font-mono leading-tight">
                  {cls.allowed && <div className="text-zinc-500"><span className="text-emerald-400 mr-1">面向:</span>{cls.allowed}</div>}
                  {cls.denied && <div className="text-zinc-500"><span className="text-red-400 mr-1">禁止:</span>{cls.denied}</div>}
                </div>
              )}
              {/* Class-level slots */}
              {cls.slots && cls.slots.length > 0 && (
                <div className="mb-2 px-1 space-y-1">
                  {cls.slots.map((s, i) => <div key={i} className="text-[10px] text-zinc-500 font-mono">{formatSlot(s)}</div>)}
                </div>
              )}
              {/* Groups */}
              <div className="flex flex-col gap-2">
                {cls.groups.map((g) => {
                  const inCart = Object.values(cart).some((cg: any) => cg.options.some((o: any) => o.id === g.id))
                  const isDead = isGroupDead(cls, g, cart, solutions, validIds)
                  const isSingleGroup = g.seq === '0'

                  const baseClass = inCart ? 'bg-blue-900/20 border-blue-500/50 hover:bg-blue-900/30'
                    : isDead ? 'bg-red-950/10 border-red-900/30 opacity-60'
                      : 'bg-black/40 border-zinc-800/50 hover:bg-zinc-800 hover:border-blue-500/30'

                  return (
                    <div key={g.id} className={`group flex flex-col border rounded-xl p-3 transition-all ${baseClass}`}>
                      {/* Header row: show group name only if seq != 0 */}
                      <div className={`flex justify-between items-center ${isSingleGroup ? '' : 'mb-2 pb-2 border-b border-zinc-800/50'}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          {!isSingleGroup && (
                            <span className={`text-xs font-bold truncate transition-colors ${isDead && !inCart ? 'text-red-400 line-through' : inCart ? 'text-blue-300' : 'text-zinc-300 group-hover:text-blue-400'}`}>
                              组 {g.seq}
                            </span>
                          )}
                          {g.teacher && <span className="text-[10px] text-zinc-500 truncate">{g.teacher}</span>}
                          {isDead && <span className="text-[9px] font-black text-red-500 px-1">冲突</span>}
                        </div>
                        <div className="flex gap-2 items-center shrink-0">
                          {!isSingleGroup && <AddToGroupButton courseCode={c.code} courseName={c.name} cls={cls} g={g} />}
                          <button
                            onClick={() => {
                              const coin = prompt('输入学分币 (0 = 不投币)', '0')
                              if (coin !== null) selectMut.mutate({ id: g.id, coin: coin })
                            }}
                            disabled={selectMut.isPending || isDead}
                            className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-[9px] font-bold rounded-lg border border-emerald-900/50 hover:bg-emerald-800/30 disabled:opacity-30 transition-colors"
                          >
                            选课
                          </button>
                        </div>
                      </div>
                      {/* Info row */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono text-zinc-600">
                        <span className={Number(g.undergraduate_capacity) - Number(g.undergraduate_number) <= 0 ? 'text-red-500' : 'text-emerald-500'}>本: {g.undergraduate_number}/{g.undergraduate_capacity}</span>
                        <span>研: {g.graduate_number}/{g.graduate_capacity}</span>
                        <span>男/女: {g.male_number}/{g.female_number}</span>
                        {g.seats && <span>座: {g.seats}</span>}
                      </div>
                      {g.slots && g.slots.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {g.slots.map((s, i) => <div key={i} className="text-[9px] text-amber-500/80 font-mono">{formatSlot(s)}</div>)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

const VirtualMasonry = memo(({ data, resetKey, ...props }: { data: Course[], resetKey: string } & any) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(1)
  const [limit, setLimit] = useState(30)

  useEffect(() => {
    const ro = new ResizeObserver(e => {
      const w = e[0].contentRect.width
      setCols(w >= 1280 ? 3 : w >= 768 ? 2 : 1)
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { setLimit(30); containerRef.current?.scrollTo(0, 0) }, [resetKey])

  const colsData = useMemo(() => {
    const arr: any[][] = Array.from({ length: cols }, () => [])
    const heights = new Array(cols).fill(0)
    data.slice(0, limit).forEach((c: Course) => {
      let min = 0; for (let i = 1; i < cols; i++) if (heights[i] < heights[min]) min = i
      arr[min].push(c)
      const score = 150 + c.classes.length * 60 + c.classes.reduce((a: number, cls: Class) => a + cls.groups.length * 40, 0)
      heights[min] += score
    })
    return arr
  }, [data, limit, cols])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (e[0].isIntersecting && limit < data.length) setLimit(p => Math.min(p + 30, data.length))
    }, { root: containerRef.current, rootMargin: '600px' })
    if (sentinelRef.current) obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [limit, data.length])

  return (
    <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar pr-2">
      <div className="flex gap-6 items-start">
        {colsData.map((items, i) => (
          <div key={i} className="flex-1 flex flex-col gap-6 min-w-0">
            {items.map((c: Course) => <CourseCard key={c.code} c={c} {...props} />)}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
        {limit < data.length && <span className="text-xs font-mono text-zinc-600 animate-pulse">LOADING MORE...</span>}
      </div>
    </div>
  )
})

export default function Catalog({ searchTerm, showFilters }: { searchTerm: string, showFilters: boolean }) {
  const { semester, cart, validIds, solutions, blocked, setValidIds, setSolutions } = useStore()
  const worker = useRef<Worker | null>(null)
  const qc = useQueryClient()

  // Filters
  const [hideForbidden, setHideForbidden] = useState(false)
  const [hideConflict, setHideConflict] = useState(false)
  const [selDepts, setSelDepts] = useState<string[]>([])
  const [selCats, setSelCats] = useState<string[]>([])
  const [selNatures, setSelNatures] = useState<string[]>([])
  const [selEras, setSelEras] = useState<string[]>([])
  const [selCredits, setSelCredits] = useState<string[]>([])
  const [selDays, setSelDays] = useState<number[]>([])
  const [selPeriods, setSelPeriods] = useState<string[]>([])

  const { data } = useQuery<Course[]>({
    queryKey: ['catalog', semester],
    queryFn: async () => {
      const res = await api.get(`/catalog?semester=${semester}`)
      return Array.isArray(res.data) ? res.data : Object.values(res.data)
    },
    enabled: !!semester
  })

  useEffect(() => {
    worker.current = new SolverWorker()
    worker.current.onmessage = e => {
      if (e.data.type === 'RESULT') {
        setValidIds(e.data.validOptionIds)
        setSolutions(e.data.solutions)
      }
    }
    return () => worker.current?.terminate()
  }, [])

  useEffect(() => {
    if (!worker.current) return
    const blocked = useStore.getState().blocked
    const groups = Object.values(cart).map(g => ({
      id: g.id, target: g.target, options: g.options.map(o => ({ id: o.id, slots: o.slots, code: o.code }))
    }))
    worker.current.postMessage({ type: 'SYNC_GROUPS', groups, blocked })
  }, [cart, blocked])

  const selectMut = useMutation({
    mutationFn: (params: { id: string; coin: string }) => api.post('/select', new URLSearchParams({ id: params.id, coin: params.coin })),
    onSuccess: () => alert('选课成功！')
  })

  const updateMut = useMutation({
    mutationFn: (code: string) => api.post('/update', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', semester] })
  })

  const toggle = <T,>(set: Set<T>, val: T) => { const n = new Set(set); n.has(val) ? n.delete(val) : n.add(val); return Array.from(n) }

  const options = useMemo(() => {
    const d = new Set<string>(), c = new Set<string>(), n = new Set<string>(), e = new Set<string>(), cr = new Set<string>()
    data?.forEach(item => {
      if (item.department) d.add(item.department)
      if (item.category) c.add(item.category)
      if (item.nature) n.add(item.nature)
      if (item.era) e.add(item.era)
      if (item.credits) cr.add(item.credits)
    })
    return { depts: Array.from(d).sort(), cats: Array.from(c).sort(), natures: Array.from(n).sort(), eras: Array.from(e).sort(), credits: Array.from(cr).sort((a, b) => Number(a) - Number(b)) }
  }, [data])

  const filteredData = useMemo(() => {
    if (!data) return []
    const term = searchTerm.toLowerCase().trim()
    const depts = new Set(selDepts), cats = new Set(selCats), natures = new Set(selNatures), eras = new Set(selEras), creds = new Set(selCredits)
    const days = new Set(selDays), periods = new Set(selPeriods.flatMap(p => PERIOD_MAP[p] || []))
    const hasTimeFilter = days.size > 0 || periods.size > 0

    return data.reduce<Course[]>((res, c) => {
      if (hideForbidden && c.classes.every(cls => cls.denied)) return res
      if (depts.size && !depts.has(c.department)) return res
      if (cats.size && !cats.has(c.category)) return res
      if (natures.size && (!c.nature || !natures.has(c.nature))) return res
      if (eras.size && !eras.has(c.era)) return res
      if (creds.size && !creds.has(c.credits)) return res

      const courseMatch = !term || c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
      let teacherMatch = false

      const filteredClasses = c.classes.map((cls): Class | null => {
        if (hideForbidden && cls.denied) return null
        const tMatch = cls.teacher?.toLowerCase().includes(term) || false
        if (tMatch) teacherMatch = true

        const validGroups = cls.groups.filter(g => {
          if (hasTimeFilter) {
            const allSlots = [...(cls.slots || []), ...(g.slots || [])]
            if (allSlots.length === 0) return false
            const timeSubset = allSlots.some(s =>
              (days.size === 0 || days.has(s.day)) &&
              (periods.size === 0 || Array.from({ length: s.period[1] - s.period[0] + 1 }, (_, i) => s.period[0] + i).some(p => periods.has(p)))
            )
            if (!timeSubset) return false
          }
          const gTeacherMatch = g.teacher?.toLowerCase().includes(term) || false
          if (gTeacherMatch) teacherMatch = true
          return !term || courseMatch || tMatch || gTeacherMatch
        })

        return validGroups.length > 0 ? { ...cls, groups: validGroups } : null
      }).filter((cls): cls is Class => cls !== null)

      // Apply conflict filtering
      const finalClasses = hideConflict
        ? filteredClasses.map(cls => {
          const nonDeadGroups = cls.groups.filter(g => !isGroupDead(cls, g, cart, solutions, validIds))
          return nonDeadGroups.length > 0 ? { ...cls, groups: nonDeadGroups } : null
        }).filter((cls): cls is Class => cls !== null)
        : filteredClasses

      if ((courseMatch || teacherMatch) && finalClasses.length > 0) {
        res.push({ ...c, classes: finalClasses })
      }
      return res
    }, [])
  }, [data, searchTerm, hideForbidden, hideConflict, selDepts, selCats, selNatures, selEras, selCredits, selDays, selPeriods, cart, solutions, validIds])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-zinc-950 border-b border-zinc-800 p-4 shrink-0 shadow-xl overflow-y-auto max-h-[25vh] custom-scrollbar flex flex-wrap gap-6 items-start">
          {/* Switches */}
          <div className="flex flex-wrap gap-2">
            {[{ l: "隐藏受限课程", v: hideForbidden, s: setHideForbidden }, { l: "忽略冲突", v: hideConflict, s: setHideConflict }].map(f => (
              <button key={f.l} onClick={() => f.s(!f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${f.v ? "bg-blue-500 border-blue-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{f.l}</button>
            ))}
          </div>

          {/* Time */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-[10px] font-black text-zinc-500 uppercase">时间</div>
            <div className="flex gap-1">
              {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => (
                <button key={d} onClick={() => setSelDays(toggle(new Set(selDays), i + 1))} className={`px-2 py-1 rounded text-[10px] font-bold border ${selDays.includes(i + 1) ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{d}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {Object.keys(PERIOD_MAP).map(p => (
                <button key={p} onClick={() => setSelPeriods(toggle(new Set(selPeriods), p))} className={`px-2 py-1 rounded text-[10px] font-bold border ${selPeriods.includes(p) ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{p}</button>
              ))}
            </div>
          </div>

          {/* Attributes */}
          <div className="flex flex-wrap gap-4">
            {[
              { k: "年级", opt: options.eras, v: selEras, s: setSelEras, fmt: formatEra },
              { k: "性质", opt: options.natures, v: selNatures, s: setSelNatures },
              { k: "类别", opt: options.cats, v: selCats, s: setSelCats },
              { k: "学分", opt: options.credits, v: selCredits, s: setSelCredits }
            ].map(g => (
              <div key={g.k} className="flex flex-col gap-1 p-2 rounded-lg border border-transparent hover:border-zinc-800 transition-colors">
                <div className="text-[10px] font-black text-zinc-600 uppercase">{g.k}</div>
                <div className="flex flex-wrap gap-1">
                  {g.opt.map(o => (
                    <button key={o} onClick={() => g.s(toggle(new Set(g.v), o))} className={`px-2 py-1 rounded text-[10px] font-bold border ${g.v.includes(o) ? "bg-zinc-200 text-black border-zinc-200" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>
                      {g.fmt ? g.fmt(o) : o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Depts */}
          <div className="w-full pt-2 border-t border-zinc-900">
            <div className="text-[10px] font-black text-zinc-600 uppercase mb-2">院系</div>
            <div className="flex flex-wrap gap-2">
              {options.depts.map(d => (
                <button key={d} onClick={() => setSelDepts(toggle(new Set(selDepts), d))} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border text-left ${selDepts.includes(d) ? "bg-blue-900/30 text-blue-400 border-blue-500/50" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex gap-6">
        <div className="flex-1 min-w-0 h-full">
          <VirtualMasonry data={filteredData} resetKey={semester} cart={cart} validIds={validIds} solutions={solutions} selectMut={selectMut} updateMut={updateMut} />
        </div>
        <div className="w-80 h-full shrink-0">
          <PlannerSidebar />
        </div>
      </div>
    </div>
  )
}