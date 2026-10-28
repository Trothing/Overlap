import type { Person, Status, WindowIssue } from '../types'
import { localClock, utcOffsetAt } from '../time/localTime'
import { SEVERITY, statusAt } from '../time/status'
import { STEP_MINUTES } from './windows'

export const MINUTES_PER_DAY = 1440

export interface SlotSuggestion {
    start: number
    end: number
    score: number
    tier: number
    issues: WindowIssue[]
}

const CANDIDATE_STEP_MINUTES = 30
const SEARCH_DAYS = 7
const MAX_SUGGESTIONS = 3
const MIN_GAP_MINUTES = 180
const EDGE_COMFORT = 0.8
const COMFORT: Record<Status, number> = { core: 1, shoulder: 0.5, late: 0.2, sleep: 0, off: 0 }
const WEIGHT_WORST = 0.65
const WEIGHT_MEAN = 0.35
const FROM_ROUNDING_MS = 900000

export function planFrom(nowMs: number, dayStartMs: number): number {
    return Math.max(Math.floor(nowMs / FROM_ROUNDING_MS) * FROM_ROUNDING_MS, dayStartMs)
}

export function comfortAt(person: Person, ms: number): number {
    const status = statusAt(person, ms)
    if (status !== 'core') return COMFORT[status]
    if (person.allDay) return COMFORT.core
    const { minutes } = localClock(ms, person.zone)
    const length = (person.end - person.start + MINUTES_PER_DAY) % MINUTES_PER_DAY
    const offset = (minutes - person.start + MINUTES_PER_DAY) % MINUTES_PER_DAY
    return EDGE_COMFORT + (COMFORT.core - EDGE_COMFORT) * Math.sin((Math.PI * offset) / length)
}

function alignUp(ms: number, zone: string): number {
    const offsetMs = utcOffsetAt(ms, zone) * 60000
    const step = CANDIDATE_STEP_MINUTES * 60000
    return Math.ceil((ms + offsetMs) / step) * step - offsetMs
}

function score(people: Person[], start: number, duration: number): SlotSuggestion {
    const cells = Math.max(1, Math.ceil(duration / STEP_MINUTES))
    let worstSum = 0
    let meanSum = 0
    let tier = 0
    const issues: WindowIssue[] = []
    let lowest = 1

    for (const person of people) {
        let personWorst = 1
        let personTotal = 0
        let personStatus: Status = 'core'
        for (let i = 0; i < cells; i++) {
            const ms = start + i * STEP_MINUTES * 60000
            const comfort = comfortAt(person, ms)
            personTotal += comfort
            if (comfort < personWorst) personWorst = comfort
            const status = statusAt(person, ms)
            if (SEVERITY[status] > SEVERITY[personStatus]) personStatus = status
        }
        worstSum += personWorst
        meanSum += personTotal / cells
        if (personWorst < lowest) lowest = personWorst
        if (SEVERITY[personStatus] > tier) tier = SEVERITY[personStatus]
        if (personStatus !== 'core') issues.push({ person, status: personStatus })
    }

    const count = people.length
    const value = WEIGHT_WORST * lowest + WEIGHT_MEAN * (meanSum / count)
    return { start, end: start + duration * 60000, score: value, tier, issues }
}

export function suggestSlots(people: Person[], fromMs: number, durationMinutes: number, limit: number = MAX_SUGGESTIONS): SlotSuggestion[] {
    if (people.length === 0) return []
    const me = people[0]
    const first = alignUp(fromMs, me.zone)
    const steps = Math.floor((SEARCH_DAYS * MINUTES_PER_DAY) / CANDIDATE_STEP_MINUTES)

    const candidates: SlotSuggestion[] = []
    for (let i = 0; i < steps; i++) {
        candidates.push(score(people, first + i * CANDIDATE_STEP_MINUTES * 60000, durationMinutes))
    }
    candidates.sort((a, b) => b.score - a.score || a.start - b.start)

    const chosen: SlotSuggestion[] = []
    const gapMs = MIN_GAP_MINUTES * 60000
    for (const candidate of candidates) {
        if (chosen.every((pick) => candidate.start >= pick.end + gapMs || candidate.end <= pick.start - gapMs)) chosen.push(candidate)
        if (chosen.length === limit) break
    }
    return chosen
}

export function worstIssueStatus(slot: SlotSuggestion): Status {
    let worst: Status = 'core'
    for (const entry of slot.issues) if (SEVERITY[entry.status] > SEVERITY[worst]) worst = entry.status
    return worst
}
