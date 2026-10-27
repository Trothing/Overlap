import { create } from 'zustand'
import { MINUTES_PER_DAY } from '../../domain/overlap/suggest'
import { STEP_MINUTES } from '../../domain/overlap/windows'

export const LAST_CURSOR = MINUTES_PER_DAY - STEP_MINUTES

function clamp(minute: number): number {
    return Math.min(Math.max(minute, 0), LAST_CURSOR)
}

interface CursorState {
    minute: number
    setMinute: (minute: number) => void
    stepBy: (delta: number) => void
}

export const useCursorStore = create<CursorState>((set) => ({
    minute: 0,
    setMinute: (minute) => set({ minute: clamp(minute) }),
    stepBy: (delta) => set((state) => ({ minute: clamp(state.minute + delta) })),
}))
