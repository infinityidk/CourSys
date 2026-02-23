import { hasConflict } from './bitwise'
export type SolverOption = { id: string; mask: bigint; code: string }
export type SolverSolution = { ids: string[]; mask: bigint }
export type GroupInput = { id: string; target: number; options: SolverOption[] }
const MAX_SOLUTIONS = 5000000
function generateCombinations(options: SolverOption[], target: number): SolverSolution[] {
    if (target === 0) return [{ ids: [], mask: 0n }]
    if (options.length < target) return []
    const results: SolverSolution[] = []
    function backtrack(start: number, currentIds: string[], currentMask: bigint, currentCodes: string[]) {
        if (results.length >= MAX_SOLUTIONS) return
        if (currentIds.length === target) {
            results.push({ ids: [...currentIds], mask: currentMask })
            return
        }
        for (let i = start; i < options.length; i++) {
            if (results.length >= MAX_SOLUTIONS) break
            const opt = options[i]
            if (!hasConflict(currentMask, opt.mask) && !currentCodes.includes(opt.code)) {
                backtrack(i + 1, [...currentIds, opt.id], currentMask | opt.mask, [...currentCodes, opt.code])
            }
        }
    }
    backtrack(0, [], 0n, [])
    return results
}
export function solve(groups: GroupInput[]): SolverSolution[] {
    let acc: SolverSolution[] = [{ ids: [], mask: 0n }]
    for (const group of groups) {
        let commonMask = -1n
        for (const s of acc) commonMask &= s.mask
        if (group === groups[0]) commonMask = 0n
        const validOptions = group.options.filter(opt => !hasConflict(opt.mask, commonMask))
        const groupCombs = generateCombinations(validOptions, group.target)
        if (groupCombs.length === 0) return []
        const next: SolverSolution[] = []
        outer: for (const a of acc) {
            for (const b of groupCombs) {
                if (next.length >= MAX_SOLUTIONS) break outer
                if (!hasConflict(a.mask, b.mask)) next.push({ ids: [...a.ids, ...b.ids], mask: a.mask | b.mask })
            }
        }
        if (next.length === 0) return []
        acc = next
    }
    return acc
}
export function filterByBlocked(solutions: SolverSolution[], blockedMask: bigint): SolverSolution[] {
    return solutions.filter(s => !hasConflict(s.mask, blockedMask))
}