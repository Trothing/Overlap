import { useColorScheme } from 'react-native'
import { useAppStore } from '../store/useAppStore'
import { resolveScheme } from './scheme'
import { palettes, type Palette, type Scheme } from './tokens'

export function useScheme(): Scheme {
    const choice = useAppStore((state) => state.settings.theme)
    const system = useColorScheme()
    return resolveScheme(choice, system)
}

export function useColors(): Palette {
    return palettes[useScheme()]
}
