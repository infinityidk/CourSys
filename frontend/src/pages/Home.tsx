import { useStore } from '../store'

export default function Home() {
  const { user, semester } = useStore()

  if (!user) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-40 bg-zinc-900/50 rounded-3xl border border-zinc-900" />
      ))}
    </div>
  )

  const items = [
    { k: '年级', v: user.grade, c: 'text-blue-500' },
    { k: '层次', v: user.level === '1' ? '本科生' : user.level === '2' ? '研究生' : '未知', c: 'text-emerald-500' },
    { k: '院系', v: user.department, c: 'text-violet-500' },
    { k: '专业', v: user.major, c: 'text-amber-500' }
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
            全校课程数据已同步。可切换至"全校课表"查询课程，或在"成绩单"查看历史学业表现。
          </p>
        </div>
        <div className="p-8 rounded-[3rem] bg-zinc-950 border border-zinc-900 flex flex-col justify-between gap-6 min-w-[300px]">
          <div className="space-y-2">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">系统信息</div>
            <div className="text-xs font-mono text-zinc-400">
              当前学期: <span className="text-zinc-200">{semester || '未知'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
