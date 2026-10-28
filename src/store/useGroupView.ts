import { useMemo } from 'react'
import { peopleInGroup, type Group } from '../domain/people/groups'
import type { Person } from '../domain/types'
import { useAppStore } from './useAppStore'

interface GroupView {
    groups: Group[]
    activeGroupId: string | null
    everyone: Person[]
    people: Person[]
}

export function useGroupView(): GroupView {
    const everyone = useAppStore((state) => state.people)
    const groups = useAppStore((state) => state.groups)
    const stored = useAppStore((state) => state.activeGroupId)
    const activeGroupId = stored && groups.some((group) => group.id === stored) ? stored : null
    const people = useMemo(() => peopleInGroup(everyone, activeGroupId), [everyone, activeGroupId])
    return { groups, activeGroupId, everyone, people }
}
