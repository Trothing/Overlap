import type { Person } from '../types'
import { utcOffsetAt } from './localTime'

export interface ClockShift {
    person: Person
    at: number
    shift: number
}

const DAY_MS = 86400000
const MINUTE_MS = 60000
const DEFAULT_HORIZON_DAYS = 45

function gap(person: Person, me: Person, ms: number): number {
    return utcOffsetAt(ms, person.zone) - utcOffsetAt(ms, me.zone)
}

function locateChange(person: Person, me: Person, low: number, high: number, before: number): number {
    let a = low
    let b = high
    while (b - a > MINUTE_MS) {
        const mid = a + Math.floor((b - a) / (2 * MINUTE_MS)) * MINUTE_MS
        if (gap(person, me, mid) === before) a = mid
        else b = mid
    }
    return b
}

export function findClockShifts(people: Person[], fromMs: number, horizonDays: number = DEFAULT_HORIZON_DAYS): ClockShift[] {
    if (people.length < 2) return []
    const me = people[0]
    const found: ClockShift[] = []

    for (const person of people.slice(1)) {
        if (person.zone === me.zone) continue
        let previousAt = fromMs
        let previousGap = gap(person, me, fromMs)
        for (let day = 1; day <= horizonDays; day++) {
            const at = fromMs + day * DAY_MS
            const current = gap(person, me, at)
            if (current !== previousGap) {
                found.push({ person, at: locateChange(person, me, previousAt, at, previousGap), shift: current - previousGap })
                previousGap = current
            }
            previousAt = at
        }
    }

    return found.sort((a, b) => a.at - b.at)
}
