import { useState, useMemo } from 'react'
import { useStore } from '../../store'


const PERIOD_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const DAYS = ['一', '二', '三', '四', '五', '六', '日']
const COLORS = [
  'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20',
  'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
  'border-violet-500 bg-violet-500/10 hover:bg-violet-500/20',
  'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20',
  'border-rose-500 bg-rose-500/10 hover:bg-rose-500/20',
  'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20'
]

export default function SolutionModal({ onClose }: { onClose: () => void }) {
  const { solutions, cart } = useStore()
  const [idx, setIdx] = useState(0)
  const [week, setWeek] = useState(1)

  const groups = Object.values(cart)
  const currentSolution = solutions[idx]

  const items = useMemo(() => {
    if (!currentSolution) return []
    const list: any[] = []
    currentSolution.ids.forEach(id => {
      for (const g of groups) {
        const match = g.options.find(o => o.id === id)
        if (match) {
          list.push({ ...match, _groupIndex: groups.indexOf(g) })
          break
        }
      }
    })
    return list
  }, [currentSolution, groups])

  const gridItems = useMemo(() => {
    return items.flatMap(item =>
      item.slots
        .filter((s: any) => s.weeks.includes(week))
        .map((s: any) => ({ ...s, meta: item }))
    )
  }, [items, week])

  const totalCredits = useMemo(() => items.reduce((sum, { credits }) => sum + (+credits || 0), 0), [items]);

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-md flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center px-8 py-5 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-black text-white italic tracking-tighter">PLANNER RESULTS</h2>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">学分</span>
            <span className="text-xl font-mono font-bold text-white">{totalCredits}</span>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Available Solutions</span>
            <span className="text-xl font-mono font-bold text-emerald-500">{solutions.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Week View</span>
            <input
              type="range" min="1" max="20" value={week}
              onChange={e => setWeek(Number(e.target.value))}
              className="w-48 accent-blue-600 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer"
            />
            <span className="text-lg font-black text-white w-8 text-center">{week}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-zinc-200 transition-all shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col items-center min-w-[5rem]">
              <span className="text-2xl font-black text-white">{idx + 1}</span>
              <div className="h-0.5 w-full bg-zinc-800 rounded-full my-0.5"></div>
              <span className="text-[10px] font-bold text-zinc-500">OF {solutions.length}</span>
            </div>
            <button
              onClick={() => setIdx(i => Math.min(solutions.length - 1, i + 1))}
              disabled={idx === solutions.length - 1}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-zinc-200 transition-all shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <button onClick={onClose} className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex justify-center">
        <div className="w-full max-w-[1600px] h-full bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-auto custom-scrollbar shadow-2xl">
          <div className="min-w-[1000px] absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] grid-rows-[50px_repeat(11,minmax(80px,1fr))]">
            <div className="sticky top-0 left-0 z-30 bg-zinc-950 border-b border-r border-zinc-800"></div>
            {DAYS.map(d => (
              <div key={d} className="sticky top-0 z-20 bg-zinc-950 border-b border-r border-zinc-800/50 flex items-center justify-center text-sm font-black text-zinc-400 tracking-widest">
                周{d}
              </div>
            ))}

            {PERIOD_ROWS.map((p, i) => (
              <div key={`row-${p}`} className="contents">
                <div
                  style={{ gridRow: i + 2, gridColumn: 1 }}
                  className="sticky left-0 z-20 bg-zinc-950 border-b border-r border-zinc-800 flex items-center justify-center text-sm font-black text-zinc-600"
                >
                  {p}
                </div>
                {DAYS.map((_, j) => <div key={`cell-${i}-${j}`} className="border-b border-r border-zinc-800/30"></div>)}
              </div>
            ))}

            {gridItems.map((item: any, i: number) => {
              const rowStart = item.period[0] + 1
              const rowSpan = item.period[1] - item.period[0] + 1
              const colStart = item.day + 1

              return (
                <div
                  key={i}
                  style={{ gridRow: `${rowStart} / span ${rowSpan}`, gridColumn: `${colStart}` }}
                  className={`m-1 p-3 rounded-xl border-l-4 shadow-lg flex flex-col justify-center gap-1 overflow-hidden transition-transform hover:scale-[1.02] hover:z-10 cursor-default ${COLORS[item.meta._groupIndex % COLORS.length]}`}
                >
                  <div className="text-xs font-black text-white leading-snug line-clamp-2">
                    {item.meta.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                    <span className="bg-black/40 px-1.5 py-0.5 rounded text-zinc-300">{item.room}</span>
                    {item.meta.teacher && <span className="truncate opacity-80">{item.meta.teacher}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
