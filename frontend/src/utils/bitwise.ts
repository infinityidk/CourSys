import type { Slot } from '../bindings/Slot'
const WEEKS = 30; const DAYS = 7; const PERIODS = 14
const WEEK_OFFSET = DAYS * PERIODS; const DAY_OFFSET = PERIODS
export function getBitIndex(week: number, day: number, period: number): bigint {
    if (week < 1 || week > WEEKS || day < 1 || day > DAYS || period < 1 || period > PERIODS) return -1n
    return BigInt((week - 1) * WEEK_OFFSET + (day - 1) * DAY_OFFSET + (period - 1))
}
export function createMask(slots: Slot[]): bigint {
    let mask = 0n
    for (const s of slots) {
        for (const w of s.weeks) {
            for (let p = s.period[0]; p <= s.period[1]; p++) {
                const idx = getBitIndex(w, s.day, p)
                if (idx >= 0n) mask |= 1n << idx
            }
        }
    }
    return mask
}
export function hasConflict(a: bigint, b: bigint): boolean { return (a & b) !== 0n }
export function mergeMasks(masks: bigint[]): bigint { return masks.reduce((acc, m) => acc | m, 0n) }