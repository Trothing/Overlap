import { createEventInCalendarAsync } from 'expo-calendar/legacy'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { buildIcs } from '../../domain/share/ics'
import type { Slot } from '../../domain/share/slotLink'

export type CalendarOutcome = 'calendar' | 'file' | 'failed'

const ICS_NAME = 'overlap-call.ics'
const ICS_MIME = 'text/calendar'

function downloadOnWeb(content: string): void {
    const blob = new Blob([content], { type: ICS_MIME })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = ICS_NAME
    anchor.click()
    URL.revokeObjectURL(url)
}

async function shareFile(content: string): Promise<void> {
    const file = new File(Paths.cache, ICS_NAME)
    file.create({ overwrite: true })
    file.write(content)
    await Sharing.shareAsync(file.uri, { mimeType: ICS_MIME, UTI: 'public.calendar-event' })
}

export async function addSlotToCalendar(slot: Slot, title: string, notes: string): Promise<CalendarOutcome> {
    if (Platform.OS !== 'web') {
        try {
            await createEventInCalendarAsync({
                title,
                notes,
                startDate: new Date(slot.start),
                endDate: new Date(slot.start + slot.duration * 60000),
            })
            return 'calendar'
        } catch {
        }
    }
    const content = buildIcs({ start: slot.start, duration: slot.duration, title, description: notes, stamp: Date.now() })
    try {
        if (Platform.OS === 'web') downloadOnWeb(content)
        else await shareFile(content)
        return 'file'
    } catch {
        return 'failed'
    }
}
