import type { SavedCall } from '../calls/calls'
import type { IsoWeekday, Person } from '../types'
import { callsInGroup, inGroup, peopleInGroup, removeGroupFromPeople, setMembers, toggleId } from './groups'

const WORKWEEK: IsoWeekday[] = [1, 2, 3, 4, 5]
const person = (id: string, groupIds?: string[], me = false): Person => ({ id, name: id, city: id, zone: 'UTC', start: 540, end: 1080, workDays: WORKWEEK, ...(groupIds ? { groupIds } : {}), ...(me ? { me: true } : {}) })
const call = (id: string, personIds: string[]): SavedCall => ({ id, title: id, weekday: 3, minute: 960, duration: 60, personIds, remind: 0 })

const people = [person('me', undefined, true), person('a', ['g1']), person('b', ['g1', 'g2']), person('c')]

describe('peopleInGroup', () => {
    it('returns everyone when no group is active', () => {
        expect(peopleInGroup(people, null)).toBe(people)
    })

    it('keeps the first person and the group members in list order', () => {
        expect(peopleInGroup(people, 'g1').map((entry) => entry.id)).toEqual(['me', 'a', 'b'])
        expect(peopleInGroup(people, 'g2').map((entry) => entry.id)).toEqual(['me', 'b'])
    })

    it('returns only the first person for an empty group', () => {
        expect(peopleInGroup(people, 'g3').map((entry) => entry.id)).toEqual(['me'])
    })
})

describe('callsInGroup', () => {
    const calls = [call('x', ['a']), call('y', ['c']), call('z', ['a', 'c'])]

    it('keeps calls that include a member of the group', () => {
        expect(callsInGroup(calls, people, 'g1').map((entry) => entry.id)).toEqual(['x', 'z'])
    })

    it('returns every call when no group is active', () => {
        expect(callsInGroup(calls, people, null)).toBe(calls)
    })
})

describe('setMembers', () => {
    it('adds and removes the group on the chosen people only', () => {
        const result = setMembers(people, 'g1', ['c', 'a'])
        expect(result.map((entry) => [entry.id, entry.groupIds ?? []])).toEqual([['me', []], ['a', ['g1']], ['b', ['g2']], ['c', ['g1']]])
    })

    it('drops the groupIds field once a person has no groups', () => {
        const result = setMembers(people, 'g1', [])
        expect(result.find((entry) => entry.id === 'a')).not.toHaveProperty('groupIds')
    })

    it('never changes the first person', () => {
        expect(setMembers(people, 'g1', ['me']).find((entry) => entry.me)).toBe(people[0])
    })
})

describe('removeGroupFromPeople', () => {
    it('strips the group from everyone and keeps other groups', () => {
        const result = removeGroupFromPeople(people, 'g1')
        expect(result.some((entry) => inGroup(entry, 'g1'))).toBe(false)
        expect(result.find((entry) => entry.id === 'b')?.groupIds).toEqual(['g2'])
    })
})

describe('toggleId', () => {
    it('adds a missing id and removes a present one', () => {
        expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
        expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
    })
})
