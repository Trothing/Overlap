import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SavedCall } from '../domain/calls/calls'
import type { Language } from '../i18n/dictionary'
import type { IsoWeekday, Person } from '../domain/types'
import { cityOf, detectDeviceZone } from '../domain/zones'
import type { ThemeChoice } from '../ui/tokens'

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
    settings: Settings
    updateSettings: (patch: Partial<Settings>) => void
    savePerson: (person: Person) => void
    removePerson: (id: string) => void
    saveCall: (call: SavedCall) => void
    removeCall: (id: string) => void
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
            settings: { lang: 'en', hour12: false, minWindow: 60, haptics: true, theme: 'system' },
            updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
            savePerson: (person) =>
                set((state) => {
                    const exists = state.people.some((entry) => entry.id === person.id)
                    return { people: exists ? state.people.map((entry) => (entry.id === person.id ? person : entry)) : [...state.people, person] }
                }),
            removePerson: (id) => set((state) => ({ people: state.people.filter((entry) => entry.id !== id || entry.me) })),
            saveCall: (call) =>
                set((state) => {
                    const exists = state.calls.some((entry) => entry.id === call.id)
                    return { calls: exists ? state.calls.map((entry) => (entry.id === call.id ? call : entry)) : [...state.calls, call] }
                }),
            removeCall: (id) => set((state) => ({ calls: state.calls.filter((entry) => entry.id !== id) })),
        }),
        {
            name: 'overlap:v1',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ people: state.people, calls: state.calls, settings: state.settings }),
        },
    ),
)
