export type Status = 'core' | 'shoulder' | 'late' | 'sleep' | 'off'

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Person {
    id: string
    name: string
    city: string
    region?: string
    zone: string
    start: number
    end: number
    workDays: IsoWeekday[]
    me?: boolean
    sample?: boolean
}

export interface LocalParts {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    isoWeekday: IsoWeekday
}

export interface WindowIssue {
    person: Person
    status: Status
}

export interface OverlapWindow {
    start: number
    end: number
    tier: number
    penalty: number
    cells: number
    issues: WindowIssue[]
}

export interface Segment {
    status: Status
    from: number
    to: number
}
