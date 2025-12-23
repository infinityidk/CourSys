import type { Slot } from './types'
const ERA_MAP: Record<string, string> = {
    "1": "大一", "2": "大二", "3": "大三", "4": "大四",
    "G": "研究生", "O": "其他"
}
const TERM_MAP: Record<string, string> = {
    "1": "秋季学期", "2": "春季学期", "3": "夏季学期"
}
const DAY_MAP = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]
export function formatEra(code: string) {
    return ERA_MAP[code] || "未知"
}
export function formatSemester(code: string) {
    const termCode = code.slice(9);
    return `${termCode === "1" ? code.slice(0, 4) : code.slice(5, 9)} ${TERM_MAP[termCode] || "未知学期"}`;
}
export function formatWeeks(w: number[]) {
    if (!w.length) return ""
    if (w.length >= 4 && w.every((v, i) => !i || v === w[i - 1] + 2)) return w.length === 1 ? w[0] + "周" : w[0] + "-" + w[w.length - 1] + ((w[0] & 1) === 1 ? "单周" : "双周")
    let s = w[0], e = w[0], r = []
    for (let i = 1; i < w.length; i++)w[i] === e + 1 ? e = w[i] : (r.push(s === e ? s : s + "-" + e), s = e = w[i])
    r.push(s === e ? s : s + "-" + e)
    return r.join(",") + "周"
}
export function formatSlot(s: Slot) {
    const pStr = s.periods[0] === s.periods.at(-1)
        ? `${s.periods[0]}`
        : `${s.periods[0]}-${s.periods.at(-1)}`
    return `${formatWeeks(s.weeks)} ${DAY_MAP[s.day]} ${pStr}节 @ ${s.room}`
}
export function translateKind(kind: string) {
    return kind === "THEORY" ? "理论" : "实验"
}
export function translateOption(name: string) {
    return name === "STD" ? "标准组" : name
}