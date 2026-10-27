import type { IsoWeekday, Person, Status } from '../types'
import { localClock } from './localTime'

export const SEVERITY: Record<Status, number> = { core: 0, shoulder: 1, late: 2, sleep: 3, off: 3 }

const MINUTES_PER_DAY = 1440

export function statusAt(person: Person, ms: number): Status {
    const { minutes, isoWeekday } = localClock(ms, person.zone)
    const overnight = person.start > person.end
    const cycleDay = (overnight && minutes < person.start ? ((isoWeekday + 5) % 7) + 1 : isoWeekday) as IsoWeekday
    if (!person.workDays.includes(cycleDay)) return 'off'
    const length = (person.end - person.start + MINUTES_PER_DAY) % MINUTES_PER_DAY
    const offset = (minutes - person.start + MINUTES_PER_DAY) % MINUTES_PER_DAY
    if (offset < length) return 'core'
    if (offset >= MINUTES_PER_DAY - 90 || (offset >= length && offset < length + 150)) return 'shoulder'
    if (offset >= MINUTES_PER_DAY - 180 || (offset >= length + 150 && offset < length + 330)) return 'late'
    return 'sleep'
}

export function worstStatus(people: Person[], ms: number): Status {
    let worst: Status = 'core'
    for (const person of people) {
        const status = statusAt(person, ms)
        if (SEVERITY[status] > SEVERITY[worst]) worst = status
    }
    return worst
}
