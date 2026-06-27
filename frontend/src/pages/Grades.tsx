import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { formatSemester, NATURE_COLORS } from '../utils/format'
import type { GradesResponse } from '../bindings/GradesResponse'

const COLORS: Record<string, string> = {
  "A+": "text-emerald-500", "A": "text-emerald-400", "A-": "text-emerald-300",
  "B+": "text-blue-500", "B": "text-blue-400", "B-": "text-blue-300",
  "C+": "text-amber-500", "C": "text-amber-400", "C-": "text-amber-300",
  "D+": "text-orange-500", "D": "text-orange-400", "D-": "text-orange-300",
  "F": "text-red-500", "P": "text-zinc-400"
}

export default function Grades() {
  const { user } = useStore()
  const { data, isLoading } = useQuery<GradesResponse>({
    queryKey: ['grades', user?.level],
    queryFn: async () => (await api.get(`/grades?level=${user?.level || '1'}`)).data,
    enabled: !!user,
  })

  useEffect(() => {
    if (data?.grades && data.grades.length > 0) localStorage.setItem('coursys_grades', JSON.stringify(data.grades))
  }, [data])

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="h-[244px] bg-zinc-900/50 rounded-[2rem] border border-zinc-900" />
      ))}
    </div>
  )
  if (!data) return null
  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-1">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 items-stretch">
        {data.gpa > 0 && (
          <div className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 flex flex-col md:grid md:grid-cols-3 gap-6 col-span-1 md:col-span-2 hover:border-zinc-800 transition-colors shadow-lg">
            <div className="flex flex-col justify-center gap-6 shrink-0 py-1 md:border-r md:border-zinc-900 md:pr-6">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">总绩点</span>
                <div className="text-5xl font-black text-yellow-500 tracking-tighter italic leading-none">{data.gpa.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">总排名</span>
                <div className="text-5xl font-black text-cyan-500 tracking-tighter italic leading-none">{data.ranking}</div>
              </div>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2.5 min-w-0">
              {data.years.map(y => (
                <div key={y.year} className="flex flex-row items-center justify-between gap-3 px-3 py-2 bg-zinc-900/20 border border-zinc-900 rounded-2xl hover:border-zinc-800 transition-colors h-[42px]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-black text-white whitespace-nowrap">{y.year}</span>
                    <span className="px-2.5 py-0.5 bg-yellow-950/40 border border-yellow-900/30 rounded-lg text-[9px] font-mono font-bold text-yellow-400 shrink-0">{y.year_gpa.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {y.seasons.map(s => {
                      const isAva = s.season_gpa > 0
                      return (
                        <div key={s.season_name} className={`px-2.5 py-1 border text-[10px] font-mono rounded-lg flex items-center gap-1.5 transition-colors ${isAva ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-transparent border-zinc-900/30 text-zinc-600 select-none"}`}>
                          <span className="font-bold text-[8px] text-zinc-500">{s.season_name}</span>
                          <span className="font-black">{isAva ? s.season_gpa.toFixed(2) : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.grades.map((d, i) => (
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
                {d.nature && <span className={`px-2 py-0.5 ${NATURE_COLORS[d.nature] || "bg-blue-900/30 text-blue-400"} rounded font-bold`}>{d.nature}</span>}
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
                  {d.ranking && <span>班级排名: <span className="text-zinc-300">{d.ranking}</span></span>}
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
