import type { Person } from '../types'

export interface SlotFormatters {
    callAt: string
    day: (ms: number, zone: string) => string
    time: (ms: number, zone: string) => string
}

export function slotText(people: Person[], startMs: number, durationMinutes: number, formatters: SlotFormatters): string {
    const endMs = startMs + durationMinutes * 60000
    const me = people[0]
    const lines = [`${formatters.callAt}: ${formatters.day(startMs, me.zone)}, ${formatters.time(startMs, me.zone)}–${formatters.time(endMs, me.zone)} (${me.city})`]
    for (const person of people.slice(1)) {
        lines.push(`${person.name}: ${formatters.time(startMs, person.zone)}–${formatters.time(endMs, person.zone)} (${person.city})`)
    }
    return lines.join('\n')
}

export function slotLink(startMs: number, durationMinutes: number): string {
    return `overlap://s?v=1&t=${startMs}&d=${durationMinutes}`
}
