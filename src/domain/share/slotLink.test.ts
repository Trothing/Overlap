import { buildSlotLink, durationOptions, parseSlot, slotQuery } from './slotLink'

const start = Date.UTC(2026, 9, 28, 13, 0)

describe('slotQuery', () => {
    it('writes the version, start and duration', () => {
        expect(slotQuery({ start, duration: 60, title: '' })).toBe(`v=1&t=${start}&d=60`)
    })

    it('encodes and trims the title', () => {
        expect(slotQuery({ start, duration: 30, title: '  Sync & plan  ' })).toBe(`v=1&t=${start}&d=30&n=Sync%20%26%20plan`)
    })

    it('limits the title to 60 characters', () => {
        const query = slotQuery({ start, duration: 30, title: 'x'.repeat(100) })
        expect(decodeURIComponent(query.split('&n=')[1])).toHaveLength(60)
    })
})

describe('buildSlotLink', () => {
    it('appends the query to a base without one', () => {
        expect(buildSlotLink('https://host.example/overlap/', { start, duration: 45, title: '' })).toBe(`https://host.example/overlap/?v=1&t=${start}&d=45`)
    })

    it('extends a base that already has a query', () => {
        expect(buildSlotLink('https://host.example/?lang=uk', { start, duration: 45, title: '' })).toContain('?lang=uk&v=1&t=')
    })

    it('works with the app scheme', () => {
        expect(buildSlotLink('overlap://s', { start, duration: 90, title: '' })).toBe(`overlap://s?v=1&t=${start}&d=90`)
    })
})

describe('parseSlot', () => {
    it('round-trips a built link', () => {
        const params = Object.fromEntries(new URLSearchParams(slotQuery({ start, duration: 45, title: 'Sync' })))
        expect(parseSlot(params)).toEqual({ start, duration: 45, title: 'Sync' })
    })

    it('rejects an unknown version', () => {
        expect(parseSlot({ v: '2', t: String(start), d: '60' })).toBeNull()
    })

    it('rejects a missing or non-numeric start', () => {
        expect(parseSlot({ v: '1', d: '60' })).toBeNull()
        expect(parseSlot({ v: '1', t: 'abc', d: '60' })).toBeNull()
    })

    it('rejects a start outside the supported years', () => {
        expect(parseSlot({ v: '1', t: '0', d: '60' })).toBeNull()
        expect(parseSlot({ v: '1', t: String(Date.UTC(2200, 0, 1)), d: '60' })).toBeNull()
    })

    it('rejects a duration out of range', () => {
        expect(parseSlot({ v: '1', t: String(start), d: '2' })).toBeNull()
        expect(parseSlot({ v: '1', t: String(start), d: '9999' })).toBeNull()
    })

    it('defaults the duration to 60 minutes', () => {
        expect(parseSlot({ v: '1', t: String(start) })?.duration).toBe(60)
    })

    it('strips control characters from the title', () => {
        expect(parseSlot({ v: '1', t: String(start), d: '60', n: 'a\nb' })?.title).toBe('a b')
    })

    it('takes the first value of a repeated parameter', () => {
        expect(parseSlot({ v: ['1', '2'], t: [String(start)], d: '60' })).not.toBeNull()
    })
})

describe('durationOptions', () => {
    it('lists the standard lengths', () => {
        expect(durationOptions(60)).toEqual([30, 45, 60, 90])
    })

    it('adds a length that came from a link', () => {
        expect(durationOptions(120)).toEqual([30, 45, 60, 90, 120])
    })
})
