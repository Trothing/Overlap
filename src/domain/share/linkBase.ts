export type AppEnv = 'expogo' | 'dev' | 'stage' | 'prod'

export interface LinkBaseInput {
    env: string | undefined
    urls: Partial<Record<Exclude<AppEnv, 'expogo'>, string | undefined>>
    expoGoBase: string
    schemeBase: string
}

export interface LinkBase {
    env: AppEnv
    base: string
    web: boolean
}

const KNOWN: AppEnv[] = ['expogo', 'dev', 'stage', 'prod']

export function parseAppEnv(value: string | undefined): AppEnv {
    const normalized = (value ?? '').trim().toLowerCase()
    return (KNOWN as string[]).includes(normalized) ? (normalized as AppEnv) : 'expogo'
}

export function resolveLinkBase({ env, urls, expoGoBase, schemeBase }: LinkBaseInput): LinkBase {
    const parsed = parseAppEnv(env)
    if (parsed === 'expogo') return { env: parsed, base: expoGoBase, web: false }
    const configured = (urls[parsed] ?? '').trim()
    if (/^https?:\/\//i.test(configured)) return { env: parsed, base: configured, web: true }
    return { env: parsed, base: schemeBase, web: false }
}
