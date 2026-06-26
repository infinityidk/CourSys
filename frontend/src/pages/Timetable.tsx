import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useStore } from '../store'
import { NATURE_COLORS } from '../utils/format'
import { compareSemesters, formatSemester, formatWeeks, generateSemesterRange } from '../utils/format'
import type { ScheduleResponse } from '../bindings/ScheduleResponse'
import { createPortal } from 'react-dom'

const DAYS = ['一', '二', '三', '四', '五', '六', '日']

export default function Timetable() {
  const { semester: globalSem, plannerSemester, user } = useStore()
  const [selectedSem, setSelectedSem] = useState(plannerSemester || globalSem)
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const gradeError = useMemo(() => {
    if (!user?.grade || !globalSem) return null
    const start = `${user.grade}-${Number(user.grade) + 1}1`
    try {
      if (compareSemesters(start, globalSem) > 0) {
        return `入学学期 ${formatSemester(start)} 晚于当前学期，数据异常`
      }
    } catch {
      return '学期格式错误，请联系管理员'
    }
    return null
  }, [user, globalSem])

  const semesterOptions = useMemo(() => {
    if (gradeError || !user?.grade) return []
    const start = `${user.grade}-${Number(user.grade) + 1}1`
    return generateSemesterRange(start, globalSem).reverse()
  }, [user, gradeError, globalSem])

  if (gradeError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-8 text-center">
          <p className="text-red-400 font-black text-lg">{gradeError}</p>
          <p className="text-red-300/50 text-xs mt-2 font-mono">无法生成学期列表，请重新登录或联系管理员</p>
        </div>
      </div>
    )
  }

  const { data, isLoading } = useQuery<[string, ScheduleResponse[]]>({
    queryKey: ['schedule', selectedSem],
    queryFn: async () => (await api.get(`/schedule?semester=${selectedSem}`)).data,
    enabled: !!selectedSem,
  })

  const quitMut = useMutation({
    mutationFn: (id: string) => api.post('/quit', new URLSearchParams({ id, level: user?.level || '1' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', selectedSem] }),
  })

  const modifyMut = useMutation({
    mutationFn: (params: { id: string; coin: number }) => api.post('/mod', new URLSearchParams({ id: params.id, coin: params.coin.toString(), level: user?.level || '1' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', selectedSem] }),
  })

  const courses = data?.[1] || []
  const totalCoin = data?.[0] || '0'
  const usedCoin = useMemo(() => courses.reduce((a, c) => a + Number(c.coin || 0), 0), [courses])
  const remainCoin = Number(totalCoin) - usedCoin
  const totalCredits = useMemo(() => courses.reduce((a, c) => a + Number(c.credits || 0), 0), [courses])

  const categories = useMemo(() => {
    const s = new Set(courses.map(c => c.category))
    return Array.from(s)
  }, [courses])

  const filteredData = useMemo(() => {
    if (filter === 'all') return courses
    return courses.filter(c => c.category === filter)
  }, [courses, filter])

  const formatPeriod = (period: [number, number]) => {
    if (period[0] === period[1]) return `${period[0]}`
    return `${period[0]}-${period[1]}`
  }

  if (isLoading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-60 bg-zinc-900/50 rounded-3xl border border-zinc-900" />
      ))}
    </div>
  )

  const semesterPortal = createPortal(
    <div className="relative">
      <select
        value={selectedSem}
        onChange={(e) => setSelectedSem(e.target.value)}
        className="appearance-none bg-zinc-900 border border-zinc-800 rounded-2xl pl-6 pr-10 py-3 text-xs font-black text-white hover:text-zinc-300 outline-none focus:border-blue-500 transition-all cursor-pointer"
      >
        {semesterOptions.map(opt => (
          <option key={opt} value={opt} className="bg-zinc-950">{formatSemester(opt)}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
        <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>,
    document.getElementById('semester-selector')!
  );

  return (
    <>{semesterPortal}
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-6 p-1">
          {/* Coins display */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-white font-mono text-sm font-bold bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
              总学分: {totalCredits}
            </div>
            <div className="text-blue-500 font-mono text-sm font-bold bg-blue-950/30 px-4 py-2 rounded-xl border border-blue-900/50">
              学分币: {totalCoin}
            </div>
            <div className="text-emerald-500 font-mono text-sm font-bold bg-emerald-950/30 px-4 py-2 rounded-xl border border-emerald-900/50">
              剩余: {remainCoin}
            </div>
            <div className="text-amber-500 font-mono text-sm font-bold bg-amber-950/30 px-4 py-2 rounded-xl border border-amber-900/50">
              已投: {usedCoin}
            </div>
          </div>

          {/* Filter pills */}
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
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === cat
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Course cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {filteredData.map((course, index) => (
              <div
                key={`${course.id}-${index}`}
                className="bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    {course.nature && <span className={`px-2 py-1 text-[10px] font-black border rounded uppercase tracking-wider ${NATURE_COLORS[course.nature] || "text-blue-400 border-blue-900 bg-blue-950/30"}`}>{course.nature}
                    </span>}
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {course.category}
                    </span>
                    <span className="px-2 py-1 bg-zinc-900/50 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-wider">
                      {course.grade_type}
                    </span>
                    {course.language && <span className="px-2 py-1 bg-violet-900/30 text-violet-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {course.language}
                    </span>}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white leading-snug">{course.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                      <span className="font-mono text-blue-500">{course.code}</span>
                      <span className="text-zinc-700">/</span>
                      <span>{course.department}</span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">教师</div>
                        <div className="text-sm font-bold text-zinc-300">{course.teacher || '未知'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">学分</div>
                        <div className="text-3xl font-black text-white">{course.credits}</div>
                        {Number(course.coin) > 0 && <div className="text-[9px] font-mono text-amber-500 mt-1">已投: {course.coin}币</div>}
                      </div>
                    </div>

                    {/* Class / Group info */}
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-bold text-white">{course.class}班 {course.group ? `/ ${course.group}组` : ''}</span>
                        </div>
                        {course.info && <span className="text-[9px] text-blue-400 font-mono truncate max-w-[100px]">{course.info}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono text-zinc-500 px-2">
                        <span className={Number(course.undergraduate_capacity) - Number(course.undergraduate_number) <= 0 ? "text-red-500" : "text-emerald-500"}>
                          本: {course.undergraduate_number}/{course.undergraduate_capacity}
                        </span>
                        <span>研: {course.graduate_number}/{course.graduate_capacity}</span>
                        <span>男/女: {course.male_number}/{course.female_number}</span>
                      </div>
                    </div>

                    {/* Time slots */}
                    <div>
                      <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">时间安排</div>
                      <div className="space-y-2">
                        {course.slots?.map((slot, slotIndex) => (
                          <div key={slotIndex} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded">
                                    周{DAYS[slot.day - 1]}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {formatPeriod(slot.period)}节
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

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-900">
                  <button
                    onClick={() => {
                      const coin = prompt(`输入学分币数量 (总: ${totalCoin} / 剩余: ${remainCoin} / 当前已投: ${course.coin})`, course.coin || '0')
                      if (coin !== null) modifyMut.mutate({ id: course.id, coin: Number(coin) })
                    }}
                    disabled={modifyMut.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-blue-950/30 border border-blue-900/50 text-blue-400 text-xs font-black uppercase hover:bg-blue-900/40 hover:border-blue-500/50 transition-all disabled:opacity-30"
                  >
                    修改
                  </button>
                  <button
                    onClick={() => { if (confirm('确定退课？')) quitMut.mutate(course.id) }}
                    disabled={quitMut.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-black uppercase hover:bg-red-900/40 hover:border-red-500/50 transition-all active:scale-95 disabled:opacity-30"
                  >
                    退课
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div></>
  )
}
