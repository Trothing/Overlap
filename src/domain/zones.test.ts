import { cityOf, searchCities } from './zones'

describe('searchCities', () => {
    it('returns nothing for an empty query', () => {
        expect(searchCities('  ')).toEqual([])
    })

    it('matches a city name case-insensitively', () => {
        expect(searchCities('berl')).toEqual([{ city: 'Berlin', zone: 'Europe/Berlin' }])
    })

    it('matches a zone fragment', () => {
        expect(searchCities('america/new').map((entry) => entry.city)).toEqual(['New York'])
    })

    it('matches Ukrainian and Spanish names', () => {
        expect(searchCities('Київ')[0].city).toBe('Kyiv')
        expect(searchCities('Nueva York')[0].city).toBe('New York')
    })

    it('ignores accents', () => {
        expect(searchCities('sao paulo')[0].city).toBe('São Paulo')
    })

    it('limits the number of results', () => {
        expect(searchCities('a').length).toBeLessThanOrEqual(8)
    })

    it('accepts a valid IANA zone that is not in the list', () => {
        expect(searchCities('America/Halifax')).toEqual([{ city: 'Halifax', zone: 'America/Halifax' }])
    })

    it('rejects an unknown zone', () => {
        expect(searchCities('Mars/Olympus')).toEqual([])
    })
})

describe('cityOf', () => {
    it('maps aliases to the listed city', () => {
        expect(cityOf('Europe/Kiev')).toBe('Kyiv')
    })
})
