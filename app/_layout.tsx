import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans'
import { IBMPlexSansCondensed_500Medium, IBMPlexSansCondensed_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-condensed'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { configureNotifications } from '../src/features/calls/reminders'
import { prewarmFormatters } from '../src/i18n/formatters'
import { useAppStore } from '../src/store/useAppStore'
import { type Palette } from '../src/ui/tokens'
import { useColors, useScheme } from '../src/ui/theme'

function useHydrated(): boolean {
    const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated())
    useEffect(() => {
        if (useAppStore.persist.hasHydrated()) setHydrated(true)
        return useAppStore.persist.onFinishHydration(() => setHydrated(true))
    }, [])
    return hydrated
}

const PREWARM_DELAY_MS = 800

function usePrewarm(ready: boolean): void {
    useEffect(() => {
        if (!ready) return
        let cancel: (() => void) | undefined
        const timer = setTimeout(() => {
            const { people, settings } = useAppStore.getState()
            cancel = prewarmFormatters(settings.hour12, [...new Set(people.map((person) => person.zone).concat('UTC'))], settings.lang)
        }, PREWARM_DELAY_MS)
        return () => {
            clearTimeout(timer)
            cancel?.()
        }
    }, [ready])
}

export default function RootLayout() {
    const colors = useColors()
    const scheme = useScheme()
    const styles = useMemo(() => createStyles(colors), [colors])
    const [fontsLoaded] = useFonts({
        IBMPlexSans_400Regular,
        IBMPlexSans_500Medium,
        IBMPlexSans_600SemiBold,
        IBMPlexSansCondensed_500Medium,
        IBMPlexSansCondensed_600SemiBold,
    })
    const hydrated = useHydrated()
    const ready = fontsLoaded && hydrated
    usePrewarm(ready)
    useEffect(() => {
        configureNotifications()
    }, [])

    if (!ready) return null

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaProvider>
                <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground }, animation: 'slide_from_right' }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="slot" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
                    <Stack.Screen name="spike" />
                </Stack>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}

const createStyles = (colors: Palette) => StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ground } })
