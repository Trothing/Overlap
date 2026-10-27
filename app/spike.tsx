import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { describeRuntime, runTimeZoneSpike } from '../src/domain/time/spike'
import { type Palette, radius, spacing, type } from '../src/ui/tokens'
import { useColors } from '../src/ui/theme'

export default function SpikeScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const info = useMemo(describeRuntime, [])
    const checks = useMemo(runTimeZoneSpike, [])
    const failed = checks.filter((check) => !check.pass)

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        >
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
                <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Time zone check</Text>
            <Text style={styles.summary} accessibilityRole="header">
                {failed.length === 0 ? `All ${checks.length} checks passed` : `${failed.length} of ${checks.length} checks failed`}
            </Text>

            <View style={styles.block}>
                <Text style={styles.row}>Engine: {info.engine}</Text>
                <Text style={styles.row}>Device zone: {info.deviceZone}</Text>
                <Text style={styles.row}>supportedValuesOf: {info.supportedValuesOf}</Text>
                <Text style={styles.row}>Zones listed: {info.zoneCount}</Text>
            </View>

            {checks.map((check) => (
                <View key={check.name} style={[styles.check, check.pass ? styles.pass : styles.fail]}>
                    <Text style={styles.checkName}>
                        {check.pass ? 'Pass' : 'Fail'}: {check.name}
                    </Text>
                    {check.pass ? null : (
                        <Text style={styles.checkDetail}>
                            expected {check.expected}, got {check.actual}
                        </Text>
                    )}
                </View>
            ))}
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, gap: spacing.md },
    back: { minHeight: spacing.target, justifyContent: 'center', alignSelf: 'flex-start' },
    backLabel: { ...type.heading, color: colors.muted },
    title: { ...type.title, color: colors.text },
    summary: { ...type.heading, color: colors.accent },
    block: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
    row: { ...type.label, color: colors.muted },
    check: { backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, padding: spacing.md, gap: spacing.xs },
    pass: { borderLeftColor: colors.working },
    fail: { borderLeftColor: colors.danger },
    checkName: { ...type.label, color: colors.text },
    checkDetail: { ...type.label, color: colors.danger },
})
