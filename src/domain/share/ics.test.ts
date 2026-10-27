import { buildIcs, foldLine } from './ics'

const base = { start: Date.UTC(2026, 9, 28, 13, 0), duration: 60, title: 'Overlap call', description: 'Line one', stamp: Date.UTC(2026, 9, 27, 8, 30, 15) }

describe('buildIcs', () => {
    it('writes a complete calendar with CRLF line endings', () => {
        const ics = buildIcs(base)
        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
        expect(ics.split('\r\n').every((line) => !line.includes('\n'))).toBe(true)
    })

    it('writes start, end and stamp in UTC', () => {
        const ics = buildIcs(base)
        expect(ics).toContain('DTSTART:20261028T130000Z')
        expect(ics).toContain('DTEND:20261028T140000Z')
        expect(ics).toContain('DTSTAMP:20261027T083015Z')
    })

    it('uses a stable uid for the same slot', () => {
        expect(buildIcs(base)).toContain(`UID:${base.start}-60@overlap`)
    })

    it('escapes special characters and newlines', () => {
        const slash = String.fromCharCode(92)
        const ics = buildIcs({ ...base, title: ['A, B; C', 'D'].join(slash), description: ['one', 'two'].join('\n') })
        expect(ics).toContain(`SUMMARY:A${slash}, B${slash}; C${slash}${slash}D`)
        expect(ics).toContain(['DESCRIPTION:one', 'two'].join(`${slash}n`))
    })

    it('crosses midnight when the slot does', () => {
        expect(buildIcs({ ...base, start: Date.UTC(2026, 9, 28, 23, 30) })).toContain('DTEND:20261029T003000Z')
    })
})

describe('foldLine', () => {
    it('keeps short lines unchanged', () => {
        expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short')
    })

    it('folds long lines at 75 bytes and continues with a space', () => {
        const folded = foldLine(`DESCRIPTION:${'a'.repeat(200)}`)
        const lines = folded.split('\r\n')
        expect(lines[0]).toHaveLength(75)
        expect(lines.slice(1).every((line) => line.startsWith(' ') && line.length <= 75)).toBe(true)
        expect(lines.map((line, index) => (index === 0 ? line : line.slice(1))).join('')).toBe(`DESCRIPTION:${'a'.repeat(200)}`)
    })

    it('never splits a multi-byte character', () => {
        const text = `SUMMARY:${'Київ'.repeat(30)}`
        const folded = foldLine(text)
        const joined = folded.split('\r\n').map((line, index) => (index === 0 ? line : line.slice(1))).join('')
        expect(joined).toBe(text)
        const bytes = (value: string) => Buffer.byteLength(value, 'utf8')
        expect(folded.split('\r\n').every((line) => bytes(line) <= 75)).toBe(true)
    })
})
