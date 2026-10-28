import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState, useMemo } from 'react'
import { ActivityIndicator, type LayoutChangeEvent, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { callsWithPerson, withoutPerson } from '../src/domain/calls/calls'
import { cancelReminder } from '../src/features/calls/reminders'
import { toggleId } from '../src/domain/people/groups'
import { draftFromPerson, draftToPerson, MAX_NAME_LENGTH, newDraft, toggleDay, validateDraft, type DraftError, type PersonDraft } from '../src/domain/people/draft'
import type { IsoWeekday } from '../src/domain/types'
import type { Place } from '../src/domain/geo/places'
import { localizePlace } from '../src/features/people/geocode'
import { usePlaceSearch } from '../src/features/people/usePlaceSearch'
import { useFormat } from '../src/i18n/useFormat'
import { useAppStore } from '../src/store/useAppStore'
import { Button } from '../src/ui/Button'
import { Icon } from '../src/ui/Icon'
import { Toggle } from '../src/ui/Toggle'
import { SegControl } from '../src/ui/SegControl'
import { TextField } from '../src/ui/TextField'
import { TimeField } from '../src/ui/TimeField'
import { type Palette, radius, spacing, type } from '../src/ui/tokens'
import { useColors } from '../src/ui/theme'

const REMOVE_CONFIRM_MS = 5000
const DAY_COLUMNS = 4
const DAY_GAP = spacing.sm
const DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]
const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5]

function dayPreset(days: IsoWeekday[]): string {
    if (days.length === 7) return 'every'
    if (days.length === 5 && WEEKDAYS.every((day) => days.includes(day))) return 'weekdays'
    return ''
}

export default function PersonScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const { id } = useLocalSearchParams<{ id?: string }>()
    const people = useAppStore((state) => state.people)
    const calls = useAppStore((state) => state.calls)
    const groups = useAppStore((state) => state.groups)
    const activeGroupId = useAppStore((state) => state.activeGroupId)
    const savePerson = useAppStore((state) => state.savePerson)
    const removePerson = useAppStore((state) => state.removePerson)

    const [draft, setDraft] = useState<PersonDraft>(() => {
        const existing = id ? people.find((person) => person.id === id) : undefined
        return existing ? draftFromPerson(existing) : newDraft(`p${Date.now()}`, activeGroupId && groups.some((group) => group.id === activeGroupId) ? [activeGroupId] : [])
    })
    const [cityText, setCityText] = useState(draft.city)
    const [error, setError] = useState<DraftError | null>(null)
    const [removeArmed, setRemoveArmed] = useState(false)
    const [daysWidth, setDaysWidth] = useState(0)
    const dayWidth = daysWidth > 0 ? (daysWidth - DAY_GAP * (DAY_COLUMNS - 1)) / DAY_COLUMNS : undefined

    useEffect(() => {
        if (!removeArmed) return
        const timer = setTimeout(() => setRemoveArmed(false), REMOVE_CONFIRM_MS)
        return () => clearTimeout(timer)
    }, [removeArmed])

    const search = usePlaceSearch(cityText, format.lang, !draft.me && !draft.zone)
    const pickedId = useRef<string | null>(null)

    const patch = (changes: Partial<PersonDraft>) => {
        setError(null)
        setDraft((current) => ({ ...current, ...changes }))
    }

    const onCityText = (text: string) => {
        setCityText(text)
        if (text !== draft.city) patch({ city: '', region: '', zone: '' })
    }

    const pickPlace = (place: Place) => {
        pickedId.current = place.id
        setCityText(place.name)
        patch({ city: place.name, region: place.subtitle, zone: place.zone })
        if (place.id === place.zone) return
        localizePlace(place, format.lang)
            .then((localized) => {
                if (pickedId.current !== place.id) return
                setCityText(localized.name)
                patch({ city: localized.name, region: localized.subtitle })
            })
            .catch(() => undefined)
    }

    const save = () => {
        const problem = validateDraft(draft)
        if (problem) {
            setError(problem)
            return
        }
        savePerson(draftToPerson(draft))
        router.back()
    }

    const affected = callsWithPerson(calls, draft.id)

    const remove = async () => {
        if (!removeArmed) {
            setRemoveArmed(true)
            return
        }
        const { dropped } = withoutPerson(calls, draft.id)
        await Promise.all(dropped.map((call) => cancelReminder(call.notificationId)))
        removePerson(draft.id)
        router.back()
    }

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl }]}
            >
                <View style={styles.head}>
                    <Pressable accessibilityRole="button" accessibilityLabel={format.t('cancel')} onPress={() => router.back()} style={styles.back}>
                        <Icon name="left" color={colors.text} size={22} />
                    </Pressable>
                    <Text style={styles.title} accessibilityRole="header">
                        {draft.isNew ? format.t('addPerson') : format.t('editPerson')}
                    </Text>
                </View>

                {draft.me ? null : (
                    <TextField label={format.t('name')} value={draft.name} maxLength={MAX_NAME_LENGTH} autoFocus={draft.isNew} onChangeText={(name) => patch({ name })} />
                )}

                {draft.me ? null : (
                    <View style={styles.cityBlock}>
                        <TextField
                            label={format.t('city')}
                            value={cityText}
                            placeholder={format.t('searchCity')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onChangeText={onCityText}
                        />
                        {search.loading || search.offline || search.searched ? (
                            <View style={styles.searchState}>
                                {search.loading ? <ActivityIndicator size="small" color={colors.muted} /> : null}
                                <Text style={styles.stateText}>{search.loading ? format.t('searching') : search.offline ? format.t('offlineCities') : format.t('noPlaces')}</Text>
                            </View>
                        ) : null}
                        {search.places.length > 0 ? (
                            <View style={styles.results}>
                                {search.places.map((place, index) => (
                                    <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`${place.name}, ${place.subtitle}`} onPress={() => pickPlace(place)} style={[styles.result, index === 0 ? styles.resultFirst : null]}>
                                        <Text style={styles.resultCity}>{place.name}</Text>
                                        {place.subtitle ? <Text style={styles.resultZone}>{place.subtitle}</Text> : null}
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                    </View>
                )}

                <View style={styles.allDayRow}>
                    <View style={styles.allDayText}>
                        <Text style={styles.allDayTitle}>{format.t('allDay')}</Text>
                        <Text style={styles.allDayHint}>{format.t('allDayHint')}</Text>
                    </View>
                    <Toggle label={format.t('allDay')} value={draft.allDay} onChange={(allDay) => patch({ allDay })} />
                </View>

                {draft.allDay ? null : (
                    <View style={styles.pair}>
                        <TimeField label={format.t('workStarts')} value={draft.start} format={format} onChange={(start) => patch({ start })} />
                        <TimeField label={format.t('workEnds')} value={draft.end} format={format} onChange={(end) => patch({ end })} />
                    </View>
                )}

                <View style={styles.daysBlock}>
                    <Text style={styles.label}>{format.t('workDays')}</Text>
                    <SegControl
                        options={[['weekdays', format.t('weekdaysOnly')], ['every', format.t('everyDay')]] as const}
                        value={dayPreset(draft.workDays)}
                        onChange={(preset) => patch({ workDays: preset === 'every' ? [...DAYS] : [...WEEKDAYS] })}
                    />
                    <View style={styles.days} onLayout={(event: LayoutChangeEvent) => setDaysWidth(event.nativeEvent.layout.width)}>
                        {DAYS.map((day) => {
                            const selected = draft.workDays.includes(day)
                            return (
                                <Pressable
                                    key={day}
                                    accessibilityRole="checkbox"
                                    accessibilityLabel={format.weekdays[day - 1]}
                                    accessibilityState={{ checked: selected }}
                                    onPress={() => patch({ workDays: toggleDay(draft.workDays, day) })}
                                    style={[styles.day, dayWidth ? { width: dayWidth } : null, selected ? styles.daySelected : null]}
                                >
                                    <Text style={[styles.dayLabel, selected ? styles.dayLabelSelected : null]}>{format.weekdays[day - 1]}</Text>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>

                {groups.length > 0 && !draft.me ? (
                    <View style={styles.daysBlock}>
                        <Text style={styles.label}>{format.t('groupLabel')}</Text>
                        <View style={styles.groupChips}>
                            {groups.map((group) => {
                                const selected = draft.groupIds.includes(group.id)
                                return (
                                    <Pressable
                                        key={group.id}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: selected }}
                                        onPress={() => patch({ groupIds: toggleId(draft.groupIds, group.id) })}
                                        style={[styles.groupChip, selected ? styles.daySelected : null]}
                                    >
                                        <Text style={[styles.dayLabel, selected ? styles.dayLabelSelected : null]} numberOfLines={1}>
                                            {group.name}
                                        </Text>
                                    </Pressable>
                                )
                            })}
                        </View>
                    </View>
                ) : null}

                <View style={styles.actions}>
                    {error ? (
                        <Text style={styles.error} accessibilityLiveRegion="polite">
                            {format.t(error)}
                        </Text>
                    ) : null}
                    <Button label={format.t('save')} onPress={save} />
                    {draft.isNew || draft.me || affected.length === 0 ? null : <Text style={styles.callsNote}>{format.t('personInCalls').replace('{n}', String(affected.length))}</Text>}
                    {draft.isNew || draft.me ? null : <Button label={removeArmed ? format.t('tapAgain') : format.t('remove')} variant="destructive" onPress={remove} />}
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
    cityBlock: { gap: spacing.sm },
    results: { backgroundColor: colors.surface, borderRadius: radius.md },
    result: { minHeight: spacing.target, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.line },
    searchState: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    stateText: { ...type.label, color: colors.muted, flex: 1 },
    groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    groupChip: { minHeight: spacing.target, maxWidth: '100%', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    callsNote: { ...type.label, color: colors.muted },
    resultFirst: { borderTopWidth: 0 },
    resultCity: { ...type.heading, color: colors.text },
    resultZone: { ...type.caption, color: colors.muted },
    allDayRow: { minHeight: spacing.target, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    allDayText: { flex: 1, minWidth: 0 },
    allDayTitle: { ...type.heading, color: colors.text },
    allDayHint: { ...type.label, color: colors.muted },
    pair: { flexDirection: 'row', gap: spacing.md },
    daysBlock: { gap: spacing.sm },
    label: { ...type.label, color: colors.muted },
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: DAY_GAP },
    day: { width: '22%', minHeight: spacing.target, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    daySelected: { backgroundColor: colors.raised, borderColor: colors.muted },
    dayLabel: { ...type.label, color: colors.muted },
    dayLabelSelected: { color: colors.text },
    actions: { gap: spacing.sm },
    error: { ...type.label, color: colors.danger },
})
