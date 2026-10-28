import type { IsoWeekday, Person } from '../types'
import { comfortAt, planFrom, suggestSlots, worstIssueStatus } from './suggest'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]

function person(zone: string, overrides: Partial<Person> = {}): Person {
    return { id: zone, name: zone, city: zone, zone, start: 540, end: 1080, workDays: WORKWEEK, ...overrides }
}

const monday = Date.UTC(2026, 9, 26, 0, 0)

describe('comfortAt', () => {
    const p = person('UTC')

    it('peaks in the middle of the shift and falls towards its edges', () => {
        const mid = comfortAt(p, Date.UTC(2026, 9, 26, 13, 30))
        const early = comfortAt(p, Date.UTC(2026, 9, 26, 9, 0))
        const late = comfortAt(p, Date.UTC(2026, 9, 26, 17, 45))
        expect(mid).toBeCloseTo(1, 5)
        expect(early).toBeLessThan(mid)
        expect(late).toBeLessThan(mid)
        expect(comfortAt(p, Date.UTC(2026, 9, 26, 11, 0))).toBeGreaterThan(early)
    })

    it('keeps every working minute above an evening one', () => {
        const worstWorking = comfortAt(p, Date.UTC(2026, 9, 26, 9, 0))
        expect(worstWorking).toBeGreaterThan(comfortAt(p, Date.UTC(2026, 9, 26, 19, 0)))
    })

    it('ranks working above evening, late and asleep', () => {
        const values = [12, 19, 22, 3].map((hour) => comfortAt(p, Date.UTC(2026, 9, 26, hour, 0)))
        expect(values).toEqual([...values].sort((a, b) => b - a))
        expect(values[3]).toBe(0)
    })
})

describe('suggestSlots', () => {
    const people = [person('Europe/Kyiv'), person('America/New_York')]

    it('returns up to three suggestions', () => {
        expect(suggestSlots(people, monday, 60)).toHaveLength(3)
    })

    it('puts a slot in the middle of the shared working hours first', () => {
        const best = suggestSlots(people, monday, 60)[0]
        expect(best.tier).toBe(0)
        expect(best.issues).toEqual([])
        expect(best.score).toBeGreaterThan(0.85)
        const hour = new Date(best.start).getUTCHours() + new Date(best.start).getUTCMinutes() / 60
        expect(hour).toBeGreaterThanOrEqual(13.5)
        expect(hour).toBeLessThanOrEqual(14.5)
    })

    it('keeps suggestions at least three hours apart', () => {
        const slots = suggestSlots(people, monday, 60)
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                const gap = Math.max(slots[i].start - slots[j].end, slots[j].start - slots[i].end)
                expect(gap).toBeGreaterThanOrEqual(180 * 60000)
            }
        }
    })

    it('orders by score and then by start', () => {
        const slots = suggestSlots(people, monday, 60)
        for (let i = 1; i < slots.length; i++) expect(slots[i - 1].score).toBeGreaterThanOrEqual(slots[i].score)
    })

    it('uses the requested length', () => {
        const slot = suggestSlots(people, monday, 45)[0]
        expect((slot.end - slot.start) / 60000).toBe(45)
    })

    it('starts on a half hour in the local time of the first person', () => {
        for (const slot of suggestSlots(people, monday, 60)) {
            const minutes = new Date(slot.start).getUTCMinutes()
            expect([0, 30]).toContain(minutes)
        }
    })

    it('never suggests a slot in the past', () => {
        const now = Date.UTC(2026, 9, 28, 14, 10)
        for (const slot of suggestSlots(people, now, 60)) expect(slot.start).toBeGreaterThanOrEqual(now)
    })

    it('falls back to the least bad slot and lists who is affected', () => {
        const far = [person('Europe/Kyiv'), person('Pacific/Honolulu', { start: 1320, end: 360 })]
        const slot = suggestSlots(far, monday, 60)[0]
        expect(slot.tier).toBeGreaterThanOrEqual(0)
        expect(slot.issues.every((entry) => entry.status !== 'core')).toBe(true)
        expect(worstIssueStatus(slot)).toBe(slot.issues.length === 0 ? 'core' : slot.issues[0].status)
    })

    it('returns nothing when nobody is added', () => {
        expect(suggestSlots([], monday, 60)).toEqual([])
    })

    it('rounds the search start to a quarter hour inside the viewed day', () => {
        const dayStart = Date.UTC(2026, 9, 30, 0, 0)
        expect(planFrom(Date.UTC(2026, 9, 27, 10, 7), dayStart)).toBe(dayStart)
        expect(planFrom(Date.UTC(2026, 9, 27, 10, 7), 0)).toBe(Date.UTC(2026, 9, 27, 10, 0))
    })
})

describe('around the clock people', () => {
    it('are always fully comfortable on their days', () => {
        const always = { ...person('UTC'), allDay: true }
        expect(comfortAt(always, Date.UTC(2026, 9, 27, 3, 0))).toBe(1)
        expect(comfortAt(always, Date.UTC(2026, 9, 27, 14, 0))).toBe(1)
    })

    it('let the other person decide the best time', () => {
        const slots = suggestSlots([{ ...person('Asia/Tokyo'), allDay: true }, person('America/New_York')], monday, 60)
        expect(slots[0].tier).toBe(0)
        expect(slots[0].issues).toEqual([])
    })
})
