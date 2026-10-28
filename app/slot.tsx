import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { HAS_WEB_LINK, LINK_BASE } from '../src/config'
import { callKey, createCall } from '../src/domain/calls/calls'
import { slotText } from '../src/domain/share/slotText'
import { buildSlotLink, DEFAULT_DURATION, durationOptions, MAX_TITLE_LENGTH, parseSlot } from '../src/domain/share/slotLink'
import { findClockShifts } from '../src/domain/time/dst'
import { statusAt } from '../src/domain/time/status'
import { scheduleReminder } from '../src/features/calls/reminders'
import { addSlotToCalendar } from '../src/features/slot/calendar'
import { useFormat } from '../src/i18n/useFormat'
import { useAppStore } from '../src/store/useAppStore'
import { useGroupView } from '../src/store/useGroupView'
import { Button } from '../src/ui/Button'
import { Glyph } from '../src/ui/Glyph'
import { SegControl } from '../src/ui/SegControl'
import { TextField } from '../src/ui/TextField'
import { type Palette, radius, spacing, type } from '../src/ui/tokens'
import { useColors } from '../src/ui/theme'

const NOTICE_MS = 2200
const NOTICE_MS_PER_CHAR = 55
const NOTICE_FADE_MS = 160
const ENTER_MS = 280
const EXIT_MS = 220
const SCRIM_MS = 200
const DAY_MS = 86400000
const MAX_SHIFT_NOTES = 2
const MAX_LOOKAHEAD_DAYS = 120
const DRAG_CLOSE_DISTANCE = 110
const DRAG_CLOSE_VELOCITY = 900
const DRAG_RESET_MS = 180

export default function SlotScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const { people } = useGroupView()
    const calls = useAppStore((state) => state.calls)
    const saveCall = useAppStore((state) => state.saveCall)
    const params = useLocalSearchParams<{ start?: string; duration?: string; title?: string }>()

    const incoming = parseSlot({ v: '1', t: params.start, d: params.duration, n: params.title })
    const [duration, setDuration] = useState(incoming?.duration ?? DEFAULT_DURATION)
    const [title, setTitle] = useState(incoming?.title ?? '')
    const [notice, setNotice] = useState<string | null>(null)
    const [visible, setVisible] = useState(true)
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current)
            if (closeTimer.current) clearTimeout(closeTimer.current)
        },
        [],
    )

    const close = useCallback(() => {
        if (closeTimer.current) return
        setVisible(false)
        closeTimer.current = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), EXIT_MS + 30)
    }, [router])

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            close()
            return true
        })
        return () => subscription.remove()
    }, [close])

    const dragY = useSharedValue(0)
    const dragVelocity = useSharedValue(0)
    const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }))
    const drag = usePanGesture({
        activeOffsetY: [-8, 8],
        failOffsetX: [-24, 24],
        onBegin: () => {
            'worklet'
            dragVelocity.value = 0
        },
        onUpdate: (event) => {
            'worklet'
            dragY.value = Math.max(0, event.translationY)
            dragVelocity.value = event.velocityY
        },
        onFinalize: () => {
            'worklet'
            if (dragY.value > DRAG_CLOSE_DISTANCE || dragVelocity.value > DRAG_CLOSE_VELOCITY) scheduleOnRN(close)
            else dragY.value = withTiming(0, { duration: DRAG_RESET_MS })
        },
    })

    if (!incoming) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.xl }]}>
                <Button label={format.t('cancel')} variant="secondary" onPress={close} />
            </View>
        )
    }

    const start = incoming.start
    const me = people[0]
    const end = start + duration * 60000
    const unit = format.t('minutes')
    const slot = { start, duration, title }
    const heading = title.trim() || format.t('defaultTitle')
    const lookahead = Math.min(MAX_LOOKAHEAD_DAYS, Math.max(1, Math.ceil((start - Date.now()) / DAY_MS)))
    const shiftNotes = findClockShifts(people, Date.now(), lookahead).filter((entry) => entry.at <= start)

    const details = () => {
        const lines = slotText(people, start, duration, { callAt: format.t('callAt'), day: format.day, time: format.time })
        return title.trim() ? `${title.trim()}\n${lines}` : lines
    }

    const showNotice = (message: string) => {
        if (noticeTimer.current) clearTimeout(noticeTimer.current)
        setNotice(message)
        noticeTimer.current = setTimeout(() => setNotice(null), Math.max(NOTICE_MS, message.length * NOTICE_MS_PER_CHAR))
    }

    const share = () => {
        const link = HAS_WEB_LINK ? `\n${buildSlotLink(LINK_BASE, slot)}` : ''
        Share.share({ message: `${details()}${link}` })
    }

    const saveWeekly = async () => {
        const call = createCall({ id: `c${Date.now()}`, title: heading, startMs: start, duration, zone: me.zone, people })
        const duplicate = calls.some((entry) => callKey(entry) === callKey(call) && entry.personIds.join() === call.personIds.join())
        if (duplicate) {
            showNotice(format.t('alreadySaved'))
            return
        }
        const result = await scheduleReminder(call, me, format.t('startsIn').replace('{n}', String(call.remind)))
        saveCall({ ...call, remind: result.outcome === 'scheduled' ? call.remind : 0, notificationId: result.notificationId })
        showNotice(result.outcome === 'denied' ? format.t('reminderDenied') : result.outcome === 'unavailable' ? `${format.t('savedCall')}. ${format.t('reminderUnavailable')}` : format.t('savedCall'))
    }

    const copyLink = async () => {
        await Clipboard.setStringAsync(buildSlotLink(LINK_BASE, slot))
        showNotice(format.t('copied'))
    }

    const addToCalendar = async () => {
        const outcome = await addSlotToCalendar(slot, heading, details())
        if (outcome === 'failed') showNotice(format.t('calendarFailed'))
    }

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {visible ? (
                <Animated.View entering={FadeIn.duration(SCRIM_MS)} exiting={FadeOut.duration(EXIT_MS)} style={StyleSheet.absoluteFill}>
                    <Pressable accessibilityRole="button" accessibilityLabel={format.t('cancel')} onPress={close} style={styles.scrim} />
                </Animated.View>
            ) : null}
            {visible ? (
                <Animated.View style={[styles.dragWrap, dragStyle]}>
                <Animated.View entering={SlideInDown.duration(ENTER_MS)} exiting={SlideOutDown.duration(EXIT_MS)} style={styles.sheet}>
            <GestureDetector gesture={drag}>
                <View style={styles.handleZone} accessible accessibilityRole="button" accessibilityLabel={format.t('cancel')} onAccessibilityTap={close}>
                    <View style={styles.grab} />
                </View>
            </GestureDetector>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
                <Text style={styles.time} accessibilityRole="header">
                    {format.time(start, me.zone)} – {format.time(end, me.zone)}
                </Text>
                <Text style={styles.day}>{format.day(start, me.zone)}</Text>

                <TextField label={format.t('slotTitle')} placeholder={format.t('defaultTitle')} value={title} maxLength={MAX_TITLE_LENGTH} onChangeText={setTitle} />

                <Text style={styles.label}>{format.t('duration')}</Text>
                <SegControl options={durationOptions(duration).map((value) => [value, `${value} ${unit}`] as const)} value={duration} onChange={setDuration} />

                <View style={styles.people}>
                    {people.map((person, index) => {
                        const status = statusAt(person, start + duration * 30000)
                        return (
                            <View key={person.id} style={[styles.person, index === 0 ? null : styles.personDivider]} accessible accessibilityLabel={`${format.personName(person)}, ${person.city}, ${format.time(start, person.zone)}, ${format.statusText(person, status, start + duration * 30000)}`}>
                                <Glyph status={status} size={16} />
                                <Text style={styles.personName} numberOfLines={1}>
                                    {format.personName(person)} <Text style={styles.personCity}>{person.city}</Text>
                                </Text>
                                <Text style={styles.personTime}>{format.time(start, person.zone)}</Text>
                            </View>
                        )
                    })}
                </View>

                {shiftNotes.length > 0 ? (
                    <View style={styles.shiftNote}>
                        {shiftNotes.slice(0, MAX_SHIFT_NOTES).map((entry) => (
                            <Text key={`${entry.person.id}-${entry.at}`} style={styles.shiftText}>
                                {format.shiftText(entry, me.zone)}
                            </Text>
                        ))}
                    </View>
                ) : null}

                <View style={styles.actions}>
                    <Button label={format.t('share')} onPress={share} />
                    <View style={styles.actionRow}>
                        <Button label={format.t('addToCalendar')} variant="secondary" onPress={addToCalendar} flex />
                        <Button label={format.t('copyLink')} variant="secondary" onPress={copyLink} flex />
                    </View>
                    <Button label={format.t('saveWeekly')} variant="secondary" onPress={saveWeekly} />
                    <Button label={format.t('cancel')} variant="quiet" onPress={close} />
                </View>
            </ScrollView>

            {notice ? (
                <Animated.View
                    entering={FadeInDown.duration(NOTICE_FADE_MS)}
                    exiting={FadeOut.duration(NOTICE_FADE_MS)}
                    style={[styles.notice, { bottom: insets.bottom + spacing.lg }]}
                    accessibilityLiveRegion="polite"
                >
                    <Text style={styles.noticeText}>{notice}</Text>
                </Animated.View>
            ) : null}
                </Animated.View>
                </Animated.View>
            ) : null}
        </KeyboardAvoidingView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    scrim: { flex: 1, backgroundColor: colors.scrim },
    dragWrap: { maxHeight: '92%' },
    sheet: { flexShrink: 1, backgroundColor: colors.ground, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
    screen: { flex: 1, backgroundColor: colors.ground, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
    content: { paddingHorizontal: spacing.xl, gap: spacing.md },
    handleZone: { height: 36, alignItems: 'center', justifyContent: 'center' },
    grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.raised },
    time: { ...type.numeralLarge, color: colors.text },
    day: { ...type.body, color: colors.muted, marginBottom: spacing.sm },
    label: { ...type.label, color: colors.muted },
    people: { marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
    person: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    personDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    personName: { ...type.heading, color: colors.text, flex: 1 },
    personCity: { ...type.label, color: colors.muted },
    personTime: { ...type.numeral, color: colors.text },
    shiftNote: { gap: spacing.xs, marginTop: spacing.xs },
    shiftText: { ...type.label, color: colors.muted },
    actions: { gap: spacing.sm, marginTop: spacing.lg },
    actionRow: { flexDirection: 'row', gap: spacing.sm },
    notice: { position: 'absolute', left: spacing.xl, right: spacing.xl, backgroundColor: colors.text, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    noticeText: { ...type.heading, color: colors.ground, textAlign: 'center' },
})
