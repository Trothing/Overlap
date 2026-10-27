import { Redirect, useLocalSearchParams } from 'expo-router'
import { parseSlot } from '../src/domain/share/slotLink'

export default function IncomingSlot() {
    const params = useLocalSearchParams<{ v?: string; t?: string; d?: string; n?: string }>()
    const slot = parseSlot(params)
    if (!slot) return <Redirect href="/" />
    return <Redirect href={{ pathname: '/slot', params: { start: String(slot.start), duration: String(slot.duration), title: slot.title } }} />
}
