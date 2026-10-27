(function () {
    const Core = window.OverlapCore
    const I18n = window.OverlapI18n

    const DAY = 1440
    const STORAGE_KEY = 'overlap:v1'
    const LOCALES = { en: 'en', uk: 'uk-UA', es: 'es-ES' }
    const WORKWEEK = [1, 2, 3, 4, 5]

    const CITIES = [
        ['Kyiv', 'Europe/Kyiv'], ['Berlin', 'Europe/Berlin'], ['London', 'Europe/London'], ['Lisbon', 'Europe/Lisbon'],
        ['Madrid', 'Europe/Madrid'], ['Warsaw', 'Europe/Warsaw'], ['Istanbul', 'Europe/Istanbul'], ['Dubai', 'Asia/Dubai'],
        ['Mumbai', 'Asia/Kolkata'], ['Kathmandu', 'Asia/Kathmandu'], ['Bangkok', 'Asia/Bangkok'], ['Singapore', 'Asia/Singapore'],
        ['Tokyo', 'Asia/Tokyo'], ['Seoul', 'Asia/Seoul'], ['Sydney', 'Australia/Sydney'], ['Auckland', 'Pacific/Auckland'],
        ['Honolulu', 'Pacific/Honolulu'], ['Los Angeles', 'America/Los_Angeles'], ['Denver', 'America/Denver'],
        ['Chicago', 'America/Chicago'], ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'],
        ['Mexico City', 'America/Mexico_City'], ['São Paulo', 'America/Sao_Paulo'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'],
        ['Cairo', 'Africa/Cairo'], ['Lagos', 'Africa/Lagos'], ['Nairobi', 'Africa/Nairobi'], ['Johannesburg', 'Africa/Johannesburg'],
        ['Reykjavik', 'Atlantic/Reykjavik'], ['Chatham Islands', 'Pacific/Chatham'],
    ]

    const COLORS = { core: '#fff4d6', shoulder: '#f2a65a', late: '#8fa2e8', sleep: '#9fb0e0', off: '#9fb0e0' }

    const deviceZone = (() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Kyiv'
        } catch {
            return 'Europe/Kyiv'
        }
    })()

    const ZONE_ALIASES = { 'Europe/Kiev': 'Europe/Kyiv', 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu' }

    function cityOf(zone) {
        const known = CITIES.find((entry) => entry[1] === (ZONE_ALIASES[zone] ?? zone))
        if (known) return known[0]
        return zone.split('/').pop().replace(/_/g, ' ')
    }

    function defaultState() {
        return {
            people: [
                { id: 'me', name: '', city: cityOf(deviceZone), zone: deviceZone, start: 540, end: 1080, workDays: WORKWEEK, me: true },
                { id: 'p1', name: 'Max', city: 'New York', zone: 'America/New_York', start: 540, end: 1080, workDays: WORKWEEK, sample: true },
                { id: 'p2', name: 'Lena', city: 'Berlin', zone: 'Europe/Berlin', start: 540, end: 1080, workDays: WORKWEEK, sample: true },
            ],
            settings: { lang: 'en', hour12: false, minWindow: 30, haptics: true },
        }
    }

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
            if (saved && saved.people && saved.settings) return saved
        } catch {
            return defaultState()
        }
        return defaultState()
    }

    const persisted = load()
    const state = {
        people: persisted.people,
        settings: persisted.settings,
        tab: 'timeline',
        dayOffset: 0,
        cursor: 0,
        duration: 60,
        sheetStart: null,
        draft: null,
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ people: state.people, settings: state.settings }))
        } catch {
            return
        }
    }

    const $ = (id) => document.getElementById(id)
    const t = (key) => I18n.translate(state.settings.lang, key)
    const you = () => state.people[0]

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
    }

    function personName(person) {
        return person.me ? t('you') : person.name
    }

    function locale() {
        const base = LOCALES[state.settings.lang]
        return base === 'en' ? (state.settings.hour12 ? 'en-US' : 'en-GB') : base
    }

    function fmtTime(ms, zone) {
        return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hour12: state.settings.hour12, timeZone: zone }).format(ms)
    }

    function fmtDay(ms, zone) {
        return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone }).format(ms)
    }

    function dayLabel(ms, zone) {
        const a = Core.localParts(ms, zone)
        const b = Core.localParts(Date.now(), zone)
        return a.year === b.year && a.month === b.month && a.day === b.day ? t('today') : fmtDay(ms, zone)
    }

    function dayStart() {
        return Core.startOfDay(Date.now(), you().zone) + state.dayOffset * DAY * 60000
    }

    function cursorMs() {
        return dayStart() + state.cursor * 60000
    }

    function initCursor() {
        const p = Core.localParts(Date.now(), you().zone)
        state.cursor = Math.min(DAY - 15, Math.round((p.hour * 60 + p.minute) / 15) * 15)
    }

    function statusLabel(status) {
        return t({ core: 'statusCore', shoulder: 'statusShoulder', late: 'statusLate', sleep: 'statusSleep', off: 'statusOff' }[status])
    }

    function glyph(status, inherit) {
        const color = inherit ? 'currentColor' : COLORS[status]
        const shapes = {
            core: `<circle cx="8" cy="8" r="6" fill="${color}"/>`,
            shoulder: `<circle cx="8" cy="8" r="5.2" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M8 2.8a5.2 5.2 0 0 0 0 10.4z" fill="${color}"/>`,
            late: `<circle cx="8" cy="8" r="5.2" fill="none" stroke="${color}" stroke-width="1.8"/>`,
            sleep: `<path d="M12.6 10.6A5.6 5.6 0 0 1 5.4 3.4a5.6 5.6 0 1 0 7.2 7.2z" fill="${color}"/>`,
            off: `<circle cx="8" cy="8" r="5.2" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M4.3 11.7l7.4-7.4" stroke="${color}" stroke-width="1.8"/>`,
        }
        return `<svg viewBox="0 0 16 16" aria-hidden="true">${shapes[status]}</svg>`
    }

    const ICONS = {
        timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M4 12h16M4 17h11"/></svg>',
        people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.4 2.7-5 5.5-5s4.9 1.6 5.5 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.4c1.8.5 3 2 3.4 4.6"/></svg>',
        settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
        left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
        right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    }

    function compromise(people, fromMs) {
        let best = null
        for (let i = 0; i < 7 * 48; i++) {
            const ms = fromMs + i * 30 * 60000
            let worst = 0
            let penalty = 0
            for (const person of people) {
                const severity = Core.SEVERITY[Core.statusAt(person, ms)]
                worst = Math.max(worst, severity)
                penalty += severity
            }
            if (!best || worst < best.worst || (worst === best.worst && penalty < best.penalty)) best = { ms, worst, penalty }
        }
        const start = best.ms
        const end = start + 60 * 60000
        return {
            start,
            end,
            tier: best.worst,
            compromise: true,
            issues: people.map((person) => ({ person, status: Core.statusAt(person, start + 30 * 60000) })).filter((entry) => entry.status !== 'core'),
        }
    }

    function groupWindows(windows) {
        const seen = new Map()
        const result = []
        for (const window of windows) {
            const key = `${fmtTime(window.start, you().zone)}|${fmtTime(window.end, you().zone)}|${window.tier}`
            if (seen.has(key)) {
                seen.get(key).more += 1
                continue
            }
            const item = { ...window, more: 0 }
            seen.set(key, item)
            result.push(item)
        }
        return result
    }

    function computeWindows() {
        const from = Math.max(Math.floor(Date.now() / 900000) * 900000, dayStart())
        const found = Core.findWindows(state.people, from, 7, state.settings.minWindow)
        if (found.length > 0) return groupWindows(found).slice(0, 5)
        return [compromise(state.people, from)]
    }

    function reason(window) {
        let text = window.issues.length === 0 ? t('everyoneWorking') : window.issues.map((entry) => `${personName(entry.person)}: ${statusLabel(entry.status)}`).join(' · ')
        if (window.compromise || window.tier >= 2) text = `${t('compromise')} — ${text}`
        if (window.more) text += ` · ${t('moreDays').replace('{n}', String(window.more))}`
        return text
    }

    function worstOf(window) {
        let worst = 'core'
        for (const entry of window.issues) if (Core.SEVERITY[entry.status] > Core.SEVERITY[worst]) worst = entry.status
        return worst
    }

    function rowHtml(person) {
        const segments = Core.segments(person, dayStart(), DAY)
            .map((seg) => `<i class="seg ${seg.status}" style="left:${(seg.from / DAY) * 100}%;width:${((seg.to - seg.from) / DAY) * 100}%"></i>`)
            .join('')
        return `<div class="row" data-person="${person.id}"><div class="who"><b>${escapeHtml(personName(person))}</b><span class="city">${escapeHtml(person.city)}${person.sample ? ' · ' + t('sample') : ''}</span><span class="loc" data-loc></span></div><div class="band">${segments}</div></div>`
    }

    function axisHtml() {
        return `<div class="axis">${[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => `<span style="left:${(hour / 24) * 100}%">${String(hour).padStart(2, '0')}</span>`).join('')}</div>`
    }

    function windowsOverlay(windows) {
        const start = dayStart()
        return windows
            .filter((window) => !window.compromise && window.end > start && window.start < start + DAY * 60000)
            .filter((window) => window.tier <= 1)
            .map((window) => {
                const from = Math.max(0, (window.start - start) / 60000)
                const to = Math.min(DAY, (window.end - start) / 60000)
                return `<div class="win tier${window.tier}" style="left:${(from / DAY) * 100}%;width:${((to - from) / DAY) * 100}%"></div>`
            })
            .join('')
    }

    function timelineHtml() {
        const windows = computeWindows()
        const overlayWindows = Core.findWindows(state.people, Math.max(Math.floor(Date.now() / 900000) * 900000, dayStart()), 7, state.settings.minWindow)
        const items = windows.map((window, index) => {
            const status = worstOf(window)
            const label = `${dayLabel(window.start, you().zone)}, ${fmtTime(window.start, you().zone)} – ${fmtTime(window.end, you().zone)}, ${reason(window)}`
            return `<li><button class="window${index === 0 ? ' best' : ''}" data-action="jump" data-start="${window.start}" aria-label="${escapeHtml(label)}"><span class="when">${escapeHtml(dayLabel(window.start, you().zone))}</span><span><b>${fmtTime(window.start, you().zone)} – ${fmtTime(window.end, you().zone)}</b><em>${escapeHtml(reason(window))}</em></span>${glyph(status)}</button></li>`
        }).join('')
        const ms = dayStart()
        return `<header class="head"><div><h1>${t('appName')}</h1><p class="sub">${escapeHtml(fmtDay(ms, you().zone))} · ${escapeHtml(you().city)}</p></div><div class="day-switch"><button class="icon-button" data-action="day" data-delta="-1" aria-label="${t('previousDay')}">${ICONS.left}</button><button class="icon-button" data-action="day" data-delta="1" aria-label="${t('nextDay')}">${ICONS.right}</button></div></header>
<section class="panel"><div class="plot" id="plot" role="slider" tabindex="0" aria-label="${t('timeline')}" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="${DAY - 15}" aria-valuenow="0">${state.people.map(rowHtml).join('')}${axisHtml()}${windowsOverlay(overlayWindows)}<div class="cursor" id="cursor"><span class="chip" id="chip"></span></div></div><p class="hint">${t('dragHint')}</p><div class="steps"><button class="step" data-action="step" data-delta="-15">−15 ${t('minutes')}</button><button class="step" data-action="step" data-delta="15">+15 ${t('minutes')}</button></div></section>
<p class="summary" id="summary"></p><button class="primary" style="width:100%" data-action="slot">${t('slot')}</button>
<h2>${t('bestWindows')}</h2><ul class="windows">${items}</ul>`
    }

    let lastWorst = null

    function updateCursor(silent) {
        const plot = $('plot')
        if (!plot) return
        const ms = cursorMs()
        $('cursor').style.left = `${(state.cursor / DAY) * 100}%`
        const worst = Core.worstStatus(state.people, ms)
        const chip = $('chip')
        chip.className = `chip ${worst}`
        chip.innerHTML = `${glyph(worst, true)}${fmtTime(ms, you().zone)}`
        const parts = []
        const everyone = []
        for (const person of state.people) {
            const status = Core.statusAt(person, ms)
            everyone.push(`${personName(person)}: ${statusLabel(status)}`)
            const row = plot.querySelector(`[data-person="${person.id}"] [data-loc]`)
            row.innerHTML = `${glyph(status)}<i>${fmtTime(ms, person.zone)}</i>`
            if (status !== 'core') parts.push(`${personName(person)}: ${statusLabel(status)}`)
        }
        const summaryText = `${t('summary')} ${fmtTime(ms, you().zone)}: ${parts.length === 0 ? t('everyoneWorking') : parts.join(' · ')}`
        $('summary').textContent = summaryText
        plot.setAttribute('aria-valuenow', String(state.cursor))
        plot.setAttribute('aria-valuetext', `${t('summary')} ${fmtTime(ms, you().zone)}. ${everyone.join('. ')}`)
        if (!silent && lastWorst !== null && lastWorst !== worst && state.settings.haptics && navigator.vibrate) navigator.vibrate(10)
        lastWorst = worst
    }

    function setCursor(minute, silent) {
        state.cursor = Math.max(0, Math.min(DAY - 15, minute))
        updateCursor(silent)
    }

    function announce() {
        $('announce').textContent = $('summary').textContent
    }

    function bindPlot() {
        const plot = $('plot')
        let dragging = false
        const move = (event) => {
            const rect = plot.getBoundingClientRect()
            const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
            setCursor(Math.round(((x / rect.width) * DAY) / 15) * 15)
        }
        plot.addEventListener('pointerdown', (event) => {
            dragging = true
            plot.setPointerCapture(event.pointerId)
            move(event)
        })
        plot.addEventListener('pointermove', (event) => {
            if (dragging) move(event)
        })
        const stop = () => {
            if (dragging) announce()
            dragging = false
        }
        plot.addEventListener('keydown', (event) => {
            const delta = event.key === 'ArrowRight' ? 15 : event.key === 'ArrowLeft' ? -15 : event.key === 'PageUp' ? 60 : event.key === 'PageDown' ? -60 : 0
            if (!delta) return
            event.preventDefault()
            setCursor(state.cursor + delta)
            announce()
        })
        plot.addEventListener('pointerup', stop)
        plot.addEventListener('pointercancel', stop)
    }

    function peopleHtml() {
        const now = Date.now()
        const items = state.people.map((person) => {
            const offset = Core.offsetMinutes(now, person.zone)
            const sign = offset >= 0 ? '+' : '−'
            const hours = Math.floor(Math.abs(offset) / 60)
            const minutes = Math.abs(offset) % 60
            const hoursText = `${fmtTime(Date.UTC(2026, 0, 5, 0, person.start), 'UTC')} – ${fmtTime(Date.UTC(2026, 0, 5, 0, person.end), 'UTC')}`
            return `<li><button class="person" data-action="edit" data-id="${person.id}"><b>${escapeHtml(personName(person))}</b><span class="zone">UTC${sign}${hours}${minutes ? ':' + String(minutes).padStart(2, '0') : ''}</span><small>${escapeHtml(person.city)} · ${hoursText}${person.sample ? ' · ' + t('sample') : ''}</small></button></li>`
        }).join('')
        return `<header class="head"><div><h1>${t('people')}</h1><p class="sub">${state.people.length}</p></div></header><ul class="list">${items}</ul><button class="primary" style="width:100%" data-action="add">${t('addPerson')}</button>`
    }

    function segHtml(options, current, action) {
        return `<div class="seg-control">${options.map(([value, label]) => `<button data-action="${action}" data-value="${value}" aria-pressed="${String(current) === String(value)}">${label}</button>`).join('')}</div>`
    }

    function settingsHtml() {
        const s = state.settings
        return `<header class="head"><div><h1>${t('settings')}</h1></div></header>
<div class="setting"><span>${t('language')}</span>${segHtml(I18n.languages.map(([code, name]) => [code, name]), s.lang, 'lang')}</div>
<div class="setting"><span>${t('timeFormat')}</span>${segHtml([['24', t('h24')], ['12', t('h12')]], s.hour12 ? '12' : '24', 'format')}</div>
<div class="setting"><span>${t('minWindow')}</span>${segHtml([['30', `30 ${t('minutes')}`], ['45', `45 ${t('minutes')}`], ['60', `60 ${t('minutes')}`]], s.minWindow, 'minwindow')}</div>
<div class="setting switch-row"><span style="margin:0;font-size:15px;color:var(--ink)">${t('haptics')}</span><button class="switch" role="switch" aria-checked="${s.haptics}" aria-label="${t('haptics')}" data-action="haptics"></button></div>
<p class="note">${t('localOnly')}</p>`
    }

    function renderNav() {
        const tabs = [['timeline', t('timeline')], ['people', t('people')], ['settings', t('settings')]]
        $('nav').innerHTML = tabs.map(([id, label]) => `<button data-action="tab" data-tab="${id}"${state.tab === id ? ' aria-current="page"' : ''}>${ICONS[id]}<span>${label}</span></button>`).join('')
    }

    function render() {
        document.documentElement.lang = state.settings.lang
        renderNav()
        const screen = $('screen')
        screen.innerHTML = state.tab === 'timeline' ? timelineHtml() : state.tab === 'people' ? peopleHtml() : settingsHtml()
        if (state.tab === 'timeline') {
            lastWorst = null
            bindPlot()
            updateCursor(true)
        }
    }

    function slotText(start, duration) {
        const end = start + duration * 60000
        const lines = [`${t('callAt')}: ${fmtDay(start, you().zone)}, ${fmtTime(start, you().zone)}–${fmtTime(end, you().zone)} (${you().city})`]
        for (const person of state.people.slice(1)) {
            lines.push(`${person.name}: ${fmtTime(start, person.zone)}–${fmtTime(end, person.zone)} (${person.city})`)
        }
        return lines.join('\n')
    }

    function slotLink(start, duration) {
        return `overlap://s?v=1&t=${start}&d=${duration}`
    }

    function icsStamp(ms) {
        return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    function slotIcs(start, duration) {
        return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Overlap//EN', 'BEGIN:VEVENT', `UID:${start}@overlap`, `DTSTAMP:${icsStamp(Date.now())}`, `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(start + duration * 60000)}`, 'SUMMARY:Overlap call', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    }

    function toast(message) {
        const node = $('toast')
        node.textContent = message
        node.classList.add('on')
        clearTimeout(toast.timer)
        toast.timer = setTimeout(() => node.classList.remove('on'), 1600)
    }

    function sheetHtml() {
        const start = state.sheetStart
        const end = start + state.duration * 60000
        const rows = state.people.map((person) => {
            const status = Core.statusAt(person, start + (state.duration * 30000))
            return `<li>${glyph(status)}<b>${escapeHtml(personName(person))} <small style="color:var(--mute);font-weight:400">${escapeHtml(person.city)}</small></b><time>${fmtTime(start, person.zone)}</time></li>`
        }).join('')
        return `<div class="grab-zone"><div class="grab"></div></div><p class="slot-time" id="slot-title" tabindex="-1" data-focus>${fmtTime(start, you().zone)} – ${fmtTime(end, you().zone)}</p><p class="slot-day">${escapeHtml(fmtDay(start, you().zone))}</p>
<div style="margin-bottom:4px"><span class="note">${t('duration')}</span></div>${segHtml([['30', `30 ${t('minutes')}`], ['45', `45 ${t('minutes')}`], ['60', `60 ${t('minutes')}`], ['90', `90 ${t('minutes')}`]], state.duration, 'duration')}
<ul class="slot-people">${rows}</ul>
<div class="actions"><button class="primary" data-action="share">${t('share')}</button><button class="secondary" data-action="ics">${t('addToCalendar')}</button><button class="secondary" data-action="link">${t('copyLink')}</button><button class="secondary" data-action="close-sheet">${t('cancel')}</button></div>`
    }

    let lastFocus = null

    function restoreFocus() {
        const fallback = document.querySelector('.nav [aria-current]')
        const node = lastFocus && lastFocus.isConnected ? lastFocus : fallback
        if (node) node.focus()
    }

    function bindSheetDrag() {
        const zone = $('sheet').querySelector('.grab-zone')
        if (!zone) return
        let startY = null
        zone.addEventListener('pointerdown', (event) => {
            startY = event.clientY
            zone.setPointerCapture(event.pointerId)
        })
        zone.addEventListener('pointermove', (event) => {
            if (startY === null) return
            $('sheet').style.transition = 'none'
            $('sheet').style.transform = `translateY(${Math.max(0, event.clientY - startY)}px)`
        })
        const end = (event) => {
            if (startY === null) return
            const distance = event.clientY - startY
            startY = null
            $('sheet').style.transition = ''
            $('sheet').style.transform = ''
            if (distance > 80) closeSheet()
        }
        zone.addEventListener('pointerup', end)
        zone.addEventListener('pointercancel', end)
    }

    function openSheet(start) {
        state.sheetStart = start
        clearTimeout($('sheet').closeTimer)
        lastFocus = document.activeElement
        $('sheet').innerHTML = sheetHtml()
        $('sheet').removeAttribute('inert')
        $('sheet').classList.add('on')
        $('sheet').setAttribute('aria-hidden', 'false')
        $('scrim').classList.add('on')
        bindSheetDrag()
        $('slot-title').focus()
    }

    function closeSheet() {
        $('sheet').classList.remove('on')
        $('sheet').setAttribute('aria-hidden', 'true')
        $('scrim').classList.remove('on')
        $('sheet').closeTimer = setTimeout(() => $('sheet').setAttribute('inert', ''), 260)
        restoreFocus()
    }

    function pageHtml() {
        const d = state.draft
        const hh = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
        const days = t('weekdaysShort').map((label, index) => `<button data-action="draft-day" data-day="${index + 1}" aria-pressed="${d.workDays.includes(index + 1)}">${label}</button>`).join('')
        const citySection = d.me ? '' : `<label class="field"><span>${t('city')}</span><input class="input" id="city" value="${escapeHtml(d.city)}" placeholder="${t('searchCity')}" autocomplete="off"></label><ul class="results" id="results" hidden></ul>`
        const nameField = d.me ? '' : `<label class="field"><span>${t('name')}</span><input class="input" id="name" value="${escapeHtml(d.name)}" maxlength="30"></label>`
        return `<div class="page-head"><button class="icon-button" data-action="close-page" aria-label="${t('cancel')}">${ICONS.left}</button><h1 id="page-title" tabindex="-1" data-focus>${d.isNew ? t('addPerson') : t('editPerson')}</h1></div>
<div class="page-body">${nameField}${citySection}<div class="pair"><label class="field"><span>${t('workStarts')}</span><input class="input" type="time" id="start" value="${hh(d.start)}"></label><label class="field"><span>${t('workEnds')}</span><input class="input" type="time" id="end" value="${hh(d.end)}"></label></div>
<div class="field"><span>${t('workDays')}</span><div class="days">${days}</div></div>
<div class="actions"><button class="primary" data-action="save-person">${t('save')}</button>${d.isNew || d.me ? '' : `<button class="danger" data-action="remove-person">${t('remove')}</button>`}</div></div>`
    }

    function openPage(person) {
        state.draft = person ? { ...person, workDays: [...person.workDays] } : { id: `p${Date.now()}`, name: '', city: '', zone: '', start: 540, end: 1080, workDays: [...WORKWEEK], isNew: true }
        clearTimeout($('page').closeTimer)
        lastFocus = document.activeElement
        $('page').innerHTML = pageHtml()
        $('page').removeAttribute('inert')
        $('page').classList.add('on')
        $('page').setAttribute('aria-hidden', 'false')
        bindPage()
        $('page-title').focus()
    }

    function closePage() {
        $('page').classList.remove('on')
        $('page').setAttribute('aria-hidden', 'true')
        $('page').closeTimer = setTimeout(() => $('page').setAttribute('inert', ''), 260)
        state.draft = null
        restoreFocus()
    }

    function bindPage() {
        const city = $('city')
        if (!city) return
        const results = $('results')
        city.addEventListener('input', () => {
            const query = city.value.trim().toLowerCase()
            const matches = query ? CITIES.filter((entry) => entry[0].toLowerCase().includes(query) || entry[1].toLowerCase().includes(query)).slice(0, 8) : []
            results.hidden = matches.length === 0
            results.innerHTML = matches.map((entry) => `<li><button data-action="pick-city" data-city="${escapeHtml(entry[0])}" data-zone="${entry[1]}"><span>${escapeHtml(entry[0])}</span><small>${entry[1]}</small></button></li>`).join('')
        })
    }

    function readTime(id) {
        const value = $(id).value.split(':')
        return Number(value[0]) * 60 + Number(value[1])
    }

    function savePerson() {
        const d = state.draft
        if (!d.me) {
            const name = $('name').value.trim()
            if (!name) {
                toast(t('needName'))
                return
            }
            if (!d.zone) {
                toast(t('needCity'))
                return
            }
            d.name = name
        }
        d.start = readTime('start')
        d.end = readTime('end')
        if (d.end === d.start || d.workDays.length === 0) {
            toast(t('needHours'))
            return
        }
        const { isNew, sample, ...person } = d
        const index = state.people.findIndex((entry) => entry.id === person.id)
        if (index === -1) state.people.push(person)
        else state.people[index] = person
        save()
        closePage()
        render()
    }

    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]')
        if (!target) {
            if (event.target.id === 'scrim') closeSheet()
            return
        }
        const action = target.dataset.action
        if (action === 'tab') {
            state.tab = target.dataset.tab
            render()
        } else if (action === 'day') {
            state.dayOffset += Number(target.dataset.delta)
            render()
        } else if (action === 'step') {
            setCursor(state.cursor + Number(target.dataset.delta))
            announce()
        } else if (action === 'jump') {
            const start = Number(target.dataset.start)
            const base = Core.startOfDay(start, you().zone)
            const baseToday = Core.startOfDay(Date.now(), you().zone)
            state.dayOffset = Math.round((base - baseToday) / (DAY * 60000))
            state.cursor = Math.max(0, Math.min(DAY - 15, Math.round((start - dayStart()) / 60000 / 15) * 15))
            render()
            openSheet(start)
        } else if (action === 'slot') {
            openSheet(cursorMs())
        } else if (action === 'close-sheet') {
            closeSheet()
        } else if (action === 'duration') {
            state.duration = Number(target.dataset.value)
            $('sheet').innerHTML = sheetHtml()
            bindSheetDrag()
            const pressed = $('sheet').querySelector('[data-action=duration][aria-pressed=true]')
            if (pressed) pressed.focus()
        } else if (action === 'share') {
            const text = slotText(state.sheetStart, state.duration)
            if (navigator.share) navigator.share({ text }).catch(() => undefined)
            else navigator.clipboard?.writeText(text).then(() => toast(t('copied')))
        } else if (action === 'link') {
            navigator.clipboard?.writeText(slotLink(state.sheetStart, state.duration)).then(() => toast(t('copied')))
        } else if (action === 'ics') {
            const blob = new Blob([slotIcs(state.sheetStart, state.duration)], { type: 'text/calendar' })
            const anchor = document.createElement('a')
            anchor.href = URL.createObjectURL(blob)
            anchor.download = 'overlap-call.ics'
            anchor.click()
            URL.revokeObjectURL(anchor.href)
        } else if (action === 'edit') {
            openPage(state.people.find((person) => person.id === target.dataset.id))
        } else if (action === 'add') {
            openPage(null)
        } else if (action === 'close-page') {
            closePage()
        } else if (action === 'pick-city') {
            state.draft.city = target.dataset.city
            state.draft.zone = target.dataset.zone
            $('city').value = target.dataset.city
            $('results').hidden = true
        } else if (action === 'draft-day') {
            const day = Number(target.dataset.day)
            const days = state.draft.workDays
            state.draft.workDays = days.includes(day) ? days.filter((entry) => entry !== day) : [...days, day].sort()
            target.setAttribute('aria-pressed', String(state.draft.workDays.includes(day)))
        } else if (action === 'save-person') {
            savePerson()
        } else if (action === 'remove-person') {
            if (!state.removeArmed) {
                state.removeArmed = true
                target.textContent = t('tapAgain')
                setTimeout(() => {
                    state.removeArmed = false
                    if (target.isConnected) target.textContent = t('remove')
                }, 3000)
                return
            }
            state.removeArmed = false
            state.people = state.people.filter((person) => person.id !== state.draft.id)
            save()
            closePage()
            render()
        } else if (action === 'lang') {
            state.settings.lang = target.dataset.value
            save()
            render()
        } else if (action === 'format') {
            state.settings.hour12 = target.dataset.value === '12'
            save()
            render()
        } else if (action === 'minwindow') {
            state.settings.minWindow = Number(target.dataset.value)
            save()
            render()
        } else if (action === 'haptics') {
            state.settings.haptics = !state.settings.haptics
            save()
            render()
        }
    })

    document.addEventListener('keydown', (event) => {
        const surface = $('page').classList.contains('on') ? $('page') : $('sheet').classList.contains('on') ? $('sheet') : null
        if (!surface) return
        if (event.key === 'Escape') {
            if (surface === $('page')) closePage()
            else closeSheet()
            return
        }
        if (event.key !== 'Tab') return
        const items = [...surface.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')].filter((node) => !node.disabled && node.offsetParent !== null)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    })

    initCursor()
    render()
})()
