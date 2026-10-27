(function () {
    const STEP_MINUTES = 15
    const SEVERITY = { core: 0, shoulder: 1, late: 2, sleep: 3, off: 3 }
    const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

    const formatterCache = new Map()

    function partsFormatter(zone) {
        if (!formatterCache.has(zone)) {
            formatterCache.set(zone, new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                hourCycle: 'h23',
                weekday: 'short',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
            }))
        }
        return formatterCache.get(zone)
    }

    function localParts(ms, zone) {
        const result = {}
        for (const part of partsFormatter(zone).formatToParts(new Date(ms))) {
            if (part.type !== 'literal') result[part.type] = part.value
        }
        return {
            year: Number(result.year),
            month: Number(result.month),
            day: Number(result.day),
            hour: Number(result.hour) % 24,
            minute: Number(result.minute),
            isoWeekday: WEEKDAYS[result.weekday],
        }
    }

    function offsetMinutes(ms, zone) {
        const p = localParts(ms, zone)
        const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
        return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000)
    }

    function statusAt(person, ms) {
        const p = localParts(ms, person.zone)
        const minutes = p.hour * 60 + p.minute
        const overnight = person.start > person.end
        const cycleDay = overnight && minutes < person.start ? (p.isoWeekday + 5) % 7 + 1 : p.isoWeekday
        if (!person.workDays.includes(cycleDay)) return 'off'
        const length = (person.end - person.start + 1440) % 1440
        const offset = (minutes - person.start + 1440) % 1440
        if (offset < length) return 'core'
        if (offset >= 1440 - 90 || (offset >= length && offset < length + 150)) return 'shoulder'
        if (offset >= 1440 - 180 || (offset >= length + 150 && offset < length + 330)) return 'late'
        return 'sleep'
    }

    function worstStatus(people, ms) {
        let worst = 'core'
        for (const person of people) {
            const status = statusAt(person, ms)
            if (SEVERITY[status] > SEVERITY[worst]) worst = status
        }
        return worst
    }

    function startOfDay(ms, zone) {
        const p = localParts(ms, zone)
        let guess = ms - (p.hour * 60 + p.minute) * 60000
        const check = localParts(guess, zone)
        const drift = check.hour * 60 + check.minute
        if (drift === 0) return guess
        return drift > 720 ? guess + (1440 - drift) * 60000 : guess - drift * 60000
    }

    function findWindows(people, fromMs, days, minMinutes) {
        const steps = Math.floor((days * 24 * 60) / STEP_MINUTES)
        const cells = []
        for (let i = 0; i < steps; i++) {
            const ms = fromMs + i * STEP_MINUTES * 60000
            let worst = 0
            let penalty = 0
            for (const person of people) {
                const severity = SEVERITY[statusAt(person, ms)]
                if (severity > worst) worst = severity
                penalty += severity
            }
            cells.push({ ms, worst, penalty })
        }

        const windows = []
        let current = null
        for (const cell of cells) {
            const playable = cell.worst <= 2
            const tier = cell.worst
            if (playable && current && current.tier === tier) {
                current.end = cell.ms + STEP_MINUTES * 60000
                current.penalty += cell.penalty
                current.cells += 1
            } else {
                if (current && current.cells * STEP_MINUTES >= minMinutes) windows.push(current)
                current = playable ? { start: cell.ms, end: cell.ms + STEP_MINUTES * 60000, tier, penalty: cell.penalty, cells: 1 } : null
            }
        }
        if (current && current.cells * STEP_MINUTES >= minMinutes) windows.push(current)

        for (const window of windows) {
            window.issues = people
                .map((person) => ({ person, status: statusAt(person, window.start + (window.end - window.start) / 2) }))
                .filter((entry) => entry.status !== 'core')
        }

        windows.sort((a, b) => a.tier - b.tier || a.penalty / a.cells - b.penalty / b.cells || a.start - b.start)
        return windows
    }

    function segments(person, dayStart, dayMinutes) {
        const result = []
        for (let m = 0; m < dayMinutes; m += STEP_MINUTES) {
            const status = statusAt(person, dayStart + m * 60000)
            const last = result[result.length - 1]
            if (last && last.status === status) last.to = m + STEP_MINUTES
            else result.push({ status, from: m, to: m + STEP_MINUTES })
        }
        return result
    }

    window.OverlapCore = {
        STEP_MINUTES,
        SEVERITY,
        localParts,
        offsetMinutes,
        statusAt,
        worstStatus,
        startOfDay,
        findWindows,
        segments,
    }
})()
