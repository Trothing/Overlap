import type { ColorValue } from 'react-native'
import { View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

export type IconName = 'timeline' | 'calls' | 'people' | 'settings' | 'left' | 'right'

interface IconProps {
    name: IconName
    color: ColorValue
    size?: number
}

export function Icon({ name, color, size = 24 }: IconProps) {
    const stroke = { stroke: color, strokeWidth: name === 'left' || name === 'right' ? 2 : 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
    return (
        <View aria-hidden style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 24 24">
                {name === 'timeline' ? <Path d="M4 7h9M4 12h16M4 17h11" {...stroke} /> : null}
                {name === 'calls' ? (
                <>
                    <Path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" {...stroke} />
                    <Path d="M4 10h16M8 3.5v4M16 3.5v4" {...stroke} />
                </>
            ) : null}
            {name === 'people' ? (
                    <>
                        <Circle cx={9} cy={8} r={3.2} {...stroke} />
                        <Path d="M3.5 19c.6-3.4 2.7-5 5.5-5s4.9 1.6 5.5 5" {...stroke} />
                        <Path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.4c1.8.5 3 2 3.4 4.6" {...stroke} />
                    </>
                ) : null}
                {name === 'settings' ? (
                    <>
                        <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...stroke} />
                        <Circle cx={16} cy={7} r={2} {...stroke} />
                        <Circle cx={8} cy={17} r={2} {...stroke} />
                    </>
                ) : null}
                {name === 'left' ? <Path d="M15 5l-7 7 7 7" {...stroke} /> : null}
                {name === 'right' ? <Path d="M9 5l7 7-7 7" {...stroke} /> : null}
            </Svg>
        </View>
    )
}
