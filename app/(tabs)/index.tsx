import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { planFrom, suggestSlots, worstIssueStatus, type SlotSuggestion } from '../../src/domain/overlap/suggest'
import { STEP_MINUTES } from '../../src/domain/overlap/windows'
import { findClockShifts } from '../../src/domain/time/dst'
import { dayStartAt, localParts } from '../../src/domain/time/localTime'
import { statusAt, worstStatus } from '../../src/domain/time/status'
import type { Person } from '../../src/domain/types'
import { LAST_CURSOR, useCursorStore } from '../../src/features/timeline/cursorStore'
import { TimelinePanel } from '../../src/features/timeline/TimelinePanel'
import { useFormat, type Format } from '../../src/i18n/useFormat'
import { useAppStore } from '../../src/store/useAppStore'
import { Button } from '../../src/ui/Button'
import { Glyph } from '../../src/ui/Glyph'
import { Icon } from '../../src/ui/Icon'
import { type Palette, radius, spacing, type } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

const MAX_DAY_OFFSET = 30
const ROW_FADE_MS = 180
const ROW_STAGGER_MS = 40
const NOTICE_HORIZON_DAYS = 14
const MAX_NOTICES = 2

function nowCursor(zone: string): number {
    const p = localParts(Date.now(), zone)
    return Math.min(LAST_CURSOR, Math.round((p.hour * 60 + p.minute) / STEP_MINUTES) * STEP_MINUTES)
}

function reasonOf(slot: SlotSuggestion, format: Format): string {
    const text = slot.issues.length === 0 ? format.t('everyoneWorking') : slot.issues.map((entry) => `${format.personName(entry.person)}: ${format.statusLabel(entry.status)}`).join(' · ')
    return slot.tier >= 2 ? `${format.t('compromise')} — ${text}` : text
}

interface HeroProps {
    people: Person[]
    dayStartMs: number
    format: Format
    haptics: boolean
}

const Hero = memo(function Hero({ people, dayStartMs, format, haptics }: HeroProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const minute = useCursorStore((state) => state.minute)
    const ms = dayStartMs + minute * 60000
    const me = people[0]

    const worst = worstStatus(people, ms)
    const lastWorst = useRef(worst)
    useEffect(() => {
        if (lastWorst.current !== worst && haptics && Platform.OS !== 'web') Haptics.selectionAsync()
        lastWorst.current = worst
    }, [worst, haptics])

    const notWorking = people
        .map((person) => ({ person, status: statusAt(person, ms) }))
        .filter((entry) => entry.status !== 'core')
        .map((entry) => `${format.personName(entry.person)}: ${format.statusLabel(entry.status)}`)
    const verdict = notWorking.length === 0 ? format.t('everyoneWorking') : notWorking.join(' · ')

    return (
        <View style={styles.hero}>
            <View style={styles.heroTime}>
                <Text style={styles.time} maxFontSizeMultiplier={1.2} accessibilityLabel={`${format.t('summary')} ${format.time(ms, me.zone)}`}>
                    {format.time(ms, me.zone)}
                </Text>
                <View style={styles.verdictRow}>
                    <View style={styles.verdictGlyph}>
                        <Glyph status={worst} size={14} />
                    </View>
                    <Text style={styles.verdict} numberOfLines={2}>
                        {verdict}
                    </Text>
                </View>
            </View>
            <View style={styles.steps}>
                <Pressable accessibilityRole="button" accessibilityLabel={`−${STEP_MINUTES} ${format.t('minutes')}`} onPress={() => useCursorStore.getState().stepBy(-STEP_MINUTES)} style={styles.step}>
                    <Text style={styles.stepLabel} maxFontSizeMultiplier={1.2}>
                        −{STEP_MINUTES}
                    </Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`+${STEP_MINUTES} ${format.t('minutes')}`} onPress={() => useCursorStore.getState().stepBy(STEP_MINUTES)} style={styles.step}>
                    <Text style={styles.stepLabel} maxFontSizeMultiplier={1.2}>
                        +{STEP_MINUTES}
                    </Text>
                </Pressable>
            </View>
        </View>
    )
})

interface BestTimesProps {
    slots: SlotSuggestion[]
    format: Format
    zone: string
    onPick: (start: number) => void
}

const BestTimes = memo(function BestTimes({ slots, format, zone, onPick }: BestTimesProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    return (
        <View>
            {slots.map((slot, index) => {
                const range = `${format.time(slot.start, zone)} – ${format.time(slot.end, zone)}`
                const day = format.dayLabel(slot.start, zone)
                const reason = reasonOf(slot, format)
                const tone = slot.tier === 0 ? colors.accent : slot.tier === 1 ? colors.caution : colors.text
                return (
                    <Animated.View key={slot.start} entering={FadeIn.duration(ROW_FADE_MS).delay(index * ROW_STAGGER_MS)}>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${day}, ${range}, ${reason}`} onPress={() => onPick(slot.start)} style={[styles.window, index === 0 ? null : styles.windowDivider]}>
                            <View style={styles.windowMain}>
                                <Text style={[styles.windowTime, { color: tone }]} maxFontSizeMultiplier={1.3}>
                                    {range}
                                </Text>
                                <Text style={styles.windowReason} numberOfLines={2}>
                                    {day} · {reason}
                                </Text>
                            </View>
                            <Glyph status={worstIssueStatus(slot)} size={16} />
                        </Pressable>
                    </Animated.View>
                )
            })}
        </View>
    )
})

export default function TimelineScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const people = useAppStore((state) => state.people)
    const settings = useAppStore((state) => state.settings)
    const me = people[0]
    const minWindow = settings.minWindow

    const [dayOffset, setDayOffset] = useState(0)
    const [, startTransition] = useTransition()
    useState(() => {
        useCursorStore.getState().setMinute(nowCursor(me.zone))
        return true
    })

    const dayStartMs = useMemo(() => dayStartAt(Date.now(), me.zone, dayOffset), [me.zone, dayOffset])

    const slots = useMemo(() => suggestSlots(people, planFrom(Date.now(), 0), minWindow), [people, minWindow])
    const shifts = useMemo(() => findClockShifts(people, Date.now(), NOTICE_HORIZON_DAYS), [people])

    const shiftDay = (delta: number) => startTransition(() => setDayOffset((value) => Math.min(Math.max(value + delta, 0), MAX_DAY_OFFSET)))

    const openSlot = useCallback((start: number) => router.push({ pathname: '/slot', params: { start: String(start), duration: String(minWindow) } }), [router, minWindow])

    const jumpTo = useCallback(
        (start: number) => {
            const now = Date.now()
            for (let offset = 0; offset <= MAX_DAY_OFFSET; offset++) {
                const from = dayStartAt(now, me.zone, offset)
                const to = dayStartAt(now, me.zone, offset + 1)
                if (start >= from && start < to) {
                    setDayOffset(offset)
                    useCursorStore.getState().setMinute(Math.round((start - from) / 60000 / STEP_MINUTES) * STEP_MINUTES)
                    break
                }
            }
            openSlot(start)
        },
        [me.zone, openSlot],
    )

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
            <View style={styles.dayRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={format.t('previousDay')} onPress={() => shiftDay(-1)} style={styles.dayButton}>
                    <Icon name="left" color={colors.muted} size={20} />
                </Pressable>
                <Text style={styles.day} accessibilityRole="header" accessibilityLiveRegion="polite">
                    {format.dayLabel(dayStartMs + 12 * 3600000, me.zone)}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={format.t('nextDay')} onPress={() => shiftDay(1)} style={styles.dayButton}>
                    <Icon name="right" color={colors.muted} size={20} />
                </Pressable>
            </View>

            <Hero people={people} dayStartMs={dayStartMs} format={format} haptics={settings.haptics} />

            <TimelinePanel people={people} dayStartMs={dayStartMs} format={format} />

            <View style={styles.action}>
                <Button label={format.t('slot')} onPress={() => openSlot(dayStartMs + useCursorStore.getState().minute * 60000)} />
            </View>

            <Text style={styles.sectionTitle} accessibilityRole="header">
                {format.t('bestWindows')}
            </Text>
            <BestTimes slots={slots} format={format} zone={me.zone} onPick={jumpTo} />

            {shifts.length > 0 ? (
                <View style={styles.notice}>
                    <Text style={styles.noticeTitle} accessibilityRole="header">
                        {format.t('dstTitle')}
                    </Text>
                    {shifts.slice(0, MAX_NOTICES).map((entry) => (
                        <Text key={`${entry.person.id}-${entry.at}`} style={styles.noticeText}>
                            {format.shiftText(entry, me.zone)}
                        </Text>
                    ))}
                </View>
            ) : null}
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
    dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayButton: { width: spacing.target, height: spacing.target, alignItems: 'center', justifyContent: 'center' },
    day: { ...type.heading, color: colors.muted },
    hero: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xl },
    heroTime: { flex: 1, minWidth: 0 },
    time: { ...type.display, color: colors.text },
    verdictRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs, minHeight: 44 },
    verdictGlyph: { height: 22, justifyContent: 'center' },
    verdict: { ...type.body, color: colors.text, flex: 1 },
    steps: { flexDirection: 'row', gap: spacing.sm, marginTop: 10 },
    step: { width: spacing.target, height: spacing.target, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    stepLabel: { ...type.numeralSmall, color: colors.text },
    action: { marginTop: spacing.lg },
    notice: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs, marginTop: spacing.lg },
    noticeTitle: { ...type.heading, color: colors.text },
    noticeText: { ...type.label, color: colors.muted },
    sectionTitle: { ...type.heading, color: colors.muted, marginTop: spacing.xxl, marginBottom: spacing.sm },
    window: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    windowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    windowMain: { flex: 1, minWidth: 0, gap: 2 },
    windowTime: { ...type.numeral },
    windowReason: { ...type.label, color: colors.muted },
})
