import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFormat } from '../../src/i18n/useFormat'
import { Icon } from '../../src/ui/Icon'
import { fonts } from '../../src/ui/tokens'
import { useColors } from '../../src/ui/theme'

const NAV_HEIGHT = 64
const NAV_PADDING = 4

export default function TabsLayout() {
    const colors = useColors()
    const format = useFormat()
    const insets = useSafeAreaInsets()
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: colors.ground },
                tabBarActiveTintColor: colors.text,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 0,
                    height: NAV_HEIGHT + insets.bottom,
                    paddingTop: NAV_PADDING,
                    paddingBottom: insets.bottom + NAV_PADDING,
                },
                tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 14 },
                tabBarAllowFontScaling: false,
            }}
        >
            <Tabs.Screen name="index" options={{ title: format.t('timeline'), tabBarIcon: ({ color }) => <Icon name="timeline" color={color} /> }} />
            <Tabs.Screen name="calls" options={{ title: format.t('calls'), tabBarIcon: ({ color }) => <Icon name="calls" color={color} /> }} />
            <Tabs.Screen name="people" options={{ title: format.t('people'), tabBarIcon: ({ color }) => <Icon name="people" color={color} /> }} />
            <Tabs.Screen name="settings" options={{ title: format.t('settings'), tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }} />
        </Tabs>
    )
}
