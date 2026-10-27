import { parseAppEnv, resolveLinkBase } from './linkBase'

const expoGoBase = 'exp://192.168.1.107:8081/--/s'
const schemeBase = 'overlap://s'
const urls = { dev: 'https://dev.example.test/', stage: 'https://stage.example.test/', prod: 'https://example.test/' }

describe('parseAppEnv', () => {
    it('accepts the four environments in any case and with spaces', () => {
        expect(parseAppEnv('prod')).toBe('prod')
        expect(parseAppEnv(' Stage ')).toBe('stage')
        expect(parseAppEnv('DEV')).toBe('dev')
        expect(parseAppEnv('expogo')).toBe('expogo')
    })

    it('falls back to expogo for missing or unknown values', () => {
        expect(parseAppEnv(undefined)).toBe('expogo')
        expect(parseAppEnv('')).toBe('expogo')
        expect(parseAppEnv('production')).toBe('expogo')
    })
})

describe('resolveLinkBase', () => {
    it('uses the Expo Go link in expogo even when web addresses are set', () => {
        expect(resolveLinkBase({ env: 'expogo', urls, expoGoBase, schemeBase })).toEqual({ env: 'expogo', base: expoGoBase, web: false })
    })

    it('uses the web address of the chosen environment', () => {
        expect(resolveLinkBase({ env: 'dev', urls, expoGoBase, schemeBase }).base).toBe('https://dev.example.test/')
        expect(resolveLinkBase({ env: 'stage', urls, expoGoBase, schemeBase }).base).toBe('https://stage.example.test/')
        expect(resolveLinkBase({ env: 'prod', urls, expoGoBase, schemeBase })).toEqual({ env: 'prod', base: 'https://example.test/', web: true })
    })

    it('falls back to the app scheme when the environment has no web address', () => {
        expect(resolveLinkBase({ env: 'prod', urls: { dev: urls.dev }, expoGoBase, schemeBase })).toEqual({ env: 'prod', base: schemeBase, web: false })
    })

    it('ignores an address that is not http or https', () => {
        expect(resolveLinkBase({ env: 'prod', urls: { prod: 'example.test' }, expoGoBase, schemeBase }).web).toBe(false)
    })

    it('trims the configured address', () => {
        expect(resolveLinkBase({ env: 'prod', urls: { prod: '  https://example.test/  ' }, expoGoBase, schemeBase }).base).toBe('https://example.test/')
    })
})
