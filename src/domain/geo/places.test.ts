import { mergePlaces, parsePlaces, type Place } from './places'

const sample = {
    results: [
        { id: 1, name: 'Springfield', admin2: 'Sangamon', admin1: 'Illinois', country: 'United States', timezone: 'America/Chicago', population: 114394 },
        { id: 2, name: 'Springfield', admin2: 'Greene', admin1: 'Missouri', country: 'United States', timezone: 'America/Chicago', population: 170188 },
        { id: 3, name: 'Hamlet', timezone: 'Europe/Kyiv' },
    ],
}

describe('parsePlaces', () => {
    it('reads the name, zone and a disambiguating subtitle', () => {
        const places = parsePlaces(sample)
        expect(places[0]).toEqual({ id: '1', name: 'Springfield', subtitle: 'Sangamon, Illinois, United States', zone: 'America/Chicago', population: 114394 })
    })

    it('keeps places that have no region or population', () => {
        expect(parsePlaces(sample)[2]).toEqual({ id: '3', name: 'Hamlet', subtitle: '', zone: 'Europe/Kyiv', population: 0 })
    })

    it('drops the repeated name and duplicate parts from the subtitle', () => {
        const places = parsePlaces({ results: [{ id: 5, name: 'Berlin', admin2: 'Berlin', admin1: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' }] })
        expect(places[0].subtitle).toBe('Germany')
    })

    it('skips entries without a name, zone or id', () => {
        expect(parsePlaces({ results: [{ id: 1, name: 'A' }, { name: 'B', timezone: 'UTC' }, { id: 2, timezone: 'UTC' }, null, 'x'] })).toEqual([])
    })

    it('tolerates missing or malformed payloads', () => {
        expect(parsePlaces(undefined)).toEqual([])
        expect(parsePlaces({})).toEqual([])
        expect(parsePlaces({ results: 'no' })).toEqual([])
    })
})

describe('mergePlaces', () => {
    const make = (id: string, name: string, population: number): Place => ({ id, name, subtitle: '', zone: 'UTC', population })

    it('removes duplicates by id and keeps the first version', () => {
        const merged = mergePlaces([[make('1', 'Київ', 10)], [make('1', 'Kyiv', 10), make('2', 'Kiev', 5)]])
        expect(merged.map((place) => place.name)).toEqual(['Київ', 'Kiev'])
    })

    it('orders by population and keeps list order for ties', () => {
        const merged = mergePlaces([[make('1', 'A', 5), make('2', 'B', 50)], [make('3', 'C', 5)]])
        expect(merged.map((place) => place.id)).toEqual(['2', '1', '3'])
    })

    it('limits the number of results', () => {
        const list = Array.from({ length: 30 }, (_, index) => make(String(index), `P${index}`, index))
        expect(mergePlaces([list], 5)).toHaveLength(5)
    })
})
