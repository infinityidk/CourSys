import { useStore } from '../../store'

const PERIODS = [
  { l: '1-2', v: 1 }, { l: '3-4', v: 3 }, { l: '5-6', v: 5 },
  { l: '7-8', v: 7 }, { l: '9-10', v: 9 }, { l: '11-12', v: 11 }
]
const DAYS = ['一', '二', '三', '四', '五', '六', '日']

export default function BlockedModal({ onClose }: { onClose: () => void }) {
  const { blocked, toggleBlocked } = useStore()
  const isBlocked = (d: number, p: number) =>
    blocked.some(b => b.day === d && b.period[0] === p)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 w-full max-w-4xl shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-white italic">设置不排课时间</h2>
          <div className="text-xs font-mono text-zinc-500">点击格子切换屏蔽状态</div>
        </div>
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-2 select-none">
          <div className="p-2"></div>
          {DAYS.map(d => <div key={d} className="text-center text-xs font-black text-zinc-600 mb-2">周{d}</div>)}
          {PERIODS.map(p => (
            <div key={p.l} className="contents">
              <div className="text-right pr-4 text-xs font-mono text-zinc-500 py-4">{p.l}</div>
              {DAYS.map((_, i) => {
                const day = i + 1
                const active = isBlocked(day, p.v)
                return (
                  <div
                    key={`${day}-${p.v}`}
                    onClick={() => toggleBlocked(day, p.v)}
                    className={`rounded-xl border transition-all cursor-pointer relative overflow-hidden min-h-[48px] ${active ? "bg-red-900/20 border-red-500/50" : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"}`}>
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-red-500/50 rotate-45 transform scale-150"></div>
                        <div className="w-full h-px bg-red-500/50 -rotate-45 transform scale-150 absolute"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
