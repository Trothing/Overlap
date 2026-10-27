(function () {
    const LINK_VERSION = '1'
    const MIN_START = Date.UTC(2020, 0, 1)
    const MAX_START = Date.UTC(2100, 0, 1)
    const MIN_DURATION = 5
    const MAX_DURATION = 480
    const MAX_TITLE = 60
    const MAX_LINE_BYTES = 75
    const SCHEME = 'overlap://s'
    const LOCALES = { en: 'en', uk: 'uk-UA', es: 'es-ES' }
    const ZONE_NAMES = { 'Europe/Kiev': 'Europe/Kyiv', 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu' }

    const DICTIONARY = {
        en: {
            defaultTitle: 'Overlap call',
            addToCalendar: 'Add to calendar',
            openInApp: 'Open in the Overlap app',
            invalidTitle: 'This link is not valid',
            invalidHint: 'Ask the sender to share the slot again.',
            minutes: 'min',
            inYourZone: 'In your time zone',
            nextDay: 'next day',
            foot: 'Overlap finds the best time for a call across time zones.',
        },
        uk: {
            defaultTitle: 'Дзвінок Overlap',
            addToCalendar: 'Додати в календар',
            openInApp: 'Відкрити в застосунку Overlap',
            invalidTitle: 'Це посилання недійсне',
            invalidHint: 'Попросіть відправника поділитися слотом ще раз.',
            minutes: 'хв',
            inYourZone: 'У вашому часовому поясі',
            nextDay: 'наступного дня',
            foot: 'Overlap знаходить найкращий час для дзвінка між часовими поясами.',
        },
        es: {
            defaultTitle: 'Llamada Overlap',
            addToCalendar: 'Añadir al calendario',
            openInApp: 'Abrir en la app Overlap',
            invalidTitle: 'Este enlace no es válido',
            invalidHint: 'Pide a quien lo envió que comparta el horario otra vez.',
            minutes: 'min',
            inYourZone: 'En tu zona horaria',
            nextDay: 'día siguiente',
            foot: 'Overlap encuentra la mejor hora para una llamada entre zonas horarias.',
        },
    }

    const $ = (id) => document.getElementById(id)

    function pickLanguage(params) {
        const requested = params.get('lang')
        if (requested && DICTIONARY[requested]) return requested
        const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']
        for (const tag of candidates) {
            const base = String(tag).slice(0, 2).toLowerCase()
            if (DICTIONARY[base]) return base
        }
        return 'en'
    }

    function cleanTitle(value) {
        return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TITLE)
    }

    function parseSlot(params) {
        if (params.get('v') !== LINK_VERSION) return null
        const start = Number(params.get('t'))
        const duration = Number(params.has('d') ? params.get('d') : 60)
        if (!Number.isInteger(start) || start < MIN_START || start > MAX_START) return null
        if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) return null
        return { start, duration, title: cleanTitle(params.get('n')) }
    }

    function slotQuery(slot) {
        const base = `v=${LINK_VERSION}&t=${slot.start}&d=${slot.duration}`
        return slot.title ? `${base}&n=${encodeURIComponent(slot.title)}` : base
    }

    function stamp(ms) {
        return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    function escapeText(value) {
        return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
    }

    function byteLength(character) {
        const code = character.codePointAt(0)
        if (code < 0x80) return 1
        if (code < 0x800) return 2
        if (code < 0x10000) return 3
        return 4
    }

    function foldLine(line) {
        const parts = []
        let current = ''
        let bytes = 0
        for (const character of line) {
            const size = byteLength(character)
            const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1
            if (bytes + size > limit) {
                parts.push(current)
                current = ''
                bytes = 0
            }
            current += character
            bytes += size
        }
        parts.push(current)
        return parts.join('\r\n ')
    }

    function buildIcs(slot, title, description) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Overlap//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${slot.start}-${slot.duration}@overlap`,
            `DTSTAMP:${stamp(Date.now())}`,
            `DTSTART:${stamp(slot.start)}`,
            `DTEND:${stamp(slot.start + slot.duration * 60000)}`,
            `SUMMARY:${escapeText(title)}`,
            `DESCRIPTION:${escapeText(description)}`,
            'END:VEVENT',
            'END:VCALENDAR',
        ]
        return `${lines.map(foldLine).join('\r\n')}\r\n`
    }

    function download(content) {
        const blob = new Blob([content], { type: 'text/calendar' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'overlap-call.ics'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    function zoneLabel(locale, ms) {
        const detected = new Intl.DateTimeFormat().resolvedOptions().timeZone
        const zone = ZONE_NAMES[detected] || detected
        let offset = ''
        try {
            const part = new Intl.DateTimeFormat(locale, { timeZoneName: 'shortOffset' }).formatToParts(ms).find((entry) => entry.type === 'timeZoneName')
            offset = part ? part.value : ''
        } catch {
            offset = ''
        }
        return offset ? `${zone} (${offset})` : zone
    }

    function render(slot, lang) {
        const text = DICTIONARY[lang]
        const locale = lang === 'en' && /^en/i.test(navigator.language || '') ? navigator.language : LOCALES[lang]
        const end = slot.start + slot.duration * 60000
        const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
        const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
        const sameDay = day.format(slot.start) === day.format(end)
        const range = `${time.format(slot.start)} – ${time.format(end)}`
        const title = slot.title || text.defaultTitle

        $('title').textContent = title
        $('day').textContent = day.format(slot.start)
        $('time').textContent = sameDay ? range : `${range} (${text.nextDay})`
        $('meta').textContent = `${text.inYourZone}: ${zoneLabel(locale, slot.start)} · ${slot.duration} ${text.minutes}`
        $('calendar').textContent = text.addToCalendar
        $('app').textContent = text.openInApp
        $('app').setAttribute('href', `${SCHEME}?${slotQuery(slot)}`)
        document.title = `${title} · ${range}`

        const description = `${day.format(slot.start)}, ${range}\n${zoneLabel(locale, slot.start)}`
        $('calendar').addEventListener('click', () => download(buildIcs(slot, title, description)))
        $('slot').hidden = false
    }

    function renderInvalid(lang) {
        const text = DICTIONARY[lang]
        $('invalid-title').textContent = text.invalidTitle
        $('invalid-hint').textContent = text.invalidHint
        document.title = text.invalidTitle
        $('invalid').hidden = false
    }

    const params = new URLSearchParams(window.location.search)
    const forcedTheme = params.get('theme')
    if (forcedTheme === 'light' || forcedTheme === 'dark') document.documentElement.setAttribute('data-theme', forcedTheme)
    const lang = pickLanguage(params)
    document.documentElement.lang = lang
    $('foot').textContent = DICTIONARY[lang].foot

    const slot = parseSlot(params)
    if (slot) render(slot, lang)
    else renderInvalid(lang)
})()
