export interface Slot {
    start: number
    duration: number
    title: string
}

export const DURATIONS = [30, 45, 60, 90] as const
export const DEFAULT_DURATION = 60
export const LINK_VERSION = '1'
export const MAX_TITLE_LENGTH = 60

const MIN_START = Date.UTC(2020, 0, 1)
const MAX_START = Date.UTC(2100, 0, 1)
const MIN_DURATION = 5
const MAX_DURATION = 480

type ParamValue = string | string[] | undefined

function first(value: ParamValue): string | undefined {
    return Array.isArray(value) ? value[0] : value
}

function cleanTitle(value: string): string {
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
}

export function slotQuery(slot: Slot): string {
    const base = `v=${LINK_VERSION}&t=${slot.start}&d=${slot.duration}`
    const title = cleanTitle(slot.title)
    return title ? `${base}&n=${encodeURIComponent(title)}` : base
}

export function buildSlotLink(base: string, slot: Slot): string {
    return `${base}${base.includes('?') ? '&' : '?'}${slotQuery(slot)}`
}

export function parseSlot(params: Record<string, ParamValue>): Slot | null {
    if (first(params.v) !== LINK_VERSION) return null
    const start = Number(first(params.t))
    const duration = Number(first(params.d) ?? DEFAULT_DURATION)
    if (!Number.isInteger(start) || start < MIN_START || start > MAX_START) return null
    if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) return null
    return { start, duration, title: cleanTitle(first(params.n) ?? '') }
}

export function durationOptions(current: number): number[] {
    const all: number[] = [...DURATIONS]
    if (!all.includes(current)) all.push(current)
    return all.sort((a, b) => a - b)
}
