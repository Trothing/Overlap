import { resolveScheme } from './scheme'
import { darkPalette, lightPalette } from './tokens'

describe('resolveScheme', () => {
    it('follows the system when the choice is system or missing', () => {
        expect(resolveScheme('system', 'light')).toBe('light')
        expect(resolveScheme('system', 'dark')).toBe('dark')
        expect(resolveScheme(undefined, 'light')).toBe('light')
    })

    it('uses dark when the system gives no answer', () => {
        expect(resolveScheme('system', null)).toBe('dark')
        expect(resolveScheme(undefined, undefined)).toBe('dark')
    })

    it('lets an explicit choice override the system', () => {
        expect(resolveScheme('dark', 'light')).toBe('dark')
        expect(resolveScheme('light', 'dark')).toBe('light')
    })
})

describe('palettes', () => {
    it('define the same tokens in both themes', () => {
        expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort())
    })

    it('keep secondary text readable on the ground colour', () => {
        const luminance = (hex: string) => {
            const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
        }
        const ratio = (a: string, b: string) => {
            const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
            return (hi + 0.05) / (lo + 0.05)
        }
        for (const palette of [darkPalette, lightPalette]) {
            expect(ratio(palette.muted, palette.ground)).toBeGreaterThanOrEqual(4.5)
            expect(ratio(palette.text, palette.ground)).toBeGreaterThanOrEqual(7)
            expect(ratio(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(4.5)
            expect(ratio(palette.caution, palette.ground)).toBeGreaterThanOrEqual(4.5)
            expect(ratio(palette.caution, palette.surface)).toBeGreaterThanOrEqual(4.5)
            expect(ratio(palette.accent, palette.surface)).toBeGreaterThanOrEqual(3)
        }
    })
})
