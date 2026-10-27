import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { reminderTrigger, type SavedCall } from '../../domain/calls/calls'
import type { Person } from '../../domain/types'
import { detectDeviceZone } from '../../domain/zones'

export type ReminderOutcome = 'scheduled' | 'off' | 'denied' | 'unavailable'

export interface ReminderResult {
    outcome: ReminderOutcome
    notificationId?: string
}

const CHANNEL_ID = 'calls'

export function configureNotifications(): void {
    if (Platform.OS === 'web') return
    Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    })
}

async function ensurePermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    if (!current.canAskAgain) return false
    const asked = await Notifications.requestPermissionsAsync()
    return asked.granted
}

export async function cancelReminder(notificationId: string | undefined): Promise<void> {
    if (Platform.OS === 'web' || !notificationId) return
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch {
        return
    }
}

export async function scheduleReminder(call: SavedCall, me: Person, body: string): Promise<ReminderResult> {
    if (call.remind <= 0) return { outcome: 'off' }
    if (Platform.OS === 'web') return { outcome: 'unavailable' }
    try {
        if (!(await ensurePermission())) return { outcome: 'denied' }
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
