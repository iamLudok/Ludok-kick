import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { playUi } from '../audio/ui'
import type { UiSound } from '../audio/synth'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

interface Props {
  title: string
  onPress: () => void
  kind?: 'primary' | 'secondary'
  style?: StyleProp<ViewStyle>
  /** El clic que suena al pulsar. «back» para volver atrás. */
  sound?: UiSound
}

/** El principal va en morado de marca; el secundario, solo con borde. */
export function Button({ title, onPress, kind = 'primary', style, sound = 'tap' }: Props) {
  const primary = kind === 'primary'
  return (
    <Pressable
      onPress={() => {
        playUi(sound)
        onPress()
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: primary ? palette.brand : 'transparent',
          borderColor: primary ? palette.brand : palette.line,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Txt variant="body" style={{ color: primary ? palette.brandFg : palette.fg }}>
        {title}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    // Mínimo cómodo para el pulgar con el móvil en horizontal.
    minWidth: 160,
    minHeight: 48,
  },
})
