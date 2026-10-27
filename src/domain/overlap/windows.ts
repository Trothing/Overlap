import type { OverlapWindow, Person, Segment, Status } from '../types'
import { SEVERITY, statusAt } from '../time/status'

export const STEP_MINUTES = 15

const STEP_MS = STEP_MINUTES * 60000
const MAX_PLAYABLE_SEVERITY = 2

interface Cell {
    ms: number
    worst: number
    penalty: number
}

interface OpenWindow {
    start: number
    end: number
    tier: number
    penalty: number
    cells: number
}

export function findWindows(people: Person[], fromMs: number, days: number, minMinutes: number): OverlapWindow[] {
    const steps = Math.floor((days * 24 * 60) / STEP_MINUTES)
    const cells: Cell[] = []
    for (let i = 0; i < steps; i++) {
        const ms = fromMs + i * STEP_MS
        let worst = 0
        let penalty = 0
        for (const person of people) {
            const severity = SEVERITY[statusAt(person, ms)]
            if (severity > worst) worst = severity
            penalty += severity
        }
        cells.push({ ms, worst, penalty })
    }

    const found: OpenWindow[] = []
    let current: OpenWindow | null = null
    const keep = (window: OpenWindow | null) => {
        if (window && window.cells * STEP_MINUTES >= minMinutes) found.push(window)
    }
    for (const cell of cells) {
        const playable = cell.worst <= MAX_PLAYABLE_SEVERITY
        if (playable && current && current.tier === cell.worst) {
            current.end = cell.ms + STEP_MS
            current.penalty += cell.penalty
            current.cells += 1
        } else {
            keep(current)
            current = playable ? { start: cell.ms, end: cell.ms + STEP_MS, tier: cell.worst, penalty: cell.penalty, cells: 1 } : null
        }
    }
    keep(current)

    const windows: OverlapWindow[] = found.map((window) => {
        const middle = window.start + (window.end - window.start) / 2
        return {
            ...window,
            issues: people
                .map((person) => ({ person, status: statusAt(person, middle) }))
                .filter((entry) => entry.status !== 'core'),
        }
    })

    windows.sort((a, b) => a.tier - b.tier || a.penalty / a.cells - b.penalty / b.cells || a.start - b.start)
    return windows
}

export function segments(person: Person, dayStartMs: number, dayMinutes: number): Segment[] {
    const result: Segment[] = []
    for (let m = 0; m < dayMinutes; m += STEP_MINUTES) {
        const status = statusAt(person, dayStartMs + m * 60000)
        const last = result[result.length - 1]
        if (last && last.status === status) last.to = m + STEP_MINUTES
        else result.push({ status, from: m, to: m + STEP_MINUTES })
    }
    return result
}

export type MinuteRange = { from: number; to: number }

export function sharedRanges(lists: Segment[][], dayMinutes: number, allowed: Status[]): MinuteRange[] {
    if (lists.length === 0) return []
    const steps = Math.floor(dayMinutes / STEP_MINUTES)
    const free = new Array<boolean>(steps).fill(true)
    for (const parts of lists) {
        const working = new Array<boolean>(steps).fill(false)
        for (const part of parts) {
            if (!allowed.includes(part.status)) continue
            const from = Math.floor(part.from / STEP_MINUTES)
            const to = Math.ceil(part.to / STEP_MINUTES)
            for (let i = from; i < to && i < steps; i++) working[i] = true
        }
        for (let i = 0; i < steps; i++) if (!working[i]) free[i] = false
    }
    const ranges: MinuteRange[] = []
    let start = -1
    for (let i = 0; i <= steps; i++) {
        if (i < steps && free[i]) {
            if (start < 0) start = i
        } else if (start >= 0) {
            ranges.push({ from: start * STEP_MINUTES, to: i * STEP_MINUTES })
            start = -1
        }
    }
    return ranges
}

export function coreOverlap(lists: Segment[][], dayMinutes: number): MinuteRange[] {
    return sharedRanges(lists, dayMinutes, ['core'])
}

export function friendlyOverlap(lists: Segment[][], dayMinutes: number): MinuteRange[] {
    return sharedRanges(lists, dayMinutes, ['core', 'shoulder'])
}
