jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}))

import type { SavedCall } from '../domain/calls/calls'
import { useAppStore } from './useAppStore'

const call = (id: string, personIds: string[]): SavedCall => ({ id, title: id, weekday: 3, minute: 960, duration: 60, personIds, remind: 0 })

describe('removePerson', () => {
    beforeEach(() => {
        useAppStore.setState({ calls: [call('shared', ['p1', 'p2']), call('solo', ['p1'])] })
    })

    it('removes the person and cleans every saved call', () => {
        useAppStore.getState().removePerson('p1')
        const state = useAppStore.getState()
        expect(state.people.some((entry) => entry.id === 'p1')).toBe(false)
        expect(state.calls.map((entry) => [entry.id, entry.personIds])).toEqual([['shared', ['p2']]])
    })

    it('never removes the first person', () => {
        const before = useAppStore.getState().people.length
        useAppStore.getState().removePerson('me')
        expect(useAppStore.getState().people.length).toBe(before)
        expect(useAppStore.getState().calls).toHaveLength(2)
    })
})

describe('groups', () => {
    beforeEach(() => {
        const first = useAppStore.getState().people[0]
        useAppStore.setState({ groups: [], activeGroupId: null, people: [first, { id: 'p1', name: 'Max', city: 'New York', zone: 'America/New_York', start: 540, end: 1080, workDays: [1, 2, 3, 4, 5] }] })
    })

    it('saves a group with its members and removes it cleanly', () => {
        const store = useAppStore.getState()
        store.saveGroup({ id: 'g1', name: 'Acme' }, ['p1'])
        expect(useAppStore.getState().people.find((entry) => entry.id === 'p1')?.groupIds).toEqual(['g1'])
        store.setActiveGroup('g1')
        store.removeGroup('g1')
        const state = useAppStore.getState()
        expect(state.groups).toEqual([])
        expect(state.activeGroupId).toBeNull()
        expect(state.people.some((entry) => entry.groupIds?.includes('g1'))).toBe(false)
    })

    it('renames a group without duplicating it', () => {
        const store = useAppStore.getState()
        store.saveGroup({ id: 'g1', name: 'Acme' }, [])
        store.saveGroup({ id: 'g1', name: 'Acme Inc' }, [])
        expect(useAppStore.getState().groups).toEqual([{ id: 'g1', name: 'Acme Inc' }])
    })
})
