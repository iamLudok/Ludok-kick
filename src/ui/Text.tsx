import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { palette, type } from './theme'

type Variant = keyof typeof type
type Tone = 'fg' | 'muted' | 'brand'

interface Props extends TextProps {
  variant?: Variant
  tone?: Tone
}

/**
 * Único punto donde se decide tamaño y color del texto. Evita que cada pantalla
 * invente su propio tamaño y que la escala tipográfica se vaya desmontando.
 */
export function Txt({ variant = 'body', tone = 'fg', style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant] as TextStyle, { color: palette[tone] }, style]} />
}
