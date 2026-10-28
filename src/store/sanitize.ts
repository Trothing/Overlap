import { REMIND_OPTIONS, type SavedCall } from '../domain/calls/calls'
import { MAX_GROUP_NAME_LENGTH, type Group } from '../domain/people/groups'
import { MAX_NAME_LENGTH } from '../domain/people/draft'
import { MAX_TITLE_LENGTH } from '../domain/share/slotLink'
import { isValidZone } from '../domain/time/localTime'
import type { IsoWeekday, Person } from '../domain/types'
import { languages } from '../i18n/dictionary'
import type { ThemeChoice } from '../ui/tokens'
import type { Settings } from './useAppStore'

const MAX_PEOPLE = 200
const MAX_CALLS = 200
const MAX_GROUPS = 50
const MAX_PLACE_LENGTH = 80
const MAX_ID_LENGTH = 64
const MINUTES_PER_DAY = 1440
const MIN_DURATION = 5
const MAX_DURATION = 480
const MIN_WINDOWS = [30, 45, 60]
const THEMES: ThemeChoice[] = ['system', 'light', 'dark']

export const DEFAULT_SETTINGS: Settings = { lang: 'en', hour12: false, minWindow: 60, haptics: true, theme: 'system' }

export interface PersistedData {
    people: Person[]
    calls: SavedCall[]
    groups: Group[]
    activeGroupId: string | null
    settings: Settings
}

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): string | null {
    return typeof value === 'string' ? value.slice(0, max) : null
}

function id(value: unknown): string | null {
    const result = text(value, MAX_ID_LENGTH)
    return result && result.length > 0 ? result : null
}

function minuteOfDay(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY ? value : null
}

function weekday(value: unknown): IsoWeekday | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7 ? (value as IsoWeekday) : null
}

function idList(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) return []
    return [...new Set(value.flatMap((entry) => id(entry) ?? []))].slice(0, limit)
}

function cleanPerson(value: unknown): Person | null {
    if (!isRecord(value)) return null
    const personId = id(value.id)
    const name = text(value.name, MAX_NAME_LENGTH)
    const city = text(value.city, MAX_PLACE_LENGTH)
    const zone = typeof value.zone === 'string' && isValidZone(value.zone) ? value.zone : null
    const start = minuteOfDay(value.start)
    const end = minuteOfDay(value.end)
    const days = Array.isArray(value.workDays) ? [...new Set(value.workDays.flatMap((entry) => weekday(entry) ?? []))].sort((a, b) => a - b) : []
    if (!personId || name === null || city === null || !zone || start === null || end === null || days.length === 0) return null
    const person: Person = { id: personId, name, city, zone, start, end, workDays: days }
    const region = text(value.region, MAX_PLACE_LENGTH)
    if (region) person.region = region
    if (value.allDay === true) person.allDay = true
    if (value.me === true) person.me = true
    if (value.sample === true) person.sample = true
    const groupIds = idList(value.groupIds, MAX_GROUPS)
    if (groupIds.length > 0 && !person.me) person.groupIds = groupIds
    return person
}

function cleanCall(value: unknown, knownPeople: Set<string>): SavedCall | null {
    if (!isRecord(value)) return null
    const callId = id(value.id)
    const title = text(value.title, MAX_TITLE_LENGTH)
    const day = weekday(value.weekday)
    const minute = minuteOfDay(value.minute)
    const duration = typeof value.duration === 'number' && Number.isInteger(value.duration) && value.duration >= MIN_DURATION && value.duration <= MAX_DURATION ? value.duration : null
    const personIds = idList(value.personIds, MAX_PEOPLE).filter((entry) => knownPeople.has(entry))
    if (!callId || title === null || !day || minute === null || duration === null || personIds.length === 0) return null
    const remind = REMIND_OPTIONS.find((option) => option === value.remind) ?? 0
    const call: SavedCall = { id: callId, title, weekday: day, minute, duration, personIds, remind }
    const notificationId = text(value.notificationId, 200)
    if (notificationId) call.notificationId = notificationId
    return call
}

function cleanGroup(value: unknown): Group | null {
    if (!isRecord(value)) return null
    const groupId = id(value.id)
    const name = text(value.name, MAX_GROUP_NAME_LENGTH)
    return groupId && name && name.trim().length > 0 ? { id: groupId, name } : null
}

function unique<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>()
    return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

function cleanSettings(value: unknown): Settings {
    if (!isRecord(value)) return { ...DEFAULT_SETTINGS }
    const lang = languages.find(([code]) => code === value.lang)?.[0] ?? DEFAULT_SETTINGS.lang
    const theme = THEMES.find((option) => option === value.theme) ?? DEFAULT_SETTINGS.theme
    return {
        lang,
        theme,
        hour12: typeof value.hour12 === 'boolean' ? value.hour12 : DEFAULT_SETTINGS.hour12,
        haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_SETTINGS.haptics,
        minWindow: MIN_WINDOWS.find((option) => option === value.minWindow) ?? DEFAULT_SETTINGS.minWindow,
    }
}

export function sanitizePersisted(raw: unknown, fallbackMe: Person): PersistedData {
    const source = isRecord(raw) ? raw : {}
    const parsed = Array.isArray(source.people) ? unique(source.people.flatMap((entry) => cleanPerson(entry) ?? [])).slice(0, MAX_PEOPLE) : []
    const me = parsed.find((person) => person.me) ?? fallbackMe
    const others = parsed.filter((person) => !person.me && person.id !== me.id)
    const people = [me, ...others]
    const groups = Array.isArray(source.groups) ? unique(source.groups.flatMap((entry) => cleanGroup(entry) ?? [])).slice(0, MAX_GROUPS) : []
    const groupIds = new Set(groups.map((group) => group.id))
    const cleanedPeople = people.map((person) => {
        if (!person.groupIds) return person
        const kept = person.groupIds.filter((entry) => groupIds.has(entry))
        const { groupIds: _dropped, ...rest } = person
        return kept.length > 0 ? { ...rest, groupIds: kept } : rest
    })
    const known = new Set(cleanedPeople.map((person) => person.id))
    const calls = Array.isArray(source.calls) ? unique(source.calls.flatMap((entry) => cleanCall(entry, known) ?? [])).slice(0, MAX_CALLS) : []
    const activeGroupId = typeof source.activeGroupId === 'string' && groupIds.has(source.activeGroupId) ? source.activeGroupId : null
    return { people: cleanedPeople, calls, groups, activeGroupId, settings: cleanSettings(source.settings) }
}
