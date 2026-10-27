import type { IsoWeekday, Person } from '../types'
import { callKey, callParticipants, createCall, nextOccurrence, reminderTrigger, type SavedCall } from './calls'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]
const person = (id: string, zone: string, me = false): Person => ({ id, name: id, city: id, zone, start: 540, end: 1080, workDays: WORKWEEK, ...(me ? { me: true } : {}) })
const people = [person('me', 'Europe/Kyiv', true), person('max', 'America/New_York'), person('lena', 'Europe/Berlin')]

const wednesday16: SavedCall = { id: 'c1', title: 'Sync', weekday: 3, minute: 16 * 60, duration: 60, personIds: ['max'], remind: 10 }

describe('createCall', () => {
    it('stores the weekday and minute in the first persons zone', () => {
        const start = Date.UTC(2026, 9, 28, 14, 0)
        const call = createCall({ id: 'c', title: 'Sync', startMs: start, duration: 60, zone: 'Europe/Kyiv', people })
        expect(call.weekday).toBe(3)
        expect(call.minute).toBe(16 * 60)
        expect(call.personIds).toEqual(['max', 'lena'])
        expect(call.remind).toBe(10)
    })
})

describe('nextOccurrence', () => {
    it('returns the same day when the time has not passed yet', () => {
        const now = Date.UTC(2026, 9, 28, 8, 0)
        expect(nextOccurrence(wednesday16, now, 'Europe/Kyiv')).toBe(Date.UTC(2026, 9, 28, 14, 0))
    })

    it('returns next week when the time has passed', () => {
        const now = Date.UTC(2026, 9, 28, 15, 0)
        expect(nextOccurrence(wednesday16, now, 'Europe/Kyiv')).toBe(Date.UTC(2026, 10, 4, 14, 0))
    })

    it('keeps the local time across a daylight saving change', () => {
        const now = Date.UTC(2026, 9, 24, 12, 0)
        const call: SavedCall = { ...wednesday16, weekday: 1, minute: 9 * 60 }
        const next = nextOccurrence(call, now, 'Europe/Kyiv')
        expect(next).toBe(Date.UTC(2026, 9, 26, 7, 0))
        const afterChange = nextOccurrence(call, Date.UTC(2026, 10, 1, 12, 0), 'America/New_York')
        expect(afterChange).toBe(Date.UTC(2026, 10, 2, 14, 0))
    })

    it('lands exactly on the requested local minute on the day clocks change', () => {
        const call: SavedCall = { ...wednesday16, weekday: 7, minute: 12 * 60 }
        const next = nextOccurrence(call, Date.UTC(2026, 9, 24, 12, 0), 'Europe/Kyiv')
        expect(next).toBe(Date.UTC(2026, 9, 25, 10, 0))
    })
})

describe('callParticipants', () => {
    it('keeps the first person and the chosen ones in list order', () => {
        expect(callParticipants(wednesday16, people).map((entry) => entry.id)).toEqual(['me', 'max'])
    })
})

describe('reminderTrigger', () => {
    it('uses the device clock and expo weekday numbering', () => {
        const trigger = reminderTrigger(wednesday16, 'Europe/Kyiv', 'Europe/Kyiv', Date.UTC(2026, 9, 27, 8, 0))
        expect(trigger).toEqual({ weekday: 4, hour: 15, minute: 50 })
    })

    it('wraps to the previous day when the reminder falls before midnight', () => {
        const call: SavedCall = { ...wednesday16, weekday: 1, minute: 5, remind: 30 }
        const trigger = reminderTrigger(call, 'UTC', 'UTC', Date.UTC(2026, 9, 27, 8, 0))
        expect(trigger).toEqual({ weekday: 1, hour: 23, minute: 35 })
    })

    it('maps Sunday to 1', () => {
        const call: SavedCall = { ...wednesday16, weekday: 7, minute: 600, remind: 0 }
        expect(reminderTrigger(call, 'UTC', 'UTC', Date.UTC(2026, 9, 27)).weekday).toBe(1)
    })
})

describe('callKey', () => {
    it('is the same for the same weekday, time and length', () => {
        expect(callKey(wednesday16)).toBe(callKey({ weekday: 3, minute: 960, duration: 60 }))
        expect(callKey(wednesday16)).not.toBe(callKey({ weekday: 3, minute: 960, duration: 30 }))
    })
})
