import { useState } from 'react'

export default function Login({ onLogin }: { onLogin: () => void }) {
    const [u, setU] = useState(''), [p, setP] = useState(''), [loading, setLoading] = useState(false)

    const sign = async () => {
        setLoading(true)
        const fd = new FormData(); fd.append('u', u); fd.append('p', p)
        try {
            const r = await fetch('http://127.0.0.1:8000/login', { method: 'POST', body: fd })
            if (r.ok && (await r.json()).status === 1) onLogin()
            else alert('AUTH_FAILED')
        } catch { alert('NET_ERROR') }
        finally { setLoading(false) }
    }

    return (
        <div className="flex flex-col gap-4 w-80 p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
            <h1 className="text-xl font-black text-center tracking-tighter">SUSTech Course</h1>
            <input className="bg-zinc-800 p-3 rounded-lg outline-none focus:ring-1 ring-blue-500" placeholder="SID" onChange={e => setU(e.target.value)} />
            <input className="bg-zinc-800 p-3 rounded-lg outline-none focus:ring-1 ring-blue-500" type="password" placeholder="PWD" onChange={e => setP(e.target.value)} />
            <button className="bg-blue-600 p-3 rounded-lg font-bold disabled:opacity-50" disabled={loading} onClick={sign}>
                {loading ? '...' : 'LOGIN'}
            </button>
        </div>
    )
}