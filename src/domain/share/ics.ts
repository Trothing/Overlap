export interface IcsEvent {
    start: number
    duration: number
    title: string
    description: string
    stamp: number
}

const MAX_LINE_BYTES = 75

function stamp(ms: number): string {
    return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

function byteLength(character: string): number {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x80) return 1
    if (code < 0x800) return 2
    if (code < 0x10000) return 3
    return 4
}

export function foldLine(line: string): string {
    const parts: string[] = []
    let current = ''
    let bytes = 0
    for (const character of line) {
        const size = byteLength(character)
        const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1
        if (bytes + size > limit) {
            parts.push(current)
            current = ''
            bytes = 0
        }
        current += character
        bytes += size
    }
    parts.push(current)
    return parts.join('\r\n ')
}

export function buildIcs(event: IcsEvent): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Overlap//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${event.start}-${event.duration}@overlap`,
        `DTSTAMP:${stamp(event.stamp)}`,
        `DTSTART:${stamp(event.start)}`,
        `DTEND:${stamp(event.start + event.duration * 60000)}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ]
    return `${lines.map(foldLine).join('\r\n')}\r\n`
}
