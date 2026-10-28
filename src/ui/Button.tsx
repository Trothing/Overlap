import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { type Palette, fonts, radius, spacing } from './tokens'
import { useColors } from './theme'

type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive'

interface ButtonProps {
    label: string
    onPress: () => void
    variant?: Variant
    flex?: boolean
    disabled?: boolean
}

export function Button({ label, onPress, variant = 'primary', flex, disabled }: ButtonProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const labelStyles = useMemo(() => createLabelStyles(colors), [colors])
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [styles.base, styles[variant], flex ? styles.flex : null, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
            <Text style={[styles.label, labelStyles[variant], disabled ? labelStyles.disabled : null]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                {label}
            </Text>
        </Pressable>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    base: { minHeight: spacing.target, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
    primary: { backgroundColor: colors.accent, minHeight: 52 },
    secondary: { backgroundColor: colors.raised },
    quiet: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: 'transparent' },
    flex: { flex: 1 },
    pressed: { opacity: 0.8 },
    disabled: { backgroundColor: colors.raised },
    label: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
})

const createLabelStyles = (colors: Palette) => StyleSheet.create({
    primary: { color: colors.onAccent },
    secondary: { color: colors.text },
    quiet: { color: colors.muted },
    destructive: { color: colors.danger },
    disabled: { color: colors.muted },
})
