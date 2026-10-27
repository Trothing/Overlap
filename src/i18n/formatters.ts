import { localeTags, type Language } from './dictionary'

const timeCache = new Map<string, Intl.DateTimeFormat>()
const dayCache = new Map<string, Intl.DateTimeFormat>()

export function resolveLocale(lang: Language, hour12: boolean): string {
    if (lang === 'en') return hour12 ? 'en-US' : 'en-GB'
    return localeTags[lang]
}

export function timeFormatter(locale: string, hour12: boolean, zone: string): Intl.DateTimeFormat {
    const key = `${locale}|${hour12}|${zone}`
    let formatter = timeCache.get(key)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: hour12 ? 'h12' : 'h23', timeZone: zone })
        timeCache.set(key, formatter)
    }
    return formatter
}

export function dayFormatter(locale: string, zone: string): Intl.DateTimeFormat {
    const key = `${locale}|${zone}`
    let formatter = dayCache.get(key)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone })
        dayCache.set(key, formatter)
    }
    return formatter
}

const WARM_LANGUAGES: Language[] = ['en', 'uk', 'es']
const WARM_STEP_MS = 350

export function prewarmFormatters(hour12: boolean, zones: string[], current: Language): () => void {
    const timers: ReturnType<typeof setTimeout>[] = []
    const now = Date.now()
    const order = WARM_LANGUAGES.filter((lang) => lang !== current)
    order.forEach((lang, index) => {
        timers.push(
            setTimeout(() => {
                const locale = resolveLocale(lang, hour12)
                for (const zone of zones) {
                    timeFormatter(locale, hour12, zone).format(now)
                    dayFormatter(locale, zone).format(now)
                }
            }, (index + 1) * WARM_STEP_MS),
        )
    })
    return () => timers.forEach(clearTimeout)
}
