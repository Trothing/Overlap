import type { IsoWeekday, Person } from '../types'
import { findClockShifts } from './dst'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]

function person(name: string, zone: string): Person {
    return { id: name, name, city: name, zone, start: 540, end: 1080, workDays: WORKWEEK }
}

const me = person('You', 'Europe/Kyiv')
const max = person('Max', 'America/New_York')

describe('findClockShifts', () => {
    it('finds the US autumn change that Europe already made', () => {
        const shifts = findClockShifts([me, max], Date.UTC(2026, 9, 27, 12, 0), 14)
        expect(shifts).toHaveLength(1)
        expect(shifts[0].at).toBe(Date.UTC(2026, 10, 1, 6, 0))
        expect(shifts[0].shift).toBe(-60)
        expect(shifts[0].person.name).toBe('Max')
    })

    it('reports both changes of the week between the US and Europe in spring', () => {
        const shifts = findClockShifts([me, max], Date.UTC(2026, 2, 1, 12, 0), 45)
        expect(shifts.map((entry) => [entry.at, entry.shift])).toEqual([
            [Date.UTC(2026, 2, 8, 7, 0), 60],
            [Date.UTC(2026, 2, 29, 1, 0), -60],
        ])
    })

    it('finds nothing when both zones change together', () => {
        const berlin = person('Lena', 'Europe/Berlin')
        expect(findClockShifts([me, berlin], Date.UTC(2026, 2, 1, 12, 0), 45)).toEqual([])
    })

    it('finds nothing for zones without daylight saving', () => {
        const tokyo = person('Aiko', 'Asia/Tokyo')
        expect(findClockShifts([person('You', 'Asia/Kolkata'), tokyo], Date.UTC(2026, 0, 1), 365)).toEqual([])
    })

    it('reports a change of the first person against everyone else', () => {
        const tokyo = person('Aiko', 'Asia/Tokyo')
        const shifts = findClockShifts([me, tokyo], Date.UTC(2026, 2, 20, 12, 0), 14)
        expect(shifts).toHaveLength(1)
        expect(shifts[0].shift).toBe(-60)
    })

    it('handles half-hour daylight saving', () => {
        const lordHowe = person('Sam', 'Australia/Lord_Howe')
        const shifts = findClockShifts([person('You', 'UTC'), lordHowe], Date.UTC(2026, 9, 1, 0, 0), 14)
        expect(shifts).toHaveLength(1)
        expect(shifts[0].shift).toBe(30)
    })

    it('needs at least two people', () => {
        expect(findClockShifts([me], Date.UTC(2026, 9, 27), 30)).toEqual([])
    })
})
