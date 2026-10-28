import type { IsoWeekday, Person } from '../types'
import { shoulderSide, statusAt, worstStatus } from './status'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]

function person(overrides: Partial<Person>): Person {
    return { id: 'p', name: 'Test', city: 'Test', zone: 'UTC', start: 540, end: 1080, workDays: WORKWEEK, ...overrides }
}

const at = (iso: string) => Date.parse(iso)

describe('statusAt', () => {
    const day = person({})

    it('is core inside working hours', () => {
        expect(statusAt(day, at('2026-10-27T10:00:00Z'))).toBe('core')
    })

    it('is shoulder up to 90 minutes before and 150 minutes after', () => {
        expect(statusAt(day, at('2026-10-27T07:30:00Z'))).toBe('shoulder')
        expect(statusAt(day, at('2026-10-27T20:29:00Z'))).toBe('shoulder')
    })

    it('is late after the evening shoulder', () => {
        expect(statusAt(day, at('2026-10-27T21:00:00Z'))).toBe('late')
        expect(statusAt(day, at('2026-10-27T06:00:00Z'))).toBe('late')
    })

    it('is sleep in the deep night', () => {
        expect(statusAt(day, at('2026-10-27T01:00:00Z'))).toBe('sleep')
    })

    it('is off on a day that is not a work day', () => {
        expect(statusAt(day, at('2026-10-24T10:00:00Z'))).toBe('off')
    })

    it('follows the local zone, not UTC', () => {
        const tokyo = person({ zone: 'Asia/Tokyo' })
        expect(statusAt(tokyo, at('2026-10-27T02:00:00Z'))).toBe('core')
        expect(statusAt(tokyo, at('2026-10-27T10:00:00Z'))).not.toBe('core')
    })

    it('counts time after midnight toward the weekday an overnight shift started', () => {
        const night = person({ start: 1320, end: 360, workDays: [5] })
        expect(statusAt(night, at('2026-10-23T23:00:00Z'))).toBe('core')
        expect(statusAt(night, at('2026-10-24T03:00:00Z'))).toBe('core')
        expect(statusAt(night, at('2026-10-24T23:00:00Z'))).toBe('off')
        expect(statusAt(night, at('2026-10-23T03:00:00Z'))).toBe('off')
    })
})

describe('worstStatus', () => {
    it('returns the worst of everyone', () => {
        const people = [person({ zone: 'UTC' }), person({ zone: 'Pacific/Honolulu' })]
        expect(worstStatus(people, at('2026-10-27T10:00:00Z'))).toBe('sleep')
    })

    it('is core when everyone is working', () => {
        const people = [person({ zone: 'UTC' }), person({ zone: 'Europe/Berlin' })]
        expect(worstStatus(people, at('2026-10-27T10:00:00Z'))).toBe('core')
    })
})

describe('around the clock', () => {
    const always = person({ allDay: true })

    it('is working at every hour of a working day', () => {
        for (const hour of [0, 3, 7, 12, 19, 23]) expect(statusAt(always, at(`2026-10-27T${String(hour).padStart(2, '0')}:00:00Z`))).toBe('core')
    })

    it('is off on days that are not selected', () => {
        expect(statusAt(always, at('2026-10-24T12:00:00Z'))).toBe('off')
        expect(statusAt(person({ allDay: true, workDays: [1, 2, 3, 4, 5, 6, 7] }), at('2026-10-24T03:00:00Z'))).toBe('core')
    })

    it('does not make a shared slot worse for the other people', () => {
        expect(worstStatus([always, person({ zone: 'UTC' })], at('2026-10-27T10:00:00Z'))).toBe('core')
        expect(worstStatus([always, person({ zone: 'UTC' })], at('2026-10-27T01:00:00Z'))).toBe('sleep')
    })
})

describe('shoulderSide', () => {
    const day = person({})

    it('tells the hours before work from the hours after work', () => {
        expect(shoulderSide(day, at('2026-10-27T07:30:00Z'))).toBe('before')
        expect(shoulderSide(day, at('2026-10-27T19:00:00Z'))).toBe('after')
    })

    it('works for a shift that crosses midnight', () => {
        const night = person({ start: 1320, end: 360 })
        expect(shoulderSide(night, at('2026-10-27T20:45:00Z'))).toBe('before')
        expect(shoulderSide(night, at('2026-10-27T07:30:00Z'))).toBe('after')
    })

    it('agrees with the shoulder status', () => {
        expect(statusAt(day, at('2026-10-27T07:30:00Z'))).toBe('shoulder')
        expect(statusAt(day, at('2026-10-27T19:00:00Z'))).toBe('shoulder')
    })
})
