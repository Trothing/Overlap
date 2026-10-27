import type { IsoWeekday, Person } from '../types'

export type DraftError = 'needName' | 'needCity' | 'needHours'

export interface PersonDraft {
    id: string
    name: string
    city: string
    region: string
    zone: string
    start: number
    end: number
    workDays: IsoWeekday[]
    me: boolean
    isNew: boolean
}

const DEFAULT_START = 540
const DEFAULT_END = 1080
const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]
const MAX_NAME_LENGTH = 30

export function newDraft(id: string): PersonDraft {
    return { id, name: '', city: '', region: '', zone: '', start: DEFAULT_START, end: DEFAULT_END, workDays: [...WORKWEEK], me: false, isNew: true }
}

export function draftFromPerson(person: Person): PersonDraft {
    return {
        id: person.id,
        name: person.name,
        city: person.city,
        region: person.region ?? '',
        zone: person.zone,
        start: person.start,
        end: person.end,
        workDays: [...person.workDays],
        me: Boolean(person.me),
        isNew: false,
    }
}

export function toggleDay(days: IsoWeekday[], day: IsoWeekday): IsoWeekday[] {
    return days.includes(day) ? days.filter((entry) => entry !== day) : [...days, day].sort((a, b) => a - b)
}

export function validateDraft(draft: PersonDraft): DraftError | null {
    if (!draft.me) {
        if (draft.name.trim().length === 0) return 'needName'
        if (!draft.zone) return 'needCity'
    }
    if (draft.start === draft.end || draft.workDays.length === 0) return 'needHours'
    return null
}

export function draftToPerson(draft: PersonDraft): Person {
    const person: Person = {
        id: draft.id,
        name: draft.me ? draft.name : draft.name.trim().slice(0, MAX_NAME_LENGTH),
        city: draft.city,
        zone: draft.zone,
        start: draft.start,
        end: draft.end,
        workDays: draft.workDays,
    }
    if (draft.region) person.region = draft.region
    if (draft.me) person.me = true
    return person
}

export { MAX_NAME_LENGTH }
