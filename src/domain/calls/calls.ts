import type { IsoWeekday, Person } from '../types'
import { dayStartAt, localClock } from '../time/localTime'

export interface SavedCall {
    id: string
    title: string
    weekday: IsoWeekday
    minute: number
    duration: number
    personIds: string[]
    remind: number
    notificationId?: string
}

export const REMIND_OPTIONS = [0, 10, 30, 60] as const
export const DEFAULT_REMIND = 10

const MAX_SEARCH_DAYS = 8
const MINUTE_MS = 60000

export function callKey(call: Pick<SavedCall, 'weekday' | 'minute' | 'duration'>): string {
    return `${call.weekday}-${call.minute}-${call.duration}`
}

export function createCall(input: { id: string; title: string; startMs: number; duration: number; zone: string; people: Person[]; remind?: number }): SavedCall {
    const clock = localClock(input.startMs, input.zone)
    return {
        id: input.id,
        title: input.title,
        weekday: clock.isoWeekday,
        minute: clock.minutes,
        duration: input.duration,
        personIds: input.people.filter((person) => !person.me).map((person) => person.id),
        remind: input.remind ?? DEFAULT_REMIND,
    }
}

export function nextOccurrence(call: SavedCall, nowMs: number, zone: string): number {
    let fallback = nowMs
    for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset++) {
        let at = dayStartAt(nowMs, zone, offset) + call.minute * MINUTE_MS
        at += (call.minute - localClock(at, zone).minutes) * MINUTE_MS
        fallback = at
        if (localClock(at, zone).isoWeekday === call.weekday && at >= nowMs) return at
    }
    return fallback
}

export function callParticipants(call: SavedCall, people: Person[]): Person[] {
    return people.filter((person) => person.me || call.personIds.includes(person.id))
}

export interface WeeklyTrigger {
    weekday: number
    hour: number
    minute: number
}

export function reminderTrigger(call: SavedCall, zone: string, deviceZone: string, nowMs: number): WeeklyTrigger {
    const at = nextOccurrence(call, nowMs, zone) - call.remind * MINUTE_MS
    const clock = localClock(at, deviceZone)
    return { weekday: clock.isoWeekday === 7 ? 1 : clock.isoWeekday + 1, hour: Math.floor(clock.minutes / 60), minute: clock.minutes % 60 }
}
