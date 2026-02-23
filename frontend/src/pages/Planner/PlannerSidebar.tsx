import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store'
import { formatSlot } from '../../utils/format'
import BlockedModal from './BlockedModal'
import SolutionModal from './SolutionModal'

function GroupCard({ groupKey }: { groupKey: string }) {
  const { cart, validIds, solutions, updateCartGroup, removeCartGroup, removeCartOption } = useStore()
  const group = cart[groupKey]
  const [editingN, setEditingN] = useState(false)

  if (!group) return null

  const validCount = group.options.filter(opt => validIds.has(opt.id)).length
  const totalCount = group.options.length

  return (
    <div className="p-4 rounded-2xl border-2 transition-all border-zinc-800 bg-zinc-900/50">
      {/* Header: Name & Target */}
      <div className="flex justify-between items-center mb-3">
        <div className="space-y-1 flex-1 mr-2">
          <input
            className="bg-transparent text-sm font-black text-white outline-none placeholder-zinc-600 w-full"
            defaultValue={group.name}
            onBlur={e => updateCartGroup(groupKey, { name: e.target.value })}
          />
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span className="bg-zinc-800 px-1.5 rounded text-zinc-400">选</span>
            {editingN ? (
              <input
                autoFocus
                className="bg-zinc-700 text-white text-center w-8 rounded outline-none"
                defaultValue={group.target}
                onBlur={e => {
                  setEditingN(false)
                  const n = parseInt(e.target.value)
                  if (!isNaN(n) && n > 0) updateCartGroup(groupKey, { target: n })
                }}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              />
            ) : (
              <button onClick={() => setEditingN(true)} className="text-blue-400 hover:text-blue-300 hover:underline font-bold px-1">
                {group.target}
              </button>
            )}
            <span className="bg-zinc-800 px-1.5 rounded text-zinc-400">门</span>
            {totalCount > 0 && (
              <span className={`ml-auto text-[9px] ${validCount === 0 ? "text-red-500" : validCount < group.target ? "text-amber-500" : "text-emerald-600"}`}>
                {validCount}/{totalCount} 有效
              </span>
            )}
          </div>
        </div>
        <button onClick={() => removeCartGroup(groupKey)} className="text-zinc-600 hover:text-red-500 transition-colors p-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Option List */}
      <div className="space-y-2">
        {group.options.map(opt => {
          const isDead = solutions.length > 0 && !validIds.has(opt.id)
          return (
            <div key={opt.id} className={`relative p-2 rounded-lg border group/opt transition-all ${isDead ? "bg-red-950/10 border-red-900/30 opacity-70" : "bg-black/40 border-zinc-800/50"}`}>
              <div className="pr-6 space-y-0.5">
                <div className={`text-xs font-bold truncate ${isDead ? "text-red-400/80 line-through decoration-red-500/50" : "text-zinc-300"}`}>
                  {opt.name}
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`truncate ${isDead ? "text-red-500/50" : "text-zinc-500"}`}>{opt.teacher}</span>
                </div>
                <div className={`text-[9px] font-mono leading-tight ${isDead ? "text-red-900/50" : "text-zinc-600"}`}>
                  {opt.slots.map((s, i) => <div key={i}>{formatSlot(s)}</div>)}
                </div>
              </div>
              <button
                onClick={() => removeCartOption(groupKey, opt.id)}
                className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition-all opacity-0 group-hover/opt:opacity-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )
        })}

        {group.options.length === 0 && (
          <div className="text-[10px] text-zinc-700 text-center py-6 border border-dashed border-zinc-800/50 rounded-lg select-none">
            使用课程卡片中的"加入"按钮添加
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlannerSidebar() {
  const { cart, solutions, modals, setModals } = useStore()
  const cartKeys = Object.keys(cart)
  const totalOptions = cartKeys.reduce((a, k) => a + cart[k].options.length, 0)

  return (
    <div className="flex flex-col bg-zinc-950 border-l border-zinc-900 h-full w-80">
      {/* Header */}
      <div className="p-5 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-white italic tracking-tighter">PLANNER</h2>
          <button
            onClick={() => setModals({ ...modals, blocked: true })}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 text-zinc-400 hover:text-blue-400 transition-all group"
            title="设置不排课时间"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 group-hover:rotate-90 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
          <div>Groups: <span className="text-white">{cartKeys.length}</span></div>
          <div>Total: <span className="text-white">{totalOptions}</span></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {cartKeys.map(k => <GroupCard key={k} groupKey={k} />)}
        {cartKeys.length === 0 && (
          <div className="text-[10px] text-zinc-600 text-center py-10 font-mono leading-relaxed">
            在课程卡片中点击"加入"按钮<br />将课程组添加到排课器
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/50 backdrop-blur-sm space-y-3 shrink-0">
        <div className={`text-center p-3 rounded-xl text-xs font-bold font-mono transition-colors ${cartKeys.length === 0 ? "text-zinc-600 bg-zinc-900" :
            solutions.length > 0 ? "text-emerald-400 bg-emerald-950/20 border border-emerald-900/30" :
              "text-red-400 bg-red-950/20 border border-red-900/30 animate-pulse"
          }`}>
          {cartKeys.length === 0 ? "等待添加课程..." : solutions.length > 0 ? `${solutions.length} 种可行方案` : "方案冲突 / 无解"}
        </div>
        <button
          disabled={solutions.length === 0}
          onClick={() => setModals({ ...modals, result: true })}
          className="w-full py-4 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-200 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-lg disabled:shadow-none"
        >
          查看排课结果
        </button>
      </div>

      {/* Modals */}
      {modals.blocked && createPortal(<BlockedModal onClose={() => setModals({ ...modals, blocked: false })} />, document.body)}
      {modals.result && createPortal(<SolutionModal onClose={() => setModals({ ...modals, result: false })} />, document.body)}
    </div>
  )
}
