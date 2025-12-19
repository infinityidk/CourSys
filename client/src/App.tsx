import { useState } from 'react'
import Login from './views/Login'

const ERA_MAP: Record<string, string> = {
  YEAR_0: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  YEAR_1: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  YEAR_2: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  YEAR_3: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  YEAR_4: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  GRAD: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'

}

export default function App() {
  const [auth, setAuth] = useState(false)
  const [data, setData] = useState<any[]>([])

  const sync = async () => {
    try {
      const r = await fetch('http://127.0.0.1:8000/sync/grades')
      if (r.ok) setData((await r.json()).data)
      else alert('SYNC_FAILED')
    } catch { alert('NET_ERROR') }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex items-center justify-center p-8">
      {!auth ? <Login onLogin={() => setAuth(true)} /> : (
        <div className="w-full max-w-5xl self-start">
          <header className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-black text-white tracking-tighter italic">ARCHIVES</h1>
            <button className="bg-white text-black px-6 py-2 rounded-full font-black text-xs hover:scale-105 transition-transform" onClick={sync}>
              SYNC ACADEMIC RECORD
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((item, i) => (
              <div key={i} className="group bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ERA_MAP[item.era] || ERA_MAP.OTHER}`}>
                    {item.era.replace('_', ' ')}
                  </span>
                  <span className="text-2xl font-black text-white tracking-tighter">{item.xscj}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-1 truncate" title={item.kcmc}>{item.kcmc}</h3>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                  <span>{item.kcdm}</span>
                  <span>{item.xf} CREDITS · {item.zzcj}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}