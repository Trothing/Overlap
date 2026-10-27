import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { type Palette, fonts, radius, spacing } from './tokens'
import { useColors } from './theme'

interface SegControlProps<T extends string | number> {
    options: ReadonlyArray<readonly [T, string]>
    value: T
    onChange: (value: T) => void
}

export function SegControl<T extends string | number>({ options, value, onChange }: SegControlProps<T>) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    return (
        <View style={styles.group} accessibilityRole="radiogroup">
            {options.map(([option, label]) => {
                const selected = option === value
                return (
                    <Pressable
                        key={String(option)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        hitSlop={{ top: 2, bottom: 2 }}
                        onPress={() => onChange(option)}
                        style={[styles.option, selected ? styles.selected : null]}
                    >
                        <Text style={[styles.label, selected ? styles.selectedLabel : null]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                            {label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    group: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3, gap: 2 },
    option: { flex: 1, minHeight: 44, borderRadius: radius.md - 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
    selected: { backgroundColor: colors.raised },
    label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.muted },
    selectedLabel: { color: colors.text },
})
