import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'
import { reminderTrigger, type SavedCall } from '../../domain/calls/calls'
import type { Person } from '../../domain/types'
import { detectDeviceZone } from '../../domain/zones'

type NotificationsModule = typeof import('expo-notifications')

export type ReminderOutcome = 'scheduled' | 'off' | 'denied' | 'unavailable'

export interface ReminderResult {
    outcome: ReminderOutcome
    notificationId?: string
}

const CHANNEL_ID = 'calls'

const REQUIRED_NATIVE_MODULES = ['ExpoNotificationScheduler', 'ExpoNotificationsEmitter', 'ExpoNotificationPermissionsModule', 'ExpoPushTokenManager', 'ExpoNotificationsHandlerModule']
const ANDROID_NATIVE_MODULES = ['ExpoTopicSubscriptionModule', 'ExpoNotificationChannelManager']

function nativeSupportPresent(): boolean {
    if (Platform.OS === 'web') return false
    try {
        const names = Platform.OS === 'android' ? [...REQUIRED_NATIVE_MODULES, ...ANDROID_NATIVE_MODULES] : REQUIRED_NATIVE_MODULES
        return names.every((name) => requireOptionalNativeModule(name) != null)
    } catch {
        return false
    }
}

let loader: Promise<NotificationsModule | null> | null = null

function loadNotifications(): Promise<NotificationsModule | null> {
    if (!nativeSupportPresent()) return Promise.resolve(null)
    if (!loader) {
        loader = import('expo-notifications')
            .then((module) => (typeof module.setNotificationHandler === 'function' && typeof module.scheduleNotificationAsync === 'function' ? module : null))
            .catch(() => null)
    }
    return loader
}

export async function configureNotifications(): Promise<void> {
    const Notifications = await loadNotifications()
    if (!Notifications) return
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
        })
    } catch {
        return
    }
}

async function ensurePermission(Notifications: NotificationsModule): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    if (!current.canAskAgain) return false
    const asked = await Notifications.requestPermissionsAsync()
    return asked.granted
}

export async function cancelReminder(notificationId: string | undefined): Promise<void> {
    if (!notificationId) return
    const Notifications = await loadNotifications()
    if (!Notifications) return
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch {
        return
    }
}

export async function scheduleReminder(call: SavedCall, me: Person, body: string): Promise<ReminderResult> {
    if (call.remind <= 0) return { outcome: 'off' }
    const Notifications = await loadNotifications()
    if (!Notifications) return { outcome: 'unavailable' }
    try {
        if (!(await ensurePermission(Notifications))) return { outcome: 'denied' }
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Calls', importance: Notifications.AndroidImportance.DEFAULT })
        const trigger = reminderTrigger(call, me.zone, detectDeviceZone(), Date.now())
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: { title: call.title, body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute, channelId: CHANNEL_ID },
        })
        return { outcome: 'scheduled', notificationId }
    } catch {
        return { outcome: 'unavailable' }
    }
}
