import { memo, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import type { Group } from '../domain/people/groups'
import { type Palette, fonts, radius, spacing } from './tokens'
import { useColors } from './theme'

interface GroupBarProps {
    groups: Group[]
    activeId: string | null
    allLabel: string
    onSelect: (id: string | null) => void
    addLabel?: string
    onAdd?: () => void
}

export const GroupBar = memo(function GroupBar({ groups, activeId, allLabel, onSelect, addLabel, onAdd }: GroupBarProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    if (groups.length === 0 && !onAdd) return null
    const chips: Array<[string | null, string]> = [[null, allLabel], ...groups.map((group) => [group.id, group.name] as [string, string])]
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.content} accessibilityRole="radiogroup">
            {chips.map(([id, label]) => {
                const selected = id === activeId
                return (
                    <Pressable key={id ?? 'all'} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onSelect(id)} style={[styles.chip, selected ? styles.chipSelected : null]}>
                        <Text style={[styles.label, selected ? styles.labelSelected : null]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                            {label}
                        </Text>
                    </Pressable>
                )
            })}
            {onAdd && addLabel ? (
                <Pressable accessibilityRole="button" onPress={onAdd} style={[styles.chip, styles.add]}>
                    <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        + {addLabel}
                    </Text>
                </Pressable>
            ) : null}
        </ScrollView>
    )
})

const createStyles = (colors: Palette) => StyleSheet.create({
    bar: { flexGrow: 0, marginHorizontal: -spacing.xl },
    content: { paddingHorizontal: spacing.xl, gap: spacing.sm },
    chip: { minHeight: spacing.target, maxWidth: 200, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipSelected: { backgroundColor: colors.accent },
    add: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
    label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.muted },
    labelSelected: { color: colors.onAccent },
})
