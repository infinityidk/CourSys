export interface Slot {
    weeks: number[]
    day: number
    periods: number[]
    room: string
    kind: string
}

export interface Option {
    name: string
    teacher: string
    capacity: string
    seats: string
    slots: Slot[]
}

export interface Task {
    className: string
    teacher: string
    lang: string
    options: Option[]
}

export interface ScheduleCourse {
    code: string
    courseId: string
    name: string
    credits: string
    era: string
    dept: string
    category: string
    type: string
    target?: string
    req?: string
    status?: string
    score?: string
    grade?: string
    tasks: Task[]
}

export interface GradeItem {
    code: string
    name: string
    credits: string
    score: string
    grade: string
    era: string
}