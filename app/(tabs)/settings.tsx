import { useRouter } from 'expo-router'
import { useEffect, useState, useTransition, useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { languages, type Language } from '../../src/i18n/dictionary'
import { useFormat } from '../../src/i18n/useFormat'
import { useAppStore } from '../../src/store/useAppStore'
import { SegControl } from '../../src/ui/SegControl'
import { Toggle } from '../../src/ui/Toggle'
import { type Palette, radius, spacing, type } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

export default function SettingsScreen() {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const format = useFormat()
    const settings = useAppStore((state) => state.settings)
    const update = useAppStore((state) => state.updateSettings)
    const unit = format.t('minutes')

    const [pendingLang, setPendingLang] = useState<Language | null>(null)
    const [switching, startSwitch] = useTransition()

    useEffect(() => {
        if (pendingLang && pendingLang === settings.lang) setPendingLang(null)
    }, [pendingLang, settings.lang])

    const chooseLanguage = (lang: Language) => {
        setPendingLang(lang)
        startSwitch(() => update({ lang }))
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={styles.title} accessibilityRole="header">
                {format.t('settings')}
            </Text>

            <View style={styles.setting}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{format.t('language')}</Text>
                    {switching || pendingLang ? <ActivityIndicator size="small" color={colors.muted} accessibilityLabel={format.t('language')} /> : null}
                </View>
                <SegControl options={languages} value={pendingLang ?? settings.lang} onChange={chooseLanguage} />
            </View>

            <View style={styles.setting}>
                <Text style={styles.label}>{format.t('theme')}</Text>
                <SegControl
                    options={[['system', format.t('themeSystem')], ['light', format.t('themeLight')], ['dark', format.t('themeDark')]] as const}
                    value={settings.theme ?? 'system'}
                    onChange={(theme) => update({ theme })}
                />
            </View>

            <View style={styles.setting}>
                <Text style={styles.label}>{format.t('timeFormat')}</Text>
                <SegControl options={[['24', format.t('h24')], ['12', format.t('h12')]] as const} value={settings.hour12 ? '12' : '24'} onChange={(value) => update({ hour12: value === '12' })} />
            </View>

            <View style={styles.setting}>
                <Text style={styles.label}>{format.t('minWindow')}</Text>
                <SegControl
                    options={[[30, `30 ${unit}`], [45, `45 ${unit}`], [60, `60 ${unit}`]] as const}
                    value={settings.minWindow}
                    onChange={(minWindow) => update({ minWindow })}
                />
            </View>

            <View style={styles.group}>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel} aria-hidden>
                        {format.t('haptics')}
                    </Text>
                    <Toggle label={format.t('haptics')} value={settings.haptics} onChange={(haptics) => update({ haptics })} />
                </View>
                <Pressable accessibilityRole="button" onPress={() => router.push('/spike')} style={[styles.switchRow, styles.divider]}>
                    <Text style={styles.switchLabel}>{format.t('diagnostics')}</Text>
                </Pressable>
            </View>

            <Text style={styles.note}>{format.t('localOnly')}</Text>
        </ScrollView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ground },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    title: { ...type.title, color: colors.text },
    setting: { gap: spacing.sm },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
    label: { ...type.label, color: colors.muted },
    group: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
    switchRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    switchLabel: { ...type.body, color: colors.text },
    note: { ...type.label, color: colors.muted },
})
