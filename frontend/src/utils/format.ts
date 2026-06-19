import type { Slot } from '../bindings/Slot'

const ERA_MAP: Record<string, string> = {
    "1": "大一", "2": "大二", "3": "大三", "4": "大四", "5": "大五",
    "G": "研究生", "O": "其他"
}
const TERM_MAP: Record<string, string> = {
    "1": "秋季学期", "2": "春季学期", "3": "夏季学期"
}
const DAYS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]

export function formatEra(code: string) { return ERA_MAP[code] || "未知" }
export function formatSemester(code: string) {
    const termCode = code.slice(9)
    return `${termCode === "1" ? code.slice(0, 4) : code.slice(5, 9)} ${TERM_MAP[termCode] || "未知学期"}`
}
export function formatWeeks(w: number[]) {
    if (!w || !w.length) return ""
    if (w.length >= 4 && w.every((v, i) => !i || v === w[i - 1] + 2)) return w.length === 1 ? w[0] + "周" : w[0] + "-" + w[w.length - 1] + ((w[0] & 1) === 1 ? "单周" : "双周")
    let s = w[0], e = w[0], r: (string | number)[] = []
    for (let i = 1; i < w.length; i++) w[i] === e + 1 ? e = w[i] : (r.push(s === e ? s : s + "-" + e), s = e = w[i])
    r.push(s === e ? s : s + "-" + e)
    return r.join(",") + "周"
}
export function formatSlot(s: Slot) {
    const pStr = s.period[0] === s.period[1] ? `${s.period[0]}` : `${s.period[0]}-${s.period[1]}`
    return `${formatWeeks(s.weeks)} ${DAYS[s.day]} ${pStr}节 @ ${s.room}`
}
export function translateKind(kind: string) {
    return kind === "THEORY" ? "理论" : "实验"
}

export function parseSemester(code: string) {
    const match = code.match(/^(\d{4})-(\d{4})(\d)$/)
    if (!match) throw new Error(`Invalid semester: ${code}`)
    return {
        startYear: parseInt(match[1]),
        endYear: parseInt(match[2]),
        term: parseInt(match[3]),
    }
}

export function getNextSemester(code: string): string {
    const { startYear, term } = parseSemester(code)
    if (term < 3) {
        return `${startYear}-${startYear + 1}${term + 1}`
    } else {
        const nextStart = startYear + 1
        return `${nextStart}-${nextStart + 1}1`
    }
}

export function getPrevSemester(code: string): string {
    const { startYear, term } = parseSemester(code)
    if (term > 1) {
        return `${startYear}-${startYear + 1}${term - 1}`
    } else {
        const prevStart = startYear - 1
        return `${prevStart}-${prevStart + 1}3`
    }
}

export function compareSemesters(a: string, b: string): number {
    const pa = parseSemester(a), pb = parseSemester(b)
    if (pa.startYear !== pb.startYear) return pa.startYear < pb.startYear ? -1 : 1
    if (pa.term !== pb.term) return pa.term < pb.term ? -1 : 1
    return 0
}

export function getPreviousSemesters(current: string, n: number): string[] {
    if (!current || !current.match(/^\d{4}-\d{4}\d$/)) return []
    const result = [current]
    let code = current
    for (let i = 1; i < n; i++) {
        try {
            code = getPrevSemester(code)
            result.push(code)
        } catch {
            break
        }
    }
    return result
}


export function generateSemesterRange(start: string, end: string): string[] {
    if (!start || !end || !start.match(/^\d{4}-\d{4}\d$/) || !end.match(/^\d{4}-\d{4}\d$/)) return []
    const result: string[] = []
    let code = start
    while (compareSemesters(code, end) <= 0) {
        result.push(code)
        code = getNextSemester(code)
    }
    return result
}