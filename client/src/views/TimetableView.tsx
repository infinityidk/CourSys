import { useState, useMemo } from 'react'
import type { TimetableCourse } from '../types'
import { formatWeeks } from '../utils'
const DAYS = ['一', '二', '三', '四', '五', '六', '日']
const COLORS = {
  '必修': 'text-red-400 border-red-900 bg-red-950/30',
  '选修': 'text-blue-400 border-blue-900 bg-blue-950/30',
  '通识必修课': 'text-emerald-400 border-emerald-900 bg-emerald-950/30',
  '专业核心课': 'text-violet-400 border-violet-900 bg-violet-950/30',
  '专业选修课': 'text-amber-400 border-amber-900 bg-amber-950/30',
}
export default function TimetableView({ data }: { data: TimetableCourse[] }) {
  const [filter, setFilter] = useState('all')
  const filteredData = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(course => course.type === filter)
  }, [data, filter])
  const types = useMemo(() => {
    const set = new Set(data.map(c => c.type))
    return Array.from(set)
  }, [data])
  const getTypeColor = (type: string) => {
    return COLORS[type as keyof typeof COLORS] || 'text-zinc-400 border-zinc-700 bg-zinc-900'
  }
  const formatPeriod = (periods: number[]) => {
    if (periods.length === 1) return `${periods[0]}`
    if (periods[0] === periods[1]) return `${periods[0]}`
    return `${periods[0]}-${periods[1]}`
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all'
              ? 'bg-white text-black'
              : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'
              }`}
          >
            全部课程
          </button>
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === type
                ? 'bg-white text-black'
                : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {filteredData.map((course, index) => (
          <div
            key={`${course.code}-${index}`}
            className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-lg"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-2 py-1 text-[10px] font-black border rounded uppercase tracking-wider ${getTypeColor(course.type)}`}>
                  {course.type}
                </span>
                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">
                  {course.category}
                </span>
                <span className="px-2 py-1 bg-zinc-900/50 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-wider">
                  {course.grading}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white leading-snug">{course.className}</h3>
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                  <span className="font-mono text-blue-500">{course.code}</span>
                  <span className="text-zinc-700">/</span>
                  <span>{course.dept}</span>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">教师</div>
                    <div className="text-sm font-bold text-zinc-300">{course.teacher}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">学分</div>
                    <div className="text-3xl font-black text-white">{course.credits}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">时间安排</div>
                  <div className="space-y-2">
                    {course.slots?.map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded">
                                周{DAYS[slot.day - 1]}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {formatPeriod(slot.periods)}节
                              </span>
                            </div>
                            <div className="text-xs font-medium text-zinc-400">{slot.room}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">周次</div>
                            <div className="text-xs font-bold text-amber-500">{formatWeeks(slot.weeks)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}