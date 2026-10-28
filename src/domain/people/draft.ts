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
    allDay: boolean
    groupIds: string[]
    me: boolean
    isNew: boolean
}

const DEFAULT_START = 540
const DEFAULT_END = 1080
const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]
const MAX_NAME_LENGTH = 30
const MAX_PLACE_LENGTH = 80

export function newDraft(id: string, groupIds: string[] = []): PersonDraft {
    return { id, name: '', city: '', region: '', zone: '', start: DEFAULT_START, end: DEFAULT_END, workDays: [...WORKWEEK], allDay: false, groupIds: [...groupIds], me: false, isNew: true }
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
        allDay: Boolean(person.allDay),
        groupIds: [...(person.groupIds ?? [])],
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
    if ((draft.start === draft.end && !draft.allDay) || draft.workDays.length === 0) return 'needHours'
    return null
}

export function draftToPerson(draft: PersonDraft): Person {
    const person: Person = {
        id: draft.id,
        name: draft.me ? draft.name : draft.name.trim().slice(0, MAX_NAME_LENGTH),
        city: draft.city.slice(0, MAX_PLACE_LENGTH),
        zone: draft.zone,
        start: draft.start,
        end: draft.end,
        workDays: draft.workDays,
    }
    if (draft.region) person.region = draft.region.slice(0, MAX_PLACE_LENGTH)
    if (draft.allDay) person.allDay = true
    if (draft.groupIds.length > 0 && !draft.me) person.groupIds = draft.groupIds
    if (draft.me) person.me = true
    return person
}

export { MAX_NAME_LENGTH }
