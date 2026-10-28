import type { Person } from '../domain/types'
import { DEFAULT_SETTINGS, sanitizePersisted } from './sanitize'

const me: Person = { id: 'me', name: '', city: 'Kyiv', zone: 'Europe/Kyiv', start: 540, end: 1080, workDays: [1, 2, 3, 4, 5], me: true }
const max = { id: 'p1', name: 'Max', city: 'New York', zone: 'America/New_York', start: 540, end: 1080, workDays: [1, 2, 3, 4, 5], groupIds: ['g1', 'gone'] }
const call = { id: 'c1', title: 'Sync', weekday: 3, minute: 960, duration: 60, personIds: ['p1', 'ghost'], remind: 10 }

describe('sanitizePersisted', () => {
    it('keeps valid data and drops dangling references', () => {
        const result = sanitizePersisted({ people: [me, max], calls: [call], groups: [{ id: 'g1', name: 'Acme' }], activeGroupId: 'g1', settings: { ...DEFAULT_SETTINGS, lang: 'uk' } }, me)
        expect(result.people.map((entry) => entry.id)).toEqual(['me', 'p1'])
        expect(result.people[1].groupIds).toEqual(['g1'])
        expect(result.calls[0].personIds).toEqual(['p1'])
        expect(result.activeGroupId).toBe('g1')
        expect(result.settings.lang).toBe('uk')
    })

    it('drops people with an unknown time zone or bad hours', () => {
        const result = sanitizePersisted({ people: [me, { ...max, zone: 'Mars/Base' }, { ...max, id: 'p2', start: 5000 }, { ...max, id: 'p3', workDays: [] }] }, me)
        expect(result.people.map((entry) => entry.id)).toEqual(['me'])
    })

    it('falls back to the default first person and settings for garbage', () => {
        const result = sanitizePersisted({ people: 'nope', calls: 7, groups: null, settings: { lang: 'xx', minWindow: 7, theme: 'neon', hour12: 'yes' } }, me)
        expect(result.people).toEqual([me])
        expect(result.calls).toEqual([])
        expect(result.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('never lets the first person be duplicated or put in groups', () => {
        const result = sanitizePersisted({ people: [{ ...me, groupIds: ['g1'] }, { ...me, id: 'me2' }, max], groups: [{ id: 'g1', name: 'A' }] }, me)
        expect(result.people.filter((entry) => entry.me)).toHaveLength(1)
        expect(result.people[0].groupIds).toBeUndefined()
    })

    it('deduplicates ids and rejects calls with bad numbers', () => {
        const result = sanitizePersisted({ people: [me, max, max], calls: [call, call, { ...call, id: 'c2', duration: 99999 }, { ...call, id: 'c3', weekday: 9 }] }, me)
        expect(result.people).toHaveLength(2)
        expect(result.calls.map((entry) => entry.id)).toEqual(['c1'])
    })

    it('resets an unsupported reminder to off', () => {
        const result = sanitizePersisted({ people: [me, max], calls: [{ ...call, remind: 17 }] }, me)
        expect(result.calls[0].remind).toBe(0)
    })

    it('clears an active group that does not exist', () => {
        expect(sanitizePersisted({ people: [me], activeGroupId: 'missing' }, me).activeGroupId).toBeNull()
    })
})
