import type { Status } from '../domain/types'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type Scheme = 'light' | 'dark'

export interface Palette {
    ground: string
    surface: string
    raised: string
    line: string
    text: string
    muted: string
    accent: string
    onAccent: string
    caution: string
    cautionFill: string
    danger: string
    working: string
    evening: string
    late: string
    asleep: string
    scrim: string
}

export const darkPalette: Palette = {
    ground: '#0C1015',
    surface: '#131920',
    raised: '#1B232C',
    line: '#222C36',
    text: '#E6EBEF',
    muted: '#8794A1',
    accent: '#5FB39A',
    onAccent: '#08120E',
    caution: '#E0B35C',
    cautionFill: '#C99A43',
    danger: '#E58A7E',
    working: '#6C7B88',
    evening: '#3E4C59',
    late: '#27323C',
    asleep: '#171E26',
    scrim: 'rgba(5, 8, 11, 0.64)',
}

export const lightPalette: Palette = {
    ground: '#F2F4F6',
    surface: '#FFFFFF',
    raised: '#E8ECF0',
    line: '#DDE2E7',
    text: '#10161C',
    muted: '#5B6773',
    accent: '#1E6B52',
    onAccent: '#FFFFFF',
    caution: '#94590A',
    cautionFill: '#E0A33A',
    danger: '#B3402F',
    working: '#5B6773',
    evening: '#98A3AD',
    late: '#C7CED5',
    asleep: '#E3E7EB',
    scrim: 'rgba(16, 22, 28, 0.4)',
}

export const palettes: Record<Scheme, Palette> = { dark: darkPalette, light: lightPalette }

export const fonts = {
    regular: 'IBMPlexSans_400Regular',
    medium: 'IBMPlexSans_500Medium',
    semibold: 'IBMPlexSans_600SemiBold',
    numeralMedium: 'IBMPlexSansCondensed_500Medium',
    numeral: 'IBMPlexSansCondensed_600SemiBold',
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, target: 48 } as const

export const radius = { sm: 6, md: 12, lg: 16, sheet: 20, pill: 999 } as const

const tabular: ['tabular-nums'] = ['tabular-nums']

export const type = {
    display: { fontFamily: fonts.numeral, fontSize: 64, lineHeight: 68, letterSpacing: -1, fontVariant: tabular },
    numeralLarge: { fontFamily: fonts.numeral, fontSize: 36, lineHeight: 40, letterSpacing: -0.5, fontVariant: tabular },
    numeral: { fontFamily: fonts.numeral, fontSize: 20, lineHeight: 24, fontVariant: tabular },
    numeralSmall: { fontFamily: fonts.numeralMedium, fontSize: 16, lineHeight: 20, fontVariant: tabular },
    title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30 },
    heading: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
    body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
    label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
    caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} as const

export function statusFill(palette: Palette): Record<Status, string> {
    return { core: palette.working, shoulder: palette.evening, late: palette.late, sleep: palette.asleep, off: palette.asleep }
}

export function statusGlyph(palette: Palette): Record<Status, string> {
    return { core: palette.accent, shoulder: palette.caution, late: palette.muted, sleep: palette.muted, off: palette.muted }
}
