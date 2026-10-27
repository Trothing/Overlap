import type { IsoWeekday, Person } from '../types'
import { draftFromPerson, draftToPerson, newDraft, toggleDay, validateDraft } from './draft'

const person: Person = { id: 'p1', name: 'Max', city: 'New York', zone: 'America/New_York', start: 540, end: 1080, workDays: [1, 2, 3, 4, 5], sample: true }

describe('validateDraft', () => {
    it('asks for a name first', () => {
        expect(validateDraft(newDraft('x'))).toBe('needName')
    })

    it('asks for a city when the name is set', () => {
        expect(validateDraft({ ...newDraft('x'), name: 'Ana' })).toBe('needCity')
    })

    it('rejects equal start and end', () => {
        expect(validateDraft({ ...newDraft('x'), name: 'Ana', zone: 'UTC', city: 'UTC', start: 600, end: 600 })).toBe('needHours')
    })

    it('rejects no working days', () => {
        expect(validateDraft({ ...newDraft('x'), name: 'Ana', zone: 'UTC', city: 'UTC', workDays: [] })).toBe('needHours')
    })

    it('accepts an overnight shift', () => {
        expect(validateDraft({ ...newDraft('x'), name: 'Ana', zone: 'UTC', city: 'UTC', start: 1320, end: 360 })).toBeNull()
    })

    it('does not ask the current user for a name or city', () => {
        expect(validateDraft({ ...newDraft('me'), me: true })).toBeNull()
    })
})

describe('toggleDay', () => {
    it('adds a day in order and removes it again', () => {
        const added = toggleDay([1, 3] as IsoWeekday[], 2)
        expect(added).toEqual([1, 2, 3])
        expect(toggleDay(added, 2)).toEqual([1, 3])
    })
})

describe('draft conversion', () => {
    it('copies the working days so editing does not change the original', () => {
        const draft = draftFromPerson(person)
        draft.workDays.push(6)
        expect(person.workDays).toEqual([1, 2, 3, 4, 5])
    })

    it('drops the sample flag and trims the name when saved', () => {
        const saved = draftToPerson({ ...draftFromPerson(person), name: '  Max  ' })
        expect(saved.name).toBe('Max')
        expect(saved.sample).toBeUndefined()
        expect(saved.me).toBeUndefined()
    })

    it('keeps the me flag for the current user', () => {
        const saved = draftToPerson({ ...newDraft('me'), me: true, zone: 'UTC', city: 'UTC' })
        expect(saved.me).toBe(true)
    })
})
