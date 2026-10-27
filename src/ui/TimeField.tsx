import { type ComponentRef, useRef, useState, useMemo } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Format } from '../i18n/useFormat'
import { Button } from './Button'
import { type Palette, fonts, radius, spacing, type } from './tokens'
import { useColors } from './theme'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
const SAMPLE_DAY = Date.UTC(2026, 0, 5)
const ROW_HEIGHT = spacing.target + 4
const COLUMN_HEIGHT = 240

interface TimeFieldProps {
    label: string
    value: number
    format: Format
    onChange: (minutes: number) => void
}

function Column({ items, selected, label, onPick }: { items: number[]; selected: number; label: (value: number) => string; onPick: (value: number) => void }) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const ref = useRef<ComponentRef<typeof ScrollView>>(null)
    const alignSelected = () => ref.current?.scrollTo({ y: Math.max(0, items.indexOf(selected) * ROW_HEIGHT - COLUMN_HEIGHT / 2 + ROW_HEIGHT / 2), animated: false })
    return (
        <ScrollView ref={ref} onLayout={alignSelected} style={styles.column} contentContainerStyle={styles.columnContent} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
                const isSelected = item === selected
                return (
                    <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        onPress={() => onPick(item)}
                        style={[styles.option, isSelected ? styles.optionSelected : null]}
                    >
                        <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>{label(item)}</Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}

export function TimeField({ label, value, format, onChange }: TimeFieldProps) {
    const colors = useColors()
    const styles = useMemo(() => createStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const [open, setOpen] = useState(false)
    const hour = Math.floor(value / 60)
    const minute = value % 60
    const shown = format.time(SAMPLE_DAY + value * 60000, 'UTC')

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${shown}`} onPress={() => setOpen(true)} style={styles.input}>
                <Text style={styles.value}>{shown}</Text>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel={format.t('done')} />
                <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <Text style={styles.sheetTitle} accessibilityRole="header">
                        {label} · {shown}
                    </Text>
                    <View style={styles.columns} accessibilityRole="radiogroup">
                        <Column
                            items={HOURS}
                            selected={hour}
                            label={(item) => format.time(SAMPLE_DAY + item * 3600000, 'UTC')}
                            onPick={(item) => onChange(item * 60 + minute)}
                        />
                        <Column items={MINUTES} selected={minute} label={(item) => `:${String(item).padStart(2, '0')}`} onPick={(item) => onChange(hour * 60 + item)} />
                    </View>
                    <Button label={format.t('done')} onPress={() => setOpen(false)} />
                </View>
            </Modal>
        </View>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({
    field: { flex: 1, gap: spacing.sm },
    label: { ...type.label, color: colors.muted },
    input: { minHeight: spacing.target, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: spacing.lg },
    value: { ...type.numeral, color: colors.text },
    scrim: { flex: 1, backgroundColor: colors.scrim },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
    sheetTitle: { ...type.heading, color: colors.muted },
    columns: { flexDirection: 'row', gap: spacing.md, height: COLUMN_HEIGHT },
    column: { flex: 1 },
    columnContent: { gap: 4 },
    option: { minHeight: spacing.target, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    optionSelected: { backgroundColor: colors.raised },
    optionLabel: { fontFamily: fonts.numeralMedium, fontSize: 18, lineHeight: 22, color: colors.muted, fontVariant: ['tabular-nums'] },
    optionLabelSelected: { color: colors.text },
})
