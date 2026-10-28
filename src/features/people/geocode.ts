import { mergePlaces, parsePlaces, type Place } from '../../domain/geo/places'
import { isValidZone } from '../../domain/time/localTime'
import type { Language } from '../../i18n/dictionary'

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1'
const LANGUAGES: Language[] = ['en', 'uk', 'es']
const PER_LANGUAGE = 8
const TIMEOUT_MS = 6000

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const forward = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', forward)
    try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error(`geocoding ${response.status}`)
        return await response.json()
    } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', forward)
    }
}

async function searchIn(query: string, language: Language, signal?: AbortSignal): Promise<Place[]> {
    const url = `${ENDPOINT}/search?name=${encodeURIComponent(query)}&count=${PER_LANGUAGE}&language=${language}&format=json`
    return parsePlaces(await fetchJson(url, signal)).filter((place) => isValidZone(place.zone))
}

export async function searchPlaces(query: string, preferred: Language, signal?: AbortSignal): Promise<Place[]> {
    const order = [preferred, ...LANGUAGES.filter((language) => language !== preferred)]
    const settled = await Promise.allSettled(order.map((language) => searchIn(query, language, signal)))
    const lists = settled.flatMap((entry) => (entry.status === 'fulfilled' ? [entry.value] : []))
    if (lists.length === 0) throw new Error('geocoding unavailable')
    return mergePlaces(lists)
}

export async function localizePlace(place: Place, language: Language, signal?: AbortSignal): Promise<Place> {
    const payload = await fetchJson(`${ENDPOINT}/get?id=${encodeURIComponent(place.id)}&language=${language}`, signal)
    const localized = parsePlaces({ results: [payload] })[0]
    return localized && isValidZone(localized.zone) ? { ...localized, population: place.population } : place
}
