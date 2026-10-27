import { useMemo } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { offsetMinutes } from '../../src/domain/time/localTime'
import { useFormat } from '../../src/i18n/useFormat'
import { useAppStore } from '../../src/store/useAppStore'
import { Button } from '../../src/ui/Button'
import { type Palette, radius, spacing, type } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

const SAMPLE_DAY = Date.UTC(2026, 0, 5)

function offsetLabel(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '−'
    const hours = Math.floor(Math.abs(minutes) / 60)
    const rest = Math.abs(minutes) % 60
    return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`
}

export default function PeopleScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const people = useAppStore((state) => state.people)
    const now = Date.now()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={styles.title} accessibilityRole="header">
                {format.t('people')}
            </Text>

            <View style={styles.list}>
                {people.map((person, index) => {
                    const hours = `${format.time(SAMPLE_DAY + person.start * 60000, 'UTC')} – ${format.time(SAMPLE_DAY + person.end * 60000, 'UTC')}`
                    const offset = offsetLabel(offsetMinutes(now, person.zone))
                    return (
                        <Pressable
                            key={person.id}
                            accessibilityRole="button"
                            accessibilityLabel={`${format.t('editPerson')}: ${format.personName(person)}, ${person.city}, ${hours}`}
                            onPress={() => router.push({ pathname: '/person', params: { id: person.id } })}
                            style={[styles.person, index === 0 ? null : styles.divider]}
                        >
                            <View style={styles.main}>
                                <Text style={styles.name}>{format.personName(person)}</Text>
                                <Text style={styles.detail} numberOfLines={1}>
                                    {person.city}{person.region ? `, ${person.region}` : ""} · {hours}
                                    {person.sample ? ` · ${format.t('sample')}` : ''}
                                </Text>
                            </View>
                            <View style={styles.now}>
                                <Text style={styles.nowTime} maxFontSizeMultiplier={1.3}>
                                    {format.time(now, person.zone)}
                                </Text>
                                <Text style={styles.offset}>{offset}</Text>
                            </View>
                        </Pressable>
                    )
                })}
            </View>

            {people.length <= 1 ? <Text style={styles.empty}>{format.t('emptyPeople')}</Text> : null}

            <Button label={format.t('addPerson')} onPress={() => router.push('/person')} />
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    title: { ...type.title, color: colors.text },
    list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
    person: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    main: { flex: 1, minWidth: 0, gap: 2 },
    name: { ...type.heading, color: colors.text },
    detail: { ...type.label, color: colors.muted },
    now: { alignItems: 'flex-end' },
    nowTime: { ...type.numeral, color: colors.text },
    offset: { ...type.caption, color: colors.muted },
    empty: { ...type.body, color: colors.muted },
})
