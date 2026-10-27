import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { callParticipants, nextOccurrence } from '../../src/domain/calls/calls'
import { findClockShifts } from '../../src/domain/time/dst'
import { useFormat } from '../../src/i18n/useFormat'
import { useAppStore } from '../../src/store/useAppStore'
import { type Palette, radius, spacing, type } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

const SHIFT_HORIZON_DAYS = 21

export default function CallsScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const people = useAppStore((state) => state.people)
    const calls = useAppStore((state) => state.calls)
    const me = people[0]
    const now = Date.now()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={styles.title} accessibilityRole="header">
                {format.t('calls')}
            </Text>

            {calls.length === 0 ? <Text style={styles.empty}>{format.t('noCalls')}</Text> : null}

            {calls.length > 0 ? (
                <View style={styles.list}>
                    {calls.map((call, index) => {
                        const parts = callParticipants(call, people)
                        const next = nextOccurrence(call, now, me.zone)
                        const end = next + call.duration * 60000
                        const others = parts.filter((person) => !person.me).map((person) => `${format.personName(person)} ${format.time(next, person.zone)}`)
                        const shift = findClockShifts(parts, now, SHIFT_HORIZON_DAYS)[0]
                        const schedule = `${format.t('everyWeekday').replace('{day}', format.weekdays[call.weekday - 1])} · ${format.time(next, me.zone)} – ${format.time(end, me.zone)}`
                        return (
                            <View key={call.id} style={[styles.row, index === 0 ? null : styles.divider]}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`${call.title}, ${schedule}`}
                                    onPress={() => router.push({ pathname: '/slot', params: { start: String(next), duration: String(call.duration), title: call.title } })}
                                    style={styles.main}
                                >
                                    <Text style={styles.name}>{call.title}</Text>
                                    <Text style={styles.detail}>{schedule}</Text>
                                    <Text style={styles.detail}>
                                        {format.t('nextCall')}: {format.day(next, me.zone)}
                                        {others.length > 0 ? ` · ${others.join(' · ')}` : ''}
                                    </Text>
                                    {shift ? <Text style={styles.caution}>{format.shiftText(shift, me.zone)}</Text> : null}
                                </Pressable>
                                <Pressable accessibilityRole="button" accessibilityLabel={`${format.t('editCall')}: ${call.title}`} onPress={() => router.push({ pathname: '/call', params: { id: call.id } })} style={styles.edit}>
                                    <Text style={styles.editLabel}>{format.t('editShort')}</Text>
                                </Pressable>
                            </View>
                        )
                    })}
                </View>
            ) : null}
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    title: { ...type.title, color: colors.text },
    empty: { ...type.body, color: colors.muted },
    list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingLeft: spacing.lg },
    row: { flexDirection: 'row', alignItems: 'center' },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    main: { flex: 1, minWidth: 0, gap: 2, paddingVertical: spacing.md },
    name: { ...type.heading, color: colors.text },
    detail: { ...type.label, color: colors.muted },
    caution: { ...type.label, color: colors.caution, marginTop: 2 },
    edit: { minWidth: spacing.target + spacing.md, minHeight: spacing.target, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
    editLabel: { ...type.heading, color: colors.muted },
})
