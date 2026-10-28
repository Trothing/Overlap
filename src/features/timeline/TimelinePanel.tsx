import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type AccessibilityActionEvent, type LayoutChangeEvent, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { Easing, type AnimatedStyle, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg'
import { MINUTES_PER_DAY } from '../../domain/overlap/suggest'
import { coreOverlap, friendlyOverlap, segments, STEP_MINUTES, type MinuteRange } from '../../domain/overlap/windows'
import { statusAt } from '../../domain/time/status'
import type { Person, Segment } from '../../domain/types'
import type { Format } from '../../i18n/useFormat'
import { Glyph } from '../../ui/Glyph'
import { type Palette, radius, spacing, statusFill, type } from '../../ui/tokens'
import { useColors } from '../../ui/theme'
import { LAST_CURSOR, useCursorStore } from './cursorStore'

const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]
const TICKS = Array.from({ length: 25 }, (_, index) => index)
const LABEL_WIDTH = 28
const SETTLE_MS = 110
const SNAP_MS = 90
const MAX_FONT_SCALE = 1.3
const BAND_HEIGHT = 22
const ROW_GAP = 14

interface TimelinePanelProps {
    people: Person[]
    dayStartMs: number
    format: Format
}

function Hatch() {
    const colors = useColors()
    return (
        <Svg width="100%" height="100%">
            <Defs>
                <Pattern id="hatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <Rect width={7} height={7} fill={colors.asleep} />
                    <Path d="M0 0H7" stroke={colors.late} strokeWidth={1.5} />
                </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hatch)" />
        </Svg>
    )
}

interface BandProps {
    parts: Segment[]
    friendly: MinuteRange[]
    strict: MinuteRange[]
}

const Band = memo(function Band({ parts, friendly, strict }: BandProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const fills = useMemo(() => statusFill(colors), [colors])
    const place = (range: MinuteRange) => ({ left: `${(range.from / MINUTES_PER_DAY) * 100}%` as const, width: `${((range.to - range.from) / MINUTES_PER_DAY) * 100}%` as const })
    return (
        <View style={styles.band}>
            {parts.map((part) => (
                <View
                    key={`${part.from}-${part.status}`}
                    style={[styles.segment, { left: `${(part.from / MINUTES_PER_DAY) * 100}%`, width: `${((part.to - part.from) / MINUTES_PER_DAY) * 100}%`, backgroundColor: fills[part.status] }]}
                >
                    {part.status === 'off' ? <Hatch /> : null}
                </View>
            ))}
            {friendly.map((range) => (
                <View key={`f${range.from}`} style={[styles.segment, styles.friendly, place(range)]} />
            ))}
            {strict.map((range) => (
                <View key={`s${range.from}`} style={[styles.segment, styles.strict, place(range)]} />
            ))}
        </View>
    )
})

interface PersonRowProps {
    person: Person
    ms: number
    format: Format
    parts: Segment[]
    friendly: MinuteRange[]
    strict: MinuteRange[]
    ready: boolean
    cursorStyle: AnimatedStyle<ViewStyle>
}

const PersonRow = memo(function PersonRow({ person, ms, format, parts, friendly, strict, ready, cursorStyle }: PersonRowProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const status = statusAt(person, ms)
    return (
        <View style={styles.row}>
            <View style={styles.who}>
                <Text style={styles.name} numberOfLines={1}>
                    {format.personName(person)}
                </Text>
                <Text style={styles.city} numberOfLines={1}>
                    {person.city}
                </Text>
                <Glyph status={status} size={14} />
                <Text style={styles.localTime} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {format.time(ms, person.zone)}
                </Text>
            </View>
            <View style={styles.bandWrap}>
                <Band parts={parts} friendly={friendly} strict={strict} />
                {ready ? <Animated.View pointerEvents="none" style={[styles.cursorPiece, cursorStyle]} /> : null}
            </View>
        </View>
    )
})

export function TimelinePanel({ people, dayStartMs, format }: TimelinePanelProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const minute = useCursorStore((state) => state.minute)
    const setMinute = useCursorStore((state) => state.setMinute)
    const [plotWidth, setPlotWidth] = useState(0)
    const ms = dayStartMs + minute * 60000
    const me = people[0]

    const bands = useMemo(() => people.map((person) => segments(person, dayStartMs, MINUTES_PER_DAY)), [people, dayStartMs])
    const strict = useMemo(() => coreOverlap(bands, MINUTES_PER_DAY), [bands])
    const friendly = useMemo(() => friendlyOverlap(bands, MINUTES_PER_DAY), [bands])

    const width = useSharedValue(0)
    const cursorX = useSharedValue(0)
    const dragging = useSharedValue(false)
    const lastMinute = useSharedValue(-1)
    const latestMinute = useSharedValue(-1)
    const pending = useSharedValue(false)
    const placed = useRef(false)

    const flush = useCallback(() => {
        pending.value = false
        if (latestMinute.value >= 0) setMinute(latestMinute.value)
    }, [pending, latestMinute, setMinute])

    useEffect(() => {
        if (plotWidth <= 0 || dragging.value) return
        if (placed.current && lastMinute.value === minute) return
        const target = (minute / MINUTES_PER_DAY) * plotWidth
        lastMinute.value = minute
        if (placed.current) cursorX.value = withTiming(target, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) })
        else {
            cursorX.value = target
            placed.current = true
        }
    }, [minute, plotWidth, cursorX, dragging, lastMinute])

    const cursorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cursorX.value }] }))

    const pan = usePanGesture({
        activeOffsetX: [-6, 6],
        failOffsetY: [-14, 14],
        onBegin: (event) => {
            'worklet'
            dragging.value = true
            const w = width.value
            if (w <= 0) return
            const x = Math.min(Math.max(event.x, 0), w)
            cursorX.value = x
            const minute = Math.min(Math.round(((x / w) * MINUTES_PER_DAY) / STEP_MINUTES) * STEP_MINUTES, LAST_CURSOR)
            if (minute !== lastMinute.value) {
                lastMinute.value = minute
                latestMinute.value = minute
                if (!pending.value) {
                    pending.value = true
                    scheduleOnRN(flush)
                }
            }
        },
        onUpdate: (event) => {
            'worklet'
            const w = width.value
            if (w <= 0) return
            const x = Math.min(Math.max(event.x, 0), w)
            cursorX.value = x
            const minute = Math.min(Math.round(((x / w) * MINUTES_PER_DAY) / STEP_MINUTES) * STEP_MINUTES, LAST_CURSOR)
            if (minute !== lastMinute.value) {
                lastMinute.value = minute
                latestMinute.value = minute
                if (!pending.value) {
                    pending.value = true
                    scheduleOnRN(flush)
                }
            }
        },
        onFinalize: () => {
            'worklet'
            dragging.value = false
            const w = width.value
            if (w > 0 && lastMinute.value >= 0) {
                cursorX.value = withTiming((lastMinute.value / MINUTES_PER_DAY) * w, { duration: SNAP_MS })
                scheduleOnRN(setMinute, lastMinute.value)
            }
        },
    })

    const onLayout = useCallback(
        (event: LayoutChangeEvent) => {
            width.value = event.nativeEvent.layout.width
            setPlotWidth(event.nativeEvent.layout.width)
        },
        [width],
    )

    const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
        useCursorStore.getState().stepBy(event.nativeEvent.actionName === 'increment' ? STEP_MINUTES : -STEP_MINUTES)
    }, [])

    const spoken = `${format.t('summary')} ${format.time(ms, me.zone)}. ${people.map((person) => `${format.personName(person)}: ${format.statusText(person, statusAt(person, ms), ms)}`).join('. ')}`

    return (
        <View style={styles.panel}>
            <GestureDetector gesture={pan}>
                <View
                    style={styles.plot}
                    onLayout={onLayout}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel={format.t('timeline')}
                    accessibilityHint={format.t('dragHint')}
                    accessibilityValue={{ min: 0, max: LAST_CURSOR, now: minute, text: spoken }}
                    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                    onAccessibilityAction={onAccessibilityAction}
                >
                    {people.map((person, index) => (
                        <PersonRow key={person.id} person={person} ms={ms} format={format} parts={bands[index]} friendly={friendly} strict={strict} ready={plotWidth > 0} cursorStyle={cursorStyle} />
                    ))}

                    <View style={styles.axis}>
                        {TICKS.map((hour) => (
                            <View key={hour} style={[styles.tick, { left: `${(hour / 24) * 100}%` }, hour % 3 === 0 ? styles.tickMajor : null]} />
                        ))}
                        {plotWidth > 0 ? (
                            <Animated.View pointerEvents="none" style={[styles.axisCursor, cursorStyle]}>
                                <View style={styles.dot} />
                            </Animated.View>
                        ) : null}
                        {AXIS_HOURS.map((hour) => (
                            <Text key={hour} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.axisLabel, { left: `${(hour / 24) * 100}%` }]}>
                                {String(hour).padStart(2, '0')}
                            </Text>
                        ))}
                    </View>
                </View>
            </GestureDetector>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, styles.strict]} />
                    <Text style={styles.legendText}>{format.t('everyoneWorking')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, styles.friendly]} />
                    <Text style={styles.legendText}>{format.t('legendEvening')}</Text>
                </View>
            </View>
        </View>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    panel: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    plot: { position: 'relative' },
    row: { marginBottom: ROW_GAP },
    who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
    name: { ...type.heading, color: colors.text, maxWidth: '45%' },
    city: { ...type.label, color: colors.muted, flex: 1, minWidth: 0 },
    localTime: { ...type.numeralSmall, color: colors.text, minWidth: 48, textAlign: 'right' },
    bandWrap: { height: BAND_HEIGHT },
    band: { height: BAND_HEIGHT, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.asleep },
    segment: { position: 'absolute', top: 0, bottom: 0 },
    friendly: { backgroundColor: colors.cautionFill },
    strict: { backgroundColor: colors.accent },
    axis: { height: 28, marginTop: 2 },
    tick: { position: 'absolute', top: 0, width: 1, height: 3, backgroundColor: colors.late },
    tickMajor: { height: 5, backgroundColor: colors.evening },
    axisLabel: { ...type.caption, position: 'absolute', top: 10, width: LABEL_WIDTH, marginLeft: -LABEL_WIDTH / 2, textAlign: 'center', color: colors.muted, fontVariant: ['tabular-nums'] },
    cursorPiece: { position: 'absolute', left: 0, top: -6, bottom: -(ROW_GAP + 2), width: 2, marginLeft: -1, backgroundColor: colors.text },
    axisCursor: { position: 'absolute', left: 0, top: -4, height: 8, width: 2, marginLeft: -1, backgroundColor: colors.text },
    dot: { position: 'absolute', top: 1, left: -6, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.text, borderWidth: 3, borderColor: colors.surface },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs, marginTop: spacing.xs },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    legendText: { ...type.caption, color: colors.muted },
})
