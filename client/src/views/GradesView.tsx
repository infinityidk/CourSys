import type { GradeItem } from '../types'
const COLORS: Record<string, string> = {
  "A+": "text-emerald-400", "A": "text-emerald-400", "A-": "text-emerald-500",
  "B+": "text-blue-400", "B": "text-blue-400", "B-": "text-blue-500",
  "C+": "text-yellow-400", "C": "text-yellow-400", "C-": "text-yellow-500",
  "D": "text-orange-500", "F": "text-red-500", "P": "text-white"
}
export default function GradesView({ data }: { data: GradeItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
      {data.map((d, i) => (
        <div key={`${d.code}-${i}`} className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-start">
              <span className="px-3 py-1 bg-zinc-900 text-blue-500 border border-zinc-800 text-[10px] font-black rounded-full uppercase tracking-widest font-mono">
                {d.code}
              </span>
            </div>
            <h3 className="text-lg font-black text-white leading-snug">{d.name}</h3>
          </div>
          <div className="mt-8 pt-4 border-t border-zinc-900 flex justify-between items-end">
            <div className="space-y-1">
              <div className={`text-4xl font-black italic tracking-tighter ${COLORS[d.grade] || "text-zinc-200"}`}>{d.grade}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">得分: {d.score}</div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-white">{d.credits}</span>
              <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">学分</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}