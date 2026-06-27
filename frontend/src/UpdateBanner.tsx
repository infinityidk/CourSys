import { useState, useEffect } from 'react'
function isNewer(latest: string, current: string): boolean {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
    const [l, c] = [parse(latest), parse(current)]
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
        const ln = l[i] || 0
        const cn = c[i] || 0
        if (ln > cn) return true
        if (ln < cn) return false
    }
    return false
}
export default function UpdateBanner() {
    const [show, setShow] = useState(false)
    const [latestVer, setLatestVer] = useState('')
    const [htmlUrl, setHtmlUrl] = useState('')
    useEffect(() => {
        if (import.meta.env.DEV) return
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        fetch('https://api.github.com/repos/infinityidk/CourSys/releases/latest', { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                clearTimeout(timer)
                if (!data?.tag_name) return
                const current = import.meta.env.APP_VERSION
                if (current && isNewer(data.tag_name, current)) {
                    setLatestVer(data.tag_name)
                    setHtmlUrl(data.html_url)
                    setShow(true)
                }
            })
            .catch(() => { })
        return () => controller.abort()
    }, [])
    if (!show) return null
    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between bg-zinc-950/95 border-b border-zinc-900 px-6 py-3.5 text-zinc-300 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 text-xs font-black italic uppercase tracking-wider select-none">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>新版本 <span className="font-mono bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-white not-italic lowercase">{latestVer}</span> 可用</span>
            </div>
            <div className="flex items-center gap-5">
                <a href={htmlUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all shadow-md shrink-0 cursor-pointer">
                    前往更新
                </a>
                <button onClick={() => setShow(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 cursor-pointer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    )
}
