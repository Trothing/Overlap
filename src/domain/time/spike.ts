import { isValidZone, localParts, offsetMinutes, startOfDay } from './localTime'

export interface SpikeCheck {
    name: string
    expected: string
    actual: string
    pass: boolean
}

interface OffsetCase {
    name: string
    zone: string
    iso: string
    offset: number
}

const OFFSET_CASES: OffsetCase[] = [
    { name: 'Kyiv winter time after the October change', zone: 'Europe/Kyiv', iso: '2026-10-27T12:00:00Z', offset: 120 },
    { name: 'Kyiv summer time', zone: 'Europe/Kyiv', iso: '2026-07-01T12:00:00Z', offset: 180 },
    { name: 'New York just before US spring change', zone: 'America/New_York', iso: '2026-03-08T06:59:00Z', offset: -300 },
    { name: 'New York at US spring change', zone: 'America/New_York', iso: '2026-03-08T07:00:00Z', offset: -240 },
    { name: 'New York just before US autumn change', zone: 'America/New_York', iso: '2026-11-01T05:59:00Z', offset: -240 },
    { name: 'New York at US autumn change', zone: 'America/New_York', iso: '2026-11-01T06:00:00Z', offset: -300 },
    { name: 'Berlin just before EU spring change', zone: 'Europe/Berlin', iso: '2026-03-29T00:59:00Z', offset: 60 },
    { name: 'Berlin at EU spring change', zone: 'Europe/Berlin', iso: '2026-03-29T01:00:00Z', offset: 120 },
    { name: 'Berlin at EU autumn change', zone: 'Europe/Berlin', iso: '2026-10-25T01:00:00Z', offset: 60 },
    { name: 'Kathmandu quarter-hour offset', zone: 'Asia/Kathmandu', iso: '2026-10-27T12:00:00Z', offset: 345 },
    { name: 'Kolkata half-hour offset', zone: 'Asia/Kolkata', iso: '2026-10-27T12:00:00Z', offset: 330 },
    { name: 'Chatham Islands summer offset', zone: 'Pacific/Chatham', iso: '2026-10-27T12:00:00Z', offset: 825 },
    { name: 'Chatham Islands winter offset', zone: 'Pacific/Chatham', iso: '2026-07-01T12:00:00Z', offset: 765 },
    { name: 'Lord Howe half-hour daylight saving', zone: 'Australia/Lord_Howe', iso: '2026-10-27T12:00:00Z', offset: 660 },
    { name: 'Honolulu without daylight saving', zone: 'Pacific/Honolulu', iso: '2026-07-01T12:00:00Z', offset: -600 },
    { name: 'Sydney southern summer time', zone: 'Australia/Sydney', iso: '2026-12-15T12:00:00Z', offset: 660 },
    { name: 'Alias Europe/Kiev', zone: 'Europe/Kiev', iso: '2026-10-27T12:00:00Z', offset: 120 },
]

function attempt(name: string, expected: string, run: () => string): SpikeCheck {
    try {
        const actual = run()
        return { name, expected, actual, pass: actual === expected }
    } catch (error) {
        const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        return { name, expected, actual: message, pass: false }
    }
}

function pad(value: number): string {
    return String(value).padStart(2, '0')
}

export function runTimeZoneSpike(): SpikeCheck[] {
    const checks: SpikeCheck[] = []

    for (const entry of OFFSET_CASES) {
        checks.push(attempt(entry.name, String(entry.offset), () => String(offsetMinutes(Date.parse(entry.iso), entry.zone))))
    }

    checks.push(
        attempt('Local parts in Tokyo', '2026-10-28 03:30 Wed', () => {
            const p = localParts(Date.parse('2026-10-27T18:30:00Z'), 'Asia/Tokyo')
            const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][p.isoWeekday - 1]
            return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)} ${day}`
        }),
    )

    checks.push(
        attempt('Midnight reads as hour 0, not 24', '0', () => String(localParts(Date.parse('2026-10-27T22:00:00Z'), 'Europe/Kyiv').hour)),
    )

    checks.push(
        attempt('Start of day on New York spring change (23 h day)', '2026-03-08T05:00:00.000Z', () =>
            new Date(startOfDay(Date.parse('2026-03-08T15:00:00Z'), 'America/New_York')).toISOString(),
        ),
    )

    checks.push(
        attempt('Start of day on Berlin autumn change (25 h day)', '2026-10-24T22:00:00.000Z', () =>
            new Date(startOfDay(Date.parse('2026-10-25T10:00:00Z'), 'Europe/Berlin')).toISOString(),
        ),
    )

    checks.push(attempt('Unknown zone is rejected', 'false', () => String(isValidZone('Mars/Olympus'))))

    checks.push(
        attempt('Localised time label in Ukrainian', 'true', () => {
            const label = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(
                new Date('2026-10-27T12:00:00Z'),
            )
            return String(/14[:.]00/.test(label))
        }),
    )

    checks.push(
        attempt('Localised weekday in Spanish', 'true', () => {
            const label = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(new Date('2026-10-27T12:00:00Z'))
            return String(label.toLowerCase().startsWith('martes'))
        }),
    )

    return checks
}

export interface SpikeInfo {
    engine: string
    deviceZone: string
    supportedValuesOf: string
    zoneCount: string
}

export function describeRuntime(): SpikeInfo {
    const scope = globalThis as { HermesInternal?: unknown }
    let deviceZone = 'unavailable'
    try {
        deviceZone = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unavailable'
    } catch {
        deviceZone = 'error'
    }
    const intl = Intl as { supportedValuesOf?: (key: string) => string[] }
    let supported = 'missing'
    let count = 'n/a'
    if (typeof intl.supportedValuesOf === 'function') {
        try {
            count = String(intl.supportedValuesOf('timeZone').length)
            supported = 'present'
        } catch (error) {
            supported = error instanceof Error ? `throws ${error.name}` : 'throws'
        }
    }
    return {
        engine: scope.HermesInternal ? 'Hermes' : 'not Hermes',
        deviceZone,
        supportedValuesOf: supported,
        zoneCount: count,
    }
}
