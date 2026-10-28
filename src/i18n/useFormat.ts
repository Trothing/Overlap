import { useMemo } from 'react'
import type { ClockShift } from '../domain/time/dst'
import type { Person, Status } from '../domain/types'
import { shoulderSide } from '../domain/time/status'
import { localParts } from '../domain/time/localTime'
import { useAppStore } from '../store/useAppStore'
import { dictionaries, type TranslationKey } from './dictionary'
import { dayFormatter, resolveLocale, timeFormatter } from './formatters'

const STATUS_KEYS: Record<Status, TranslationKey> = {
    core: 'statusCore',
    shoulder: 'statusShoulder',
    late: 'statusLate',
    sleep: 'statusSleep',
    off: 'statusOff',
}

export function useFormat() {
    const lang = useAppStore((state) => state.settings.lang)
    const hour12 = useAppStore((state) => state.settings.hour12)

    return useMemo(() => {
        const dictionary = dictionaries[lang]
        const locale = resolveLocale(lang, hour12)

        const t = (key: TranslationKey) => dictionary[key]
        const time = (ms: number, zone: string) => timeFormatter(locale, hour12, zone).format(ms)
        const day = (ms: number, zone: string) => dayFormatter(locale, zone).format(ms)

        const dayLabel = (ms: number, zone: string) => {
            const a = localParts(ms, zone)
            const b = localParts(Date.now(), zone)
            return a.year === b.year && a.month === b.month && a.day === b.day ? t('today') : day(ms, zone)
        }

        const statusLabel = (status: Status) => t(STATUS_KEYS[status])
        const statusText = (person: Person, status: Status, ms: number) => (status === 'shoulder' ? t(shoulderSide(person, ms) === 'before' ? 'statusBefore' : 'statusAfter') : t(STATUS_KEYS[status]))
        const personName = (person: Person) => (person.me ? t('you') : person.name)
        const moreDays = (count: number) => t('moreDays').replace('{n}', String(count))

        const durationText = (minutes: number) => {
            const whole = Math.floor(minutes / 60)
            const rest = minutes % 60
            const parts: string[] = []
            if (whole > 0) parts.push(`${whole} ${t('hoursShort')}`)
            if (rest > 0) parts.push(`${rest} ${t('minutes')}`)
            return parts.join(' ')
        }

        const shiftText = (entry: ClockShift, zone: string) =>
            t(entry.shift < 0 ? 'dstEarlier' : 'dstLater')
                .replace('{date}', day(entry.at, zone))
                .replace('{shift}', durationText(Math.abs(entry.shift)))
                .replace('{name}', personName(entry.person))

        return { lang, hour12, t, time, day, dayLabel, statusLabel, statusText, personName, moreDays, durationText, shiftText, weekdays: dictionary.weekdaysShort }
    }, [lang, hour12])
}

export type Format = ReturnType<typeof useFormat>
