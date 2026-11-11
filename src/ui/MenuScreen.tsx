import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DJS } from '../content/djs'
import { useLevelTallies } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { LEVELS } from '../types'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { Txt } from './Text'
import { palette, space } from './theme'

export function MenuScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { data: tallies, ready: talliesReady } = useLevelTallies()

  const total = LEVELS.reduce(
    (acc, l) => ({
      played: acc.played + tallies[l].played,
      won: acc.won + tallies[l].won,
      drawn: acc.drawn + tallies[l].drawn,
      lost: acc.lost + tallies[l].lost,
    }),
    { played: 0, won: 0, drawn: 0, lost: 0 },
  )

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: Math.max(insets.left, space.xxl), paddingRight: Math.max(insets.right, space.xxl) },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.title}>
          <Txt variant="banner">LUDOK </Txt>
          <Txt variant="banner" tone="brand">
            KICK
          </Txt>
        </View>
        <Txt variant="body" tone="muted">
          Uno contra uno, al ritmo del bombo.
        </Txt>
        <View style={styles.buttons}>
          <Button title="Jugar" onPress={() => router.push('/elegir')} />
          <Button title="Ajustes" kind="secondary" onPress={() => router.push('/ajustes')} />
        </View>
        <Txt variant="data" tone="muted">
          {talliesReady && total.played > 0
            ? `${total.played} partidos · ${total.won} ganados · ${total.drawn} empatados · ${total.lost} perdidos`
            : ' '}
        </Txt>
        {/* Mientras la base no responde, «sin calibrar» y «aún no lo sé» se ven igual: no se avisa. */}
        {ready && settings.audioOffsetMs === undefined && (
          <Txt variant="data" tone="muted">
            Audio sin calibrar. Si juegas con auriculares Bluetooth, calíbralo antes en Ajustes.
          </Txt>
        )}
      </View>

      <View style={styles.crew}>
        {DJS.map((dj) => (
          <View key={dj.id} style={styles.member}>
            <DjPortrait dj={dj} size={84} />
            <Txt variant="label" style={{ color: dj.look.jersey }}>
              {dj.name}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, flexDirection: 'row', alignItems: 'center', gap: space.xxl },
  left: { flex: 1, gap: space.md },
  title: { flexDirection: 'row' },
  buttons: { flexDirection: 'row', gap: space.md, marginVertical: space.sm },
  crew: { flexDirection: 'row', flexWrap: 'wrap', width: 2 * 104 + space.lg, gap: space.lg, justifyContent: 'center' },
  member: { width: 104, alignItems: 'center', gap: space.xs },
})
