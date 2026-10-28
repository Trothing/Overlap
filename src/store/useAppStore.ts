import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { withoutPerson, type SavedCall } from '../domain/calls/calls'
import { removeGroupFromPeople, setMembers, type Group } from '../domain/people/groups'
import type { Language } from '../i18n/dictionary'
import type { IsoWeekday, Person } from '../domain/types'
import { cityOf, detectDeviceZone } from '../domain/zones'
import type { ThemeChoice } from '../ui/tokens'
import { sanitizePersisted } from './sanitize'

export interface Settings {
    lang: Language
    hour12: boolean
    minWindow: number
    haptics: boolean
    theme: ThemeChoice
}

interface AppState {
    people: Person[]
    calls: SavedCall[]
    groups: Group[]
    activeGroupId: string | null
    settings: Settings
    updateSettings: (patch: Partial<Settings>) => void
    savePerson: (person: Person) => void
    removePerson: (id: string) => void
    saveCall: (call: SavedCall) => void
    removeCall: (id: string) => void
    saveGroup: (group: Group, memberIds: string[]) => void
    removeGroup: (id: string) => void
    setActiveGroup: (id: string | null) => void
}

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]

function initialPeople(): Person[] {
    const zone = detectDeviceZone()
    return [
        { id: 'me', name: '', city: cityOf(zone), zone, start: 540, end: 1080, workDays: WORKWEEK, me: true },
        { id: 'p1', name: 'Max', city: 'New York', zone: 'America/New_York', start: 540, end: 1080, workDays: WORKWEEK, sample: true },
        { id: 'p2', name: 'Lena', city: 'Berlin', zone: 'Europe/Berlin', start: 540, end: 1080, workDays: WORKWEEK, sample: true },
    ]
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            people: initialPeople(),
            calls: [],
            groups: [],
            activeGroupId: null,
            settings: { lang: 'en', hour12: false, minWindow: 60, haptics: true, theme: 'system' },
            updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
            savePerson: (person) =>
                set((state) => {
                    const exists = state.people.some((entry) => entry.id === person.id)
                    return { people: exists ? state.people.map((entry) => (entry.id === person.id ? person : entry)) : [...state.people, person] }
                }),
            removePerson: (id) =>
                set((state) => {
                    if (state.people.some((entry) => entry.id === id && entry.me)) return {}
                    return { people: state.people.filter((entry) => entry.id !== id), calls: withoutPerson(state.calls, id).kept }
                }),
            saveCall: (call) =>
                set((state) => {
                    const exists = state.calls.some((entry) => entry.id === call.id)
                    return { calls: exists ? state.calls.map((entry) => (entry.id === call.id ? call : entry)) : [...state.calls, call] }
                }),
            removeCall: (id) => set((state) => ({ calls: state.calls.filter((entry) => entry.id !== id) })),
            saveGroup: (group, memberIds) =>
                set((state) => {
                    const exists = state.groups.some((entry) => entry.id === group.id)
                    return { groups: exists ? state.groups.map((entry) => (entry.id === group.id ? group : entry)) : [...state.groups, group], people: setMembers(state.people, group.id, memberIds) }
                }),
            removeGroup: (id) =>
                set((state) => ({
                    groups: state.groups.filter((entry) => entry.id !== id),
                    people: removeGroupFromPeople(state.people, id),
                    activeGroupId: state.activeGroupId === id ? null : state.activeGroupId,
                })),
            setActiveGroup: (id) => set({ activeGroupId: id }),
        }),
        {
            name: 'overlap:v1',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            merge: (persisted, current) => (persisted && typeof persisted === 'object' ? { ...current, ...sanitizePersisted(persisted, current.people[0]) } : current),
            partialize: (state) => ({ people: state.people, calls: state.calls, groups: state.groups, activeGroupId: state.activeGroupId, settings: state.settings }),
        },
    ),
)
