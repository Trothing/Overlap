export interface Place {
    id: string
    name: string
    subtitle: string
    zone: string
    population: number
}

const DEFAULT_LIMIT = 10

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

export function parsePlaces(payload: unknown): Place[] {
    const results = (payload as { results?: unknown } | null)?.results
    if (!Array.isArray(results)) return []
    const places: Place[] = []
    for (const item of results) {
        if (typeof item !== 'object' || item === null) continue
        const raw = item as Record<string, unknown>
        const name = text(raw.name)
        const zone = text(raw.timezone)
        if (!name || !zone || (typeof raw.id !== 'number' && typeof raw.id !== 'string')) continue
        const parts = [text(raw.admin2), text(raw.admin1), text(raw.country)].filter((part, index, all) => part && part !== name && all.indexOf(part) === index)
        places.push({
            id: String(raw.id),
            name,
            subtitle: parts.join(', '),
            zone,
            population: typeof raw.population === 'number' ? raw.population : 0,
        })
    }
    return places
}

export function mergePlaces(lists: Place[][], limit: number = DEFAULT_LIMIT): Place[] {
    const seen = new Set<string>()
    const merged: Place[] = []
    for (const list of lists) {
        for (const place of list) {
            if (seen.has(place.id)) continue
            seen.add(place.id)
            merged.push(place)
        }
    }
    return merged
        .map((place, index) => ({ place, index }))
        .sort((a, b) => b.place.population - a.place.population || a.index - b.index)
        .slice(0, limit)
        .map((entry) => entry.place)
}
