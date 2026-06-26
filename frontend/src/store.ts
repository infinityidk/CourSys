import { create } from 'zustand'
import type { Slot } from './bindings/Slot'
import type { UserInfoResponse } from './bindings/UserInfoResponse'
import type { SolverSolution } from './utils/solver'

export interface CartOption { id: string, code: string, name: string, classTeacher: string | null, groupTeacher: string | null, slots: Slot[], classSlots?: Slot[], groupSlots?: Slot[], credits: string }
export interface CartGroup { id: string, name: string, target: number, options: CartOption[] }

interface AppState {
    // App state
    tab: string
    semester: string
    plannerSemester: string | null
    user: UserInfoResponse | null

    // Planner
    cart: Record<string, CartGroup>
    blocked: Slot[]
    validIds: Set<string>
    solutions: SolverSolution[]
    modals: { blocked: boolean; result: boolean }

    // Setters
    setTab: (t: string) => void
    setSemester: (s: string) => void
    setPlannerSemester: (s: string | null) => void
    setUser: (u: UserInfoResponse) => void
    setModals: (m: { blocked: boolean; result: boolean }) => void
    clearPlanner: () => void

    // Cart actions
    addToGroup: (courseCode: string, courseName: string, groupId: string | null, opts: CartOption[]) => void
    toggleCartOption: (courseCode: string, courseName: string, opt: CartOption) => void
    removeCartOption: (courseCode: string, optId: string) => void
    removeCartGroup: (code: string) => void
    updateCartGroup: (code: string, delta: Partial<CartGroup>) => void
    setValidIds: (ids: Set<string>) => void
    setSolutions: (sols: SolverSolution[]) => void
    setCart: (cart: Record<string, CartGroup>) => void

    // Blocked time
    toggleBlocked: (day: number, period: number) => void
}

export const useStore = create<AppState>((set) => ({
    tab: 'home',
    semester: '',
    plannerSemester: null,
    user: null,
    cart: {},
    blocked: [],
    validIds: new Set(),
    solutions: [],
    modals: { blocked: false, result: false },

    setTab: (t) => { set({ tab: t }); localStorage.setItem('coursys_tab', t) },
    setSemester: (s) => set({ semester: s }),
    setPlannerSemester: (s) => set({ plannerSemester: s }),
    setUser: (u) => set({ user: u }),
    setModals: (m) => set({ modals: m }),
    setValidIds: (ids) => set({ validIds: ids }),
    setSolutions: (sols) => set({ solutions: sols }),

    clearPlanner: () => set({
        cart: {},
        validIds: new Set(),
        solutions: [],
        plannerSemester: null
    }),

    addToGroup: (code, name, groupId, opts) => set(s => {
        const c = { ...s.cart }
        if (groupId && c[groupId]) {
            // Add to existing group
            const toAdd = opts.filter(o => !c[groupId].options.some(e => e.id === o.id))
            c[groupId] = { ...c[groupId], options: [...c[groupId].options, ...toAdd] }
        } else if (!groupId) {
            // Create new group under course code
            if (!c[code]) {
                c[code] = { id: code, name, target: 1, options: opts }
            } else {
                const toAdd = opts.filter(o => !c[code].options.some(e => e.id === o.id))
                c[code] = { ...c[code], options: [...c[code].options, ...toAdd] }
            }
        }
        return { cart: c }
    }),

    toggleCartOption: (_code, _name, opt) => set(s => {
        const c = { ...s.cart }
        // Find which group actually contains this option
        for (const key of Object.keys(c)) {
            const idx = c[key].options.findIndex(o => o.id === opt.id)
            if (idx !== -1) {
                c[key] = { ...c[key], options: c[key].options.filter(o => o.id !== opt.id) }
                if (c[key].options.length === 0) delete c[key]
                return { cart: c }
            }
        }
        // Not found anywhere, should not happen for toggle-remove, but add as fallback
        if (!c[_code]) c[_code] = { id: _code, name: _name, target: 1, options: [opt] }
        else c[_code].options.push(opt)
        return { cart: c }
    }),

    removeCartOption: (code, optId) => set(s => {
        const c = { ...s.cart }
        if (c[code]) {
            c[code] = { ...c[code], options: c[code].options.filter(o => o.id !== optId) }
            if (c[code].options.length === 0) delete c[code]
        }
        return { cart: c }
    }),

    removeCartGroup: (code) => set(s => {
        const c = { ...s.cart }; delete c[code]; return { cart: c }
    }),

    updateCartGroup: (code, delta) => set(s => {
        const c = { ...s.cart }
        if (c[code]) c[code] = { ...c[code], ...delta }
        return { cart: c }
    }),

    setCart: (cart) => set({ cart }),

    toggleBlocked: (day, period) => set(s => {
        const exists = s.blocked.some(b => b.day === day && b.period[0] === period)
        return {
            blocked: exists
                ? s.blocked.filter(b => !(b.day === day && b.period[0] === period))
                : [...s.blocked, { day, period: [period, period] as [number, number], weeks: Array.from({ length: 30 }, (_, i) => i + 1), room: '' }]
        }
    }),
}))