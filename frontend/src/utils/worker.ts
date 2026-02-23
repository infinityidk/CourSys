import { createMask } from './bitwise'
import { solve, filterByBlocked } from './solver'
import type { GroupInput } from './solver'
import type { Slot } from '../bindings/Slot'
type RawOption = { id: string; slots: Slot[]; code: string }
type RawGroup = { id: string; target: number; options: RawOption[] }
type Msg = { type: 'SYNC_GROUPS'; groups: RawGroup[]; blocked: Slot[] }
self.onmessage = (e: MessageEvent<Msg>) => {
    if (e.data.type === 'SYNC_GROUPS') {
        const groups: GroupInput[] = e.data.groups.map(g => ({
            id: g.id, target: g.target,
            options: g.options.map(o => ({ id: o.id, mask: createMask(o.slots), code: o.code }))
        }))
        const blockedMask = createMask(e.data.blocked)
        const final = filterByBlocked(solve(groups), blockedMask)
        const validOptionIds = new Set<string>()
        if (final.length > 0) final.forEach(s => s.ids.forEach(id => validOptionIds.add(id)))
        self.postMessage({ type: 'RESULT', count: final.length, solutions: final, validOptionIds })
    }
}