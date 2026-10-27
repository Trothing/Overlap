import type { IsoWeekday, LocalParts } from '../types'

const WEEKDAYS: Record<string, IsoWeekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(zone: string): Intl.DateTimeFormat {
    let formatter = formatterCache.get(zone)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            hourCycle: 'h23',
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })
        formatterCache.set(zone, formatter)
    }
    return formatter
}

export function localParts(ms: number, zone: string): LocalParts {
    const values: Record<string, string> = {}
    for (const part of partsFormatter(zone).formatToParts(new Date(ms))) {
        if (part.type !== 'literal') values[part.type] = part.value
    }
    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour) % 24,
        minute: Number(values.minute),
        isoWeekday: WEEKDAYS[values.weekday],
    }
}

export function offsetMinutes(ms: number, zone: string): number {
    const p = localParts(ms, zone)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000)
}

export function startOfDay(ms: number, zone: string): number {
    const p = localParts(ms, zone)
    let guess = ms - (p.hour * 60 + p.minute) * 60000
    const check = localParts(guess, zone)
    const drift = check.hour * 60 + check.minute
    if (drift === 0) return guess
    return drift > 720 ? guess + (1440 - drift) * 60000 : guess - drift * 60000
}

export function isValidZone(zone: string): boolean {
    try {
        partsFormatter(zone)
        return true
    } catch {
        return false
    }
}

export function dayStartAt(nowMs: number, zone: string, dayOffset: number): number {
    const today = startOfDay(nowMs, zone)
    return startOfDay(today + (dayOffset * 24 + 12) * 3600000, zone)
}

const DAY_MS = 86400000
const MAX_CACHED_DAYS = 4000

interface DayOffsets {
    before: number
    after: number
    changeAt: number
}

const dayCache = new Map<string, DayOffsets>()

function resolveDay(zone: string, day: number): DayOffsets {
    const startMs = day * DAY_MS
    const endMs = startMs + DAY_MS - 60000
    const before = offsetMinutes(startMs, zone)
    const after = offsetMinutes(endMs, zone)
    if (before === after) return { before, after, changeAt: Infinity }
    let low = startMs
    let high = endMs
    while (high - low > 60000) {
        const mid = low + Math.floor((high - low) / 120000) * 60000
        if (offsetMinutes(mid, zone) === before) low = mid
        else high = mid
    }
    return { before, after, changeAt: high }
}

export function utcOffsetAt(ms: number, zone: string): number {
    const day = Math.floor(ms / DAY_MS)
    const key = `${zone}|${day}`
    let entry = dayCache.get(key)
    if (!entry) {
        if (dayCache.size >= MAX_CACHED_DAYS) dayCache.clear()
        entry = resolveDay(zone, day)
        dayCache.set(key, entry)
    }
    return ms < entry.changeAt ? entry.before : entry.after
}

export function localClock(ms: number, zone: string): { minutes: number; isoWeekday: IsoWeekday } {
    const local = ms + utcOffsetAt(ms, zone) * 60000
    const day = Math.floor(local / DAY_MS)
    const minutes = Math.floor((local - day * DAY_MS) / 60000)
    const isoWeekday = ((((day + 3) % 7) + 7) % 7) + 1
    return { minutes, isoWeekday: isoWeekday as IsoWeekday }
}
