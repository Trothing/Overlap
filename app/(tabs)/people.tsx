import { memo, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Person } from '../../src/domain/types'
import { offsetMinutes } from '../../src/domain/time/localTime'
import { useFormat, type Format } from '../../src/i18n/useFormat'
import { useAppStore } from '../../src/store/useAppStore'
import { useGroupView } from '../../src/store/useGroupView'
import { Button } from '../../src/ui/Button'
import { GroupBar } from '../../src/ui/GroupBar'
import { type Palette, radius, spacing, type } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

const SAMPLE_DAY = Date.UTC(2026, 0, 5)

function offsetLabel(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '−'
    const hours = Math.floor(Math.abs(minutes) / 60)
    const rest = Math.abs(minutes) % 60
    return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`
}

interface PersonRowProps {
    person: Person
    format: Format
    now: number
    divider: boolean
    onPress: (id: string) => void
}

const PersonRow = memo(function PersonRow({ person, format, now, divider, onPress }: PersonRowProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const hours = person.allDay ? format.t('allDay') : `${format.time(SAMPLE_DAY + person.start * 60000, 'UTC')} – ${format.time(SAMPLE_DAY + person.end * 60000, 'UTC')}`
    const offset = offsetLabel(offsetMinutes(now, person.zone))
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${format.t('editPerson')}: ${format.personName(person)}, ${person.city}, ${hours}`}
            onPress={() => onPress(person.id)}
            style={[styles.person, divider ? styles.divider : null]}
        >
            <View style={styles.main}>
                <Text style={styles.name}>{format.personName(person)}</Text>
                <Text style={styles.detail} numberOfLines={1}>
                    {person.city}
                    {person.region ? `, ${person.region}` : ''} · {hours}
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
})

export default function PeopleScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const { groups, activeGroupId, people } = useGroupView()
    const setActiveGroup = useAppStore((state) => state.setActiveGroup)
    const now = Math.floor(Date.now() / 60000) * 60000
    const me = people[0]
    const others = people.slice(1)

    const edit = (id: string) => router.push({ pathname: '/person', params: { id } })

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={styles.title} accessibilityRole="header">
                {format.t('people')}
            </Text>

            <View style={styles.list}>
                <PersonRow person={me} format={format} now={now} divider={false} onPress={edit} />
            </View>

            <GroupBar groups={groups} activeId={activeGroupId} allLabel={format.t('allPeople')} onSelect={setActiveGroup} addLabel={format.t('newGroup')} onAdd={() => router.push('/group')} />

            <View style={styles.groupHead}>
                <Text style={styles.empty}>
                    {others.length === 0 ? format.t('emptyPeople') : ''}
                </Text>
                {activeGroupId ? (
                    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/group', params: { id: activeGroupId } })} style={styles.edit}>
                        <Text style={styles.editLabel}>{format.t('editGroup')}</Text>
                    </Pressable>
                ) : null}
            </View>

            {others.length > 0 ? (
                <View style={styles.list}>
                    {others.map((person, index) => (
                        <PersonRow key={person.id} person={person} format={format} now={now} divider={index > 0} onPress={edit} />
                    ))}
                </View>
            ) : null}

            <Button label={format.t('addPerson')} onPress={() => router.push('/person')} />
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
    title: { ...type.title, color: colors.text },
    list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
    groupHead: { minHeight: spacing.target, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    edit: { minHeight: spacing.target, paddingHorizontal: spacing.sm, justifyContent: 'center', marginLeft: 'auto' },
    editLabel: { ...type.label, color: colors.accent },
    person: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    main: { flex: 1, minWidth: 0, gap: 2 },
    name: { ...type.heading, color: colors.text },
    detail: { ...type.label, color: colors.muted },
    now: { alignItems: 'flex-end' },
    nowTime: { ...type.numeral, color: colors.text },
    offset: { ...type.caption, color: colors.muted },
    empty: { ...type.body, color: colors.muted, flex: 1 },
})
