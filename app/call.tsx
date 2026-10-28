import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { callParticipants, nextOccurrence, REMIND_OPTIONS, type SavedCall } from '../src/domain/calls/calls'
import { MAX_TITLE_LENGTH } from '../src/domain/share/slotLink'
import type { IsoWeekday } from '../src/domain/types'
import { cancelReminder, scheduleReminder } from '../src/features/calls/reminders'
import { useFormat } from '../src/i18n/useFormat'
import { useAppStore } from '../src/store/useAppStore'
import { Button } from '../src/ui/Button'
import { Icon } from '../src/ui/Icon'
import { SegControl } from '../src/ui/SegControl'
import { TextField } from '../src/ui/TextField'
import { TimeField } from '../src/ui/TimeField'
import { Toggle } from '../src/ui/Toggle'
import { type Palette, radius, spacing, type } from '../src/ui/tokens'
import { useColors } from '../src/ui/theme'

const REMOVE_CONFIRM_MS = 5000
const DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]
const DURATIONS = [30, 45, 60, 90]

export default function CallScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const { id } = useLocalSearchParams<{ id?: string }>()
    const people = useAppStore((state) => state.people)
    const calls = useAppStore((state) => state.calls)
    const saveCall = useAppStore((state) => state.saveCall)
    const removeCall = useAppStore((state) => state.removeCall)
    const original = calls.find((entry) => entry.id === id)
    const me = people[0]

    const [draft, setDraft] = useState<SavedCall | undefined>(original)
    const [removeArmed, setRemoveArmed] = useState(false)
    const [note, setNote] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!removeArmed) return
        const timer = setTimeout(() => setRemoveArmed(false), REMOVE_CONFIRM_MS)
        return () => clearTimeout(timer)
    }, [removeArmed])

    if (!original || !draft) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.xl }]}>
                <Button label={format.t('cancel')} variant="secondary" onPress={() => router.back()} />
            </View>
        )
    }

    const next = nextOccurrence(draft, Date.now(), me.zone)
    const schedule = `${format.t('everyWeekday').replace('{day}', format.weekdays[draft.weekday - 1])} · ${format.time(next, me.zone)} – ${format.time(next + draft.duration * 60000, me.zone)}`
    const others = people.filter((person) => !person.me)
    const unit = format.t('minutes')

    const change = (patch: Partial<SavedCall>) => {
        setError(null)
        setDraft({ ...draft, ...patch })
    }

    const toggle = (personId: string, on: boolean) => change({ personIds: on ? [...draft.personIds, personId] : draft.personIds.filter((entry) => entry !== personId) })

    const save = async () => {
        if (callParticipants(draft, people).length < 2) {
            setError(format.t('needParticipant'))
            return
        }
        await cancelReminder(original.notificationId)
        const title = draft.title.trim() || format.t('defaultTitle')
        let saved: SavedCall = { ...draft, title, notificationId: undefined }
        if (saved.remind > 0) {
            const result = await scheduleReminder(saved, me, format.t('startsIn').replace('{n}', String(saved.remind)))
            if (result.outcome === 'scheduled') saved = { ...saved, notificationId: result.notificationId }
            else {
                saved = { ...saved, remind: 0 }
                if (result.outcome === 'denied') {
                    setNote(format.t('reminderDenied'))
                    saveCall(saved)
                    return
                }
            }
        }
        saveCall(saved)
        router.back()
    }

    const remove = async () => {
        if (!removeArmed) {
            setRemoveArmed(true)
            return
        }
        await cancelReminder(original.notificationId)
        removeCall(original.id)
        router.back()
    }

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl }]}>
                <View style={styles.head}>
                    <Pressable accessibilityRole="button" accessibilityLabel={format.t('cancel')} onPress={() => router.back()} style={styles.back}>
                        <Icon name="left" color={colors.text} size={22} />
                    </Pressable>
                    <Text style={styles.title} accessibilityRole="header">
                        {format.t('editCall')}
                    </Text>
                </View>

                <Text style={styles.schedule}>{schedule}</Text>

                <TextField label={format.t('callTitle')} value={draft.title} maxLength={MAX_TITLE_LENGTH} onChangeText={(title) => change({ title })} />

                <View style={styles.block}>
                    <Text style={styles.label}>{format.t('callDay')}</Text>
                    <View style={styles.days}>
                        {DAYS.map((day) => {
                            const selected = draft.weekday === day
                            return (
                                <Pressable
                                    key={day}
                                    accessibilityRole="radio"
                                    accessibilityLabel={format.weekdays[day - 1]}
                                    accessibilityState={{ checked: selected }}
                                    onPress={() => change({ weekday: day })}
                                    style={[styles.day, selected ? styles.daySelected : null]}
                                >
                                    <Text style={[styles.dayLabel, selected ? styles.dayLabelSelected : null]} maxFontSizeMultiplier={1.2}>
                                        {format.weekdays[day - 1]}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.pair}>
                    <TimeField label={format.t('callStart')} value={draft.minute} format={format} onChange={(minute) => change({ minute })} />
                    <View style={styles.length}>
                        <Text style={styles.label}>{format.t('duration')}</Text>
                        <SegControl options={DURATIONS.map((value) => [value, `${value}`] as const)} value={draft.duration} onChange={(duration) => change({ duration })} />
                    </View>
                </View>

                <View style={styles.block}>
                    <Text style={styles.label}>{format.t('participants')}</Text>
                    <View style={styles.list}>
                        {others.length === 0 ? <Text style={styles.empty}>{format.t('emptyPeople')}</Text> : null}
                        {others.map((person, index) => {
                            const on = callParticipants(draft, people).some((entry) => entry.id === person.id)
                            return (
                                <View key={person.id} style={[styles.person, index === 0 ? null : styles.divider]}>
                                    <View style={styles.personMain} accessible={false}>
                                        <Text style={styles.personName}>{format.personName(person)}</Text>
                                        <Text style={styles.personCity}>{person.city}</Text>
                                    </View>
                                    <Toggle label={format.personName(person)} value={on} onChange={(value) => toggle(person.id, value)} />
                                </View>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.block}>
                    <Text style={styles.label}>{format.t('reminder')}</Text>
                    <SegControl
                        options={REMIND_OPTIONS.map((value) => [value, value === 0 ? format.t('remindOff') : `${value} ${unit}`] as const)}
                        value={draft.remind}
                        onChange={(remind) => change({ remind })}
                    />
                </View>

                {note || error ? (
                    <Text style={styles.note} accessibilityLiveRegion="polite">
                        {error ?? note}
                    </Text>
                ) : null}

                <View style={styles.actions}>
                    {note ? <Button label={format.t('done')} onPress={() => router.back()} /> : <Button label={format.t('save')} onPress={save} />}
                    <Button label={removeArmed ? format.t('tapAgain') : format.t('remove')} variant="destructive" onPress={remove} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: -spacing.md },
    back: { width: spacing.target, height: spacing.target, alignItems: 'center', justifyContent: 'center' },
    title: { ...type.title, color: colors.text, flex: 1 },
    schedule: { ...type.body, color: colors.muted, marginTop: -spacing.md },
    block: { gap: spacing.sm },
    days: { flexDirection: 'row', gap: spacing.xs },
    day: { flex: 1, minHeight: spacing.target, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    daySelected: { backgroundColor: colors.accent },
    dayLabel: { ...type.label, color: colors.muted },
    dayLabelSelected: { color: colors.onAccent },
    pair: { flexDirection: 'row', gap: spacing.md },
    length: { flex: 1.4, gap: spacing.sm },
    label: { ...type.label, color: colors.muted },
    list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
    empty: { ...type.body, color: colors.muted, paddingVertical: spacing.md },
    person: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    personMain: { flex: 1, minWidth: 0 },
    personName: { ...type.heading, color: colors.text },
    personCity: { ...type.label, color: colors.muted },
    note: { ...type.label, color: colors.caution },
    actions: { gap: spacing.sm },
})
