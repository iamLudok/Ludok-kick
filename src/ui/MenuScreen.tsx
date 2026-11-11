import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSettings } from '../hooks/useSettings'
import { Button } from './Button'
import { Txt } from './Text'
import { palette, space } from './theme'

/** Menú provisional: lo justo para entrar al partido y a los ajustes. */
export function MenuScreen() {
  const router = useRouter()
  const { data: settings, ready } = useSettings()

  return (
    <View style={styles.root}>
      <View style={styles.title}>
        <Txt variant="banner">LUDOK </Txt>
        <Txt variant="banner" tone="brand">
          KICK
        </Txt>
      </View>
      <View style={styles.buttons}>
        <Button title="Jugar" onPress={() => router.push('/partido')} />
        <Button title="Ajustes" kind="secondary" onPress={() => router.push('/ajustes')} />
      </View>
      {/* Mientras la base no responde, «sin calibrar» y «aún no lo sé» se ven igual: no se avisa. */}
      {ready && settings.audioOffsetMs === undefined && (
        <Txt variant="data" tone="muted" style={styles.hint}>
          Audio sin calibrar. Si vas a jugar con auriculares Bluetooth, calíbralo antes en Ajustes.
        </Txt>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  title: { flexDirection: 'row' },
  buttons: { flexDirection: 'row', gap: space.md },
  hint: { textAlign: 'center', paddingHorizontal: space.xxl },
})
