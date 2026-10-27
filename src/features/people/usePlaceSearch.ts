import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../domain/geo/places'
import { searchCities } from '../../domain/zones'
import type { Language } from '../../i18n/dictionary'
import { searchPlaces } from './geocode'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

interface PlaceSearch {
    places: Place[]
    loading: boolean
    offline: boolean
    searched: boolean
}

export function usePlaceSearch(query: string, language: Language, enabled: boolean): PlaceSearch {
    const trimmed = query.trim()
    const active = enabled && trimmed.length >= MIN_QUERY_LENGTH
    const [remote, setRemote] = useState<{ query: string; places: Place[] } | null>(null)
    const [pending, setPending] = useState(false)
    const [offline, setOffline] = useState(false)

    const local = useMemo<Place[]>(
        () => (active ? searchCities(trimmed).map((city) => ({ id: city.zone, name: city.city, subtitle: city.zone, zone: city.zone, population: 0 })) : []),
        [active, trimmed],
    )

    useEffect(() => {
        if (!active) {
            setRemote(null)
            setPending(false)
            return
        }
        const controller = new AbortController()
        setPending(true)
        const timer = setTimeout(() => {
            searchPlaces(trimmed, language, controller.signal)
                .then((places) => {
                    setOffline(false)
                    setRemote({ query: trimmed, places })
                })
                .catch(() => {
                    if (!controller.signal.aborted) setOffline(true)
                })
                .finally(() => {
                    if (!controller.signal.aborted) setPending(false)
                })
        }, DEBOUNCE_MS)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [active, trimmed, language])

    const fresh = remote && remote.query === trimmed ? remote.places : null
    const places = fresh && fresh.length > 0 ? fresh : local
    return { places, loading: active && pending, offline: active && offline, searched: active && !pending && places.length === 0 }
}
