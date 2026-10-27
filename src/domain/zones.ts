export const CITIES: ReadonlyArray<readonly [string, string, string]> = [
    ['Kyiv', 'Europe/Kyiv', 'Київ Kiev'],
    ['Berlin', 'Europe/Berlin', 'Берлін Berlín'],
    ['London', 'Europe/London', 'Лондон Londres'],
    ['Lisbon', 'Europe/Lisbon', 'Лісабон Lisboa'],
    ['Madrid', 'Europe/Madrid', 'Мадрид'],
    ['Warsaw', 'Europe/Warsaw', 'Варшава Varsovia'],
    ['Istanbul', 'Europe/Istanbul', 'Стамбул Estambul'],
    ['Dubai', 'Asia/Dubai', 'Дубай Dubái'],
    ['Mumbai', 'Asia/Kolkata', 'Мумбаї Bombay'],
    ['Kathmandu', 'Asia/Kathmandu', 'Катманду Katmandú'],
    ['Bangkok', 'Asia/Bangkok', 'Бангкок'],
    ['Singapore', 'Asia/Singapore', 'Сінгапур Singapur'],
    ['Tokyo', 'Asia/Tokyo', 'Токіо Tokio'],
    ['Seoul', 'Asia/Seoul', 'Сеул Seúl'],
    ['Sydney', 'Australia/Sydney', 'Сідней Sídney'],
    ['Auckland', 'Pacific/Auckland', 'Окленд'],
    ['Honolulu', 'Pacific/Honolulu', 'Гонолулу'],
    ['Los Angeles', 'America/Los_Angeles', 'Лос-Анджелес Los Ángeles'],
    ['Denver', 'America/Denver', 'Денвер'],
    ['Chicago', 'America/Chicago', 'Чикаго'],
    ['New York', 'America/New_York', 'Нью-Йорк Nueva York'],
    ['Toronto', 'America/Toronto', 'Торонто'],
    ['Mexico City', 'America/Mexico_City', 'Мехіко Ciudad de México'],
    ['São Paulo', 'America/Sao_Paulo', 'Сан-Паулу Sao Paulo'],
    ['Buenos Aires', 'America/Argentina/Buenos_Aires', 'Буенос-Айрес'],
    ['Cairo', 'Africa/Cairo', 'Каїр El Cairo'],
    ['Lagos', 'Africa/Lagos', 'Лагос'],
    ['Nairobi', 'Africa/Nairobi', 'Найробі'],
    ['Johannesburg', 'Africa/Johannesburg', 'Йоганнесбург Johannesburgo'],
    ['Reykjavik', 'Atlantic/Reykjavik', "Рейк'явік Reikiavik"],
    ['Chatham Islands', 'Pacific/Chatham', 'Чатем Islas Chatham'],
]

const ZONE_ALIASES: Record<string, string> = {
    'Europe/Kiev': 'Europe/Kyiv',
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Katmandu': 'Asia/Kathmandu',
}

const FALLBACK_ZONE = 'Europe/Kyiv'

export function detectDeviceZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_ZONE
    } catch {
        return FALLBACK_ZONE
    }
}

export function cityOf(zone: string): string {
    const canonical = ZONE_ALIASES[zone] ?? zone
    const known = CITIES.find((entry) => entry[1] === canonical)
    if (known) return known[0]
    const tail = zone.split('/').pop() ?? zone
    return tail.replace(/_/g, ' ')
}

export interface CityMatch {
    city: string
    zone: string
}

const MAX_RESULTS = 8

function fold(value: string): string {
    return value
        .toLowerCase()
        .replace(/[’ʼ]/g, "'")
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function canonicalZone(input: string): string | null {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: input }).resolvedOptions().timeZone
    } catch {
        return null
    }
}

export function searchCities(query: string): CityMatch[] {
    const needle = fold(query.trim())
    if (!needle) return []
    const matches = CITIES.filter(([city, zone, aliases]) => fold(`${city} ${zone.replace(/_/g, ' ')} ${aliases}`).includes(needle))
        .slice(0, MAX_RESULTS)
        .map(([city, zone]) => ({ city, zone }))
    if (matches.length === 0 && query.includes('/')) {
        const zone = canonicalZone(query.trim())
        if (zone) matches.push({ city: cityOf(zone), zone })
    }
    return matches
}
