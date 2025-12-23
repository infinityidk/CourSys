export interface Slot {
    weeks: number[]
    day: number
    periods: number[]
    room: string
    kind: string
}
export interface Option {
    name: string
    teacher?: string
    capacity: string
    seats: string
    slots: Slot[]
}
export interface Task {
    className: string
    teacher: string
    options: Option[]
    forbidden: boolean
    allowedTarget?: string
    deniedTarget?: string
}
export interface ScheduleCourse {
    code: string
    name: string
    credits: string
    era: string
    dept: string
    category: string
    type?: string
    courseId?: string
    req?: string
    tasks?: Task[]
    status?: string
    score?: string
    grade?: string
    pending?: { code: string; name: string }[]
    missing?: { code: string; name: string }[][]
    semester?: string
    forbidden?: boolean
}
export interface GradeItem {
    code: string
    name: string
    credits: string
    score: string
    grade: string
    semester: string
}
export interface TimetableCourse {
    code: string
    className: string
    type?: string
    category: string
    dept: string
    grading: string
    teacher: string
    credits: string
    slots: Slot[]
}