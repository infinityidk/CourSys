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
    const [year, term] = code.split('-')
    return `${year} ${TERM_MAP[term] || "未知学期"}`
}

export function formatWeeks(weeks: number[]) {
    if (!weeks.length) return ""
    const ranges = []
    let start = weeks[0], end = weeks[0]

    for (let i = 1; i < weeks.length; i++) {
        if (weeks[i] === end + 1) {
            end = weeks[i]
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`)
            start = end = weeks[i]
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`)
    return ranges.join(',') + "周"
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