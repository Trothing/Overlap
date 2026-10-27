import { localClock, localParts, utcOffsetAt, offsetMinutes } from './localTime'

const ZONES = ['Europe/Kyiv', 'America/New_York', 'Europe/Berlin', 'Asia/Kathmandu', 'Asia/Kolkata', 'Pacific/Chatham', 'Australia/Lord_Howe', 'Pacific/Honolulu', 'Australia/Sydney', 'America/Sao_Paulo', 'Africa/Cairo', 'UTC']

describe('localClock', () => {
    it('matches the formatter-based local parts across two years', () => {
        const from = Date.UTC(2025, 0, 1)
        const step = 15 * 60000 * 7
        for (const zone of ZONES) {
            for (let ms = from; ms < from + 2 * 366 * 86400000; ms += step) {
                const reference = localParts(ms, zone)
                const fast = localClock(ms, zone)
                if (fast.minutes !== reference.hour * 60 + reference.minute || fast.isoWeekday !== reference.isoWeekday) {
                    throw new Error(`${zone} ${new Date(ms).toISOString()}: ${JSON.stringify(fast)} vs ${JSON.stringify(reference)}`)
                }
            }
        }
    })

    it('switches offset exactly at the transition minute', () => {
        const change = Date.UTC(2026, 2, 8, 7, 0)
        expect(utcOffsetAt(change - 60000, 'America/New_York')).toBe(-300)
        expect(utcOffsetAt(change, 'America/New_York')).toBe(-240)
        const autumn = Date.UTC(2026, 9, 25, 1, 0)
        expect(utcOffsetAt(autumn - 60000, 'Europe/Berlin')).toBe(120)
        expect(utcOffsetAt(autumn, 'Europe/Berlin')).toBe(60)
    })

    it('agrees with the direct offset at every minute around a change', () => {
        const change = Date.UTC(2026, 2, 29, 1, 0)
        for (let ms = change - 5 * 60000; ms <= change + 5 * 60000; ms += 60000) {
            expect(utcOffsetAt(ms, 'Europe/Berlin')).toBe(offsetMinutes(ms, 'Europe/Berlin'))
        }
    })

    it('handles instants before 1970', () => {
        const ms = Date.UTC(1969, 11, 31, 23, 0)
        const reference = localParts(ms, 'UTC')
        const fast = localClock(ms, 'UTC')
        expect(fast.minutes).toBe(reference.hour * 60 + reference.minute)
        expect(fast.isoWeekday).toBe(reference.isoWeekday)
    })
})
