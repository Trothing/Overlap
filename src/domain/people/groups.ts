import type { SavedCall } from '../calls/calls'
import type { Person } from '../types'

export interface Group {
    id: string
    name: string
}

export const MAX_GROUP_NAME_LENGTH = 30

export function inGroup(person: Person, groupId: string): boolean {
    return person.groupIds?.includes(groupId) ?? false
}

export function peopleInGroup(people: Person[], groupId: string | null): Person[] {
    if (!groupId) return people
    return people.filter((person) => person.me || inGroup(person, groupId))
}

export function callsInGroup(calls: SavedCall[], people: Person[], groupId: string | null): SavedCall[] {
    if (!groupId) return calls
    const members = new Set(people.filter((person) => !person.me && inGroup(person, groupId)).map((person) => person.id))
    return calls.filter((call) => call.personIds.some((id) => members.has(id)))
}

function withGroups(person: Person, groupIds: string[]): Person {
    const { groupIds: _previous, ...rest } = person
    return groupIds.length > 0 ? { ...rest, groupIds } : rest
}

export function setMembers(people: Person[], groupId: string, memberIds: string[]): Person[] {
    return people.map((person) => {
        if (person.me) return person
        const current = person.groupIds ?? []
        const wants = memberIds.includes(person.id)
        if (wants === current.includes(groupId)) return person
        return withGroups(person, wants ? [...current, groupId] : current.filter((id) => id !== groupId))
    })
}

export function removeGroupFromPeople(people: Person[], groupId: string): Person[] {
    return people.map((person) => (inGroup(person, groupId) ? withGroups(person, (person.groupIds ?? []).filter((id) => id !== groupId)) : person))
}

export function toggleId(ids: string[], id: string): string[] {
    return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]
}
