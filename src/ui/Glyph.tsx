import { memo, useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import type { Status } from '../domain/types'
import { type Palette, statusGlyph } from './tokens'
import { useColors } from './theme'

interface GlyphProps {
    status: Status
    size?: number
    color?: string
}

export const Glyph = memo(function Glyph({ status, size = 16, color }: GlyphProps) {
    const colors = useColors()
    const glyphs = useMemo(() => statusGlyph(colors), [colors])
    const tint = color ?? glyphs[status]
    return (
        <View aria-hidden style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 16 16">
                {status === 'core' ? <Circle cx={8} cy={8} r={6} fill={tint} /> : null}
                {status === 'shoulder' ? (
                    <>
                        <Circle cx={8} cy={8} r={5.2} fill="none" stroke={tint} strokeWidth={1.8} />
                        <Path d="M8 2.8a5.2 5.2 0 0 0 0 10.4z" fill={tint} />
                    </>
                ) : null}
                {status === 'late' ? <Circle cx={8} cy={8} r={5.2} fill="none" stroke={tint} strokeWidth={1.8} /> : null}
                {status === 'sleep' ? <Path d="M12.6 10.6A5.6 5.6 0 0 1 5.4 3.4a5.6 5.6 0 1 0 7.2 7.2z" fill={tint} /> : null}
                {status === 'off' ? (
                    <>
                        <Circle cx={8} cy={8} r={5.2} fill="none" stroke={tint} strokeWidth={1.8} />
                        <Path d="M4.3 11.7l7.4-7.4" stroke={tint} strokeWidth={1.8} />
                    </>
                ) : null}
            </Svg>
        </View>
    )
})
