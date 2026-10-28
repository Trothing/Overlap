import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { inGroup, MAX_GROUP_NAME_LENGTH, toggleId } from '../src/domain/people/groups'
import { useFormat } from '../src/i18n/useFormat'
import { useAppStore } from '../src/store/useAppStore'
import { Button } from '../src/ui/Button'
import { Icon } from '../src/ui/Icon'
import { TextField } from '../src/ui/TextField'
import { Toggle } from '../src/ui/Toggle'
import { type Palette, radius, spacing, type } from '../src/ui/tokens'
import { useColors } from '../src/ui/theme'

const REMOVE_CONFIRM_MS = 5000

export default function GroupScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const { id } = useLocalSearchParams<{ id?: string }>()
    const people = useAppStore((state) => state.people)
    const groups = useAppStore((state) => state.groups)
    const saveGroup = useAppStore((state) => state.saveGroup)
    const removeGroup = useAppStore((state) => state.removeGroup)
    const setActiveGroup = useAppStore((state) => state.setActiveGroup)
    const existing = id ? groups.find((entry) => entry.id === id) : undefined

    const [groupId] = useState(() => existing?.id ?? `g${Date.now()}`)
    const [name, setName] = useState(existing?.name ?? '')
    const [memberIds, setMemberIds] = useState<string[]>(() => (existing ? people.filter((person) => inGroup(person, existing.id)).map((person) => person.id) : []))
    const [error, setError] = useState(false)
    const [removeArmed, setRemoveArmed] = useState(false)
    const others = people.filter((person) => !person.me)

    useEffect(() => {
        if (!removeArmed) return
        const timer = setTimeout(() => setRemoveArmed(false), REMOVE_CONFIRM_MS)
        return () => clearTimeout(timer)
    }, [removeArmed])

    const save = () => {
        const trimmed = name.trim()
        if (!trimmed) {
            setError(true)
            return
        }
        saveGroup({ id: groupId, name: trimmed.slice(0, MAX_GROUP_NAME_LENGTH) }, memberIds)
        if (!existing) setActiveGroup(groupId)
        router.back()
    }

    const remove = () => {
        if (!removeArmed) {
            setRemoveArmed(true)
            return
        }
        removeGroup(groupId)
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
                        {existing ? format.t('editGroup') : format.t('newGroup')}
                    </Text>
                </View>

                <TextField
                    label={format.t('groupName')}
                    value={name}
                    maxLength={MAX_GROUP_NAME_LENGTH}
                    autoFocus={!existing}
                    onChangeText={(text) => {
                        setError(false)
                        setName(text)
                    }}
                />

                <View style={styles.block}>
                    <Text style={styles.label}>{format.t('groupMembers')}</Text>
                    <View style={styles.list}>
                        {others.length === 0 ? <Text style={styles.empty}>{format.t('emptyPeople')}</Text> : null}
                        {others.map((person, index) => (
                            <View key={person.id} style={[styles.person, index === 0 ? null : styles.divider]}>
                                <View style={styles.personMain} accessible={false}>
                                    <Text style={styles.personName}>{format.personName(person)}</Text>
                                    <Text style={styles.personCity}>{person.city}</Text>
                                </View>
                                <Toggle label={format.personName(person)} value={memberIds.includes(person.id)} onChange={() => setMemberIds(toggleId(memberIds, person.id))} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.actions}>
                    {error ? (
                        <Text style={styles.error} accessibilityLiveRegion="polite">
                            {format.t('needName')}
                        </Text>
                    ) : null}
                    <Button label={format.t('save')} onPress={save} />
                    {existing ? (
                        <>
                            <Text style={styles.hint}>{format.t('groupRemoveHint')}</Text>
                            <Button label={removeArmed ? format.t('tapAgain') : format.t('remove')} variant="destructive" onPress={remove} />
                        </>
                    ) : null}
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
    block: { gap: spacing.sm },
    label: { ...type.label, color: colors.muted },
    list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
    empty: { ...type.body, color: colors.muted, paddingVertical: spacing.md },
    person: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    personMain: { flex: 1, minWidth: 0 },
    personName: { ...type.heading, color: colors.text },
    personCity: { ...type.label, color: colors.muted },
    error: { ...type.label, color: colors.danger },
    hint: { ...type.label, color: colors.muted },
    actions: { gap: spacing.sm },
})
