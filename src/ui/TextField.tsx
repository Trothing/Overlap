import { useState, useMemo } from 'react'
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'
import { type Palette, fonts, radius, spacing, type } from './tokens'
import { useColors } from './theme'

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
    label: string
}

export function TextField({ label, onFocus, onBlur, ...rest }: TextFieldProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const [focused, setFocused] = useState(false)
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...rest}
                accessibilityLabel={label}
                placeholderTextColor={colors.muted}
                selectionColor={colors.accent}
                onFocus={(event) => {
                    setFocused(true)
                    onFocus?.(event)
                }}
                onBlur={(event) => {
                    setFocused(false)
                    onBlur?.(event)
                }}
                style={[styles.input, focused ? styles.focused : null]}
            />
        </View>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    field: { gap: spacing.sm },
    label: { ...type.label, color: colors.muted },
    input: {
        minHeight: spacing.target,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: 'transparent',
        backgroundColor: colors.surface,
        color: colors.text,
        paddingHorizontal: spacing.lg,
        fontFamily: fonts.regular,
        fontSize: 16,
    },
    focused: { borderColor: colors.muted },
})
