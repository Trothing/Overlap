import type { IsoWeekday, Person } from '../types'
import { coreOverlap, findWindows, friendlyOverlap, segments } from './windows'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]

function person(zone: string): Person {
    return { id: zone, name: zone, city: zone, zone, start: 540, end: 1080, workDays: WORKWEEK }
}

const monday = Date.parse('2026-10-26T00:00:00Z')

describe('findWindows', () => {
    it('finds the shared working hours of Kyiv and New York as the best window', () => {
        const windows = findWindows([person('Europe/Kyiv'), person('America/New_York')], monday, 1, 30)
        expect(windows.length).toBeGreaterThan(0)
        const best = windows[0]
        expect(best.tier).toBe(0)
        expect(new Date(best.start).toISOString()).toBe('2026-10-26T13:00:00.000Z')
        expect(new Date(best.end).toISOString()).toBe('2026-10-26T16:00:00.000Z')
        expect(best.issues).toEqual([])
    })

    it('ranks windows with someone in the evening below full working overlap', () => {
        const windows = findWindows([person('Europe/Kyiv'), person('America/New_York')], monday, 1, 30)
        const tiers = windows.map((window) => window.tier)
        expect(tiers).toEqual([...tiers].sort((a, b) => a - b))
    })

    it('drops windows shorter than the minimum', () => {
        const windows = findWindows([person('Europe/Kyiv'), person('America/New_York')], monday, 1, 180)
        expect(windows.every((window) => (window.end - window.start) / 60000 >= 180)).toBe(true)
    })

    it('finds nothing when there is no playable time', () => {
        const night = { ...person('UTC'), start: 0, end: 60 }
        const day = { ...person('UTC'), start: 720, end: 780 }
        expect(findWindows([night, day], monday, 1, 30)).toEqual([])
    })

    it('uses real instants across a daylight saving change', () => {
        const people = [person('Europe/Kyiv'), person('America/New_York')]
        const beforeEuropeChange = findWindows(people, Date.parse('2026-10-19T00:00:00Z'), 1, 30)[0]
        const afterUsChange = findWindows(people, Date.parse('2026-11-02T00:00:00Z'), 1, 30)[0]
        expect(new Date(beforeEuropeChange.start).toISOString()).toBe('2026-10-19T13:00:00.000Z')
        expect(new Date(beforeEuropeChange.end).toISOString()).toBe('2026-10-19T15:00:00.000Z')
        expect(new Date(afterUsChange.start).toISOString()).toBe('2026-11-02T14:00:00.000Z')
        expect(new Date(afterUsChange.end).toISOString()).toBe('2026-11-02T16:00:00.000Z')
    })
})

describe('segments', () => {
    it('merges neighbouring steps with the same status', () => {
        const result = segments(person('UTC'), monday, 1440)
        expect(result[0].from).toBe(0)
        expect(result[result.length - 1].to).toBe(1440)
        for (let i = 1; i < result.length; i++) expect(result[i].status).not.toBe(result[i - 1].status)
    })
})

describe('coreOverlap', () => {
    it('returns the shared working range of several people', () => {
        const kyiv = segments(person('Europe/Kyiv'), monday, 1440)
        const newYork = segments(person('America/New_York'), monday, 1440)
        const ranges = coreOverlap([kyiv, newYork], 1440)
        expect(ranges).toEqual([{ from: 13 * 60, to: 16 * 60 }])
    })

    it('returns nothing without people or without a shared range', () => {
        expect(coreOverlap([], 1440)).toEqual([])
        const tokyo = segments(person('Asia/Tokyo'), monday, 1440)
        const honolulu = segments({ ...person('Pacific/Honolulu'), start: 1320, end: 360 }, monday, 1440)
        expect(coreOverlap([tokyo, honolulu], 1440)).toEqual([])
    })

    it('matches the full window search for core slots', () => {
        const people = [person('Europe/Kyiv'), person('America/New_York'), person('Europe/Berlin')]
        const ranges = coreOverlap(people.map((p) => segments(p, monday, 1440)), 1440)
        const windows = findWindows(people, monday, 1, 15).filter((w) => w.tier === 0)
        expect(ranges.map((r) => [monday + r.from * 60000, monday + r.to * 60000])).toEqual(windows.map((w) => [w.start, w.end]))
    })
})

describe('friendlyOverlap', () => {
    const lists = [segments(person('Europe/Kyiv'), monday, 1440), segments(person('America/New_York'), monday, 1440)]

    it('contains every shared working range and also the evening hours around it', () => {
        const strict = coreOverlap(lists, 1440)
        const friendly = friendlyOverlap(lists, 1440)
        expect(friendly.length).toBeGreaterThan(0)
        for (const range of strict) expect(friendly.some((entry) => entry.from <= range.from && entry.to >= range.to)).toBe(true)
        expect(friendly[0].to - friendly[0].from).toBeGreaterThan(strict[0].to - strict[0].from)
    })

    it('is empty when someone is asleep for the whole day', () => {
        const night = segments({ ...person('UTC'), start: 0, end: 60, workDays: [] }, monday, 1440)
        expect(friendlyOverlap([night], 1440)).toEqual([])
    })
})
