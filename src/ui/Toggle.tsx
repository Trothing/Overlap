import { useEffect, useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { type Palette, spacing } from './tokens'
import { useColors } from './theme'

const TRACK_WIDTH = 52
const TRACK_HEIGHT = 30
const THUMB_SIZE = 22
const THUMB_INSET = 4
const SLIDE_MS = 120
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2

interface ToggleProps {
    value: boolean
    label: string
    onChange: (value: boolean) => void
}

export function Toggle({ value, label, onChange }: ToggleProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const position = useSharedValue(value ? TRAVEL : 0)

    useEffect(() => {
        position.value = withTiming(value ? TRAVEL : 0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) })
    }, [value, position])

    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }))

    return (
        <Pressable
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: value }}
            onPress={() => onChange(!value)}
            hitSlop={(spacing.target - TRACK_HEIGHT) / 2}
            style={[styles.track, value ? styles.trackOn : styles.trackOff]}
        >
            <Animated.View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff, thumbStyle]} />
        </Pressable>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    track: { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, justifyContent: 'center', paddingHorizontal: THUMB_INSET },
    trackOn: { backgroundColor: colors.accent },
    trackOff: { backgroundColor: colors.raised },
    thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2 },
    thumbOn: { backgroundColor: colors.onAccent },
    thumbOff: { backgroundColor: colors.muted },
})
