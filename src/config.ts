import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { resolveLinkBase } from './domain/share/linkBase'

export const APP_SCHEME = 'overlap'

function expoGoBase(): string {
    const host = Constants.expoConfig?.hostUri
    return host ? `exp://${host}/--/s` : Linking.createURL('s')
}

const resolved = resolveLinkBase({
    env: process.env.EXPO_PUBLIC_APP_ENV,
    urls: {
        dev: process.env.EXPO_PUBLIC_SHARE_URL_DEV,
        stage: process.env.EXPO_PUBLIC_SHARE_URL_STAGE,
        prod: process.env.EXPO_PUBLIC_SHARE_URL_PROD,
    },
    expoGoBase: expoGoBase(),
    schemeBase: `${APP_SCHEME}://s`,
})

export const APP_ENV = resolved.env
export const LINK_BASE = resolved.base
export const HAS_WEB_LINK = resolved.web
