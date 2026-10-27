import type { Scheme, ThemeChoice } from './tokens'

export function resolveScheme(choice: ThemeChoice | undefined, system: string | null | undefined): Scheme {
    if (choice === 'light' || choice === 'dark') return choice
    return system === 'light' ? 'light' : 'dark'
}
