import { useState } from 'react'
export default function Login({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [loading, setLoading] = useState(false)
  const handleLogin = async () => {
    if (!u || !p) return
    setLoading(true)
    const fd = new FormData()
    fd.append('username', u)
    fd.append('password', p)
    try {
      const res = await fetch('http://127.0.0.1:8000/login', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok && json.status === 1) onLogin()
      else alert('认证失败，请检查学号与密码')
    } catch {
      alert('服务器连接失败')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex flex-col gap-10 w-full max-w-[28rem] p-10 bg-zinc-950 rounded-[3rem] border-2 border-zinc-900 shadow-2xl">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase">CourSys</h1>
        <p className="text-zinc-500 text-[10px] font-bold tracking-[0.4em] uppercase">教务系统接入终端</p>
      </div>
      <div className="space-y-4">
        <input
          className="w-full bg-black text-white text-lg p-5 rounded-3xl border-2 border-zinc-900 outline-none focus:border-white transition-colors placeholder-zinc-800 font-bold"
          placeholder="学号 / SID"
          onChange={e => setU(e.target.value)}
        />
        <input
          className="w-full bg-black text-white text-lg p-5 rounded-3xl border-2 border-zinc-900 outline-none focus:border-white transition-colors placeholder-zinc-800 font-bold"
          type="password"
          placeholder="密码 / PASSWORD"
          onChange={e => setP(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>
      <button
        disabled={loading}
        className="w-full bg-white text-black text-lg p-5 rounded-3xl font-black tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
        onClick={handleLogin}
      >
        {loading ? "验证中..." : "进入系统"}
      </button>
    </div>
  )
}