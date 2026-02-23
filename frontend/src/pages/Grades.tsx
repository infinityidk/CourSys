import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { useStore } from '../store'
import { formatSemester } from '../utils/format'
import type { GradeResponse } from '../bindings/GradeResponse'

const COLORS: Record<string, string> = {
  "A+": "text-emerald-500", "A": "text-emerald-400", "A-": "text-emerald-300",
  "B+": "text-blue-500", "B": "text-blue-400", "B-": "text-blue-300",
  "C+": "text-amber-500", "C": "text-amber-400", "C-": "text-amber-300",
  "D+": "text-orange-500", "D": "text-orange-400", "D-": "text-orange-300",
  "F": "text-red-500", "P": "text-zinc-400"
}

export default function Grades() {
  const { user } = useStore()
  const { data, isLoading } = useQuery<GradeResponse[]>({
    queryKey: ['grades', user?.level],
    queryFn: async () => (await api.get(`/grades?level=${user?.level || '1'}`)).data,
    enabled: !!user,
  })

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="h-48 bg-zinc-900/50 rounded-3xl border border-zinc-900" />
      ))}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {data?.map((d, i) => (
          <div key={`${d.code}-${i}`} className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-lg">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-zinc-900 text-blue-500 border border-zinc-800 text-[10px] font-black rounded-full uppercase tracking-widest font-mono">
                  {d.code}
                </span>
                <span className="px-2 py-1 bg-zinc-900 text-zinc-500 text-[9px] font-bold rounded-full border border-zinc-800 font-mono">
                  {formatSemester(d.semester)}
                </span>
              </div>
              <h3 className="text-lg font-black text-white leading-snug">{d.name}</h3>
              <div className="flex flex-wrap gap-2 items-center text-[9px]">
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded uppercase font-bold">{d.category}</span>
                {d.nature && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded font-bold">{d.nature}</span>}
                <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 rounded font-mono truncate max-w-[120px]">{d.department}</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-900 space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className={`text-4xl font-black italic tracking-tighter ${COLORS[d.grade] || "text-zinc-200"}`}>{d.grade}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">得分: {d.score}</div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-white">{d.credits}</span>
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">学分</p>
                </div>
              </div>
              {(d.ranking || d.students) && (
                <div className="flex gap-3 text-[9px] font-mono text-zinc-500 pt-1">
                  {d.ranking && <span>排名: <span className="text-zinc-300">{d.ranking}</span></span>}
                  {d.students && <span>修读人数: <span className="text-zinc-300">{d.students}</span></span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
