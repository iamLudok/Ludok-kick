import { useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { playUi } from '../audio/ui'
import { updateSettings } from '../lib/settings'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DJS } from '../content/djs'
import { LADDER } from '../content/ladder'
import { useLadder, useLevelTallies } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { LEVELS } from '../types'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { Txt } from './Text'
import { djNameColor } from './labels'
import { palette, space } from './theme'

export function MenuScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { data: tallies, ready: talliesReady } = useLevelTallies()
  const { ladder } = useLadder()
  const unlocked = ladder.playable
  const taps = useRef<number[]>([])
  const tapTitle = () => {
    const now = Date.now()
    // Solo cuentan los toques de los últimos 3 segundos: siete «seguidos».
    taps.current = [...taps.current.filter((t) => now - t < 3000), now]
    if (taps.current.length >= 7) {
      taps.current = []
      playUi('select')
      void updateSettings({ unlockAll: settings.unlockAll !== true })
    }
  }
  // Seis caras: primero los DJs que ya tienes y luego siluetas de los que faltan.
  const crew = [...DJS.filter((d) => unlocked.has(d.id)), ...DJS.filter((d) => !unlocked.has(d.id))].slice(0, 6)

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
        {/* Truco escondido: siete toques seguidos al título activan (o quitan) el
            modo prueba, con todos los DJs desbloqueados. Sin ningún aviso
            visual de que el título se puede tocar: es un easter egg. */}
        <Pressable onPress={tapTitle} style={styles.title} accessible={false}>
          <Txt variant="banner">LUDOK </Txt>
          <Txt variant="banner" tone="brand">
            KICK
          </Txt>
        </Pressable>
        {ready && settings.unlockAll === true && (
          <Txt variant="label" tone="brand">
            Modo prueba: todos los DJs desbloqueados
          </Txt>
        )}
        <Txt variant="body" tone="muted">
          Uno contra uno, al ritmo del bombo.
        </Txt>
        <View style={styles.buttons}>
          <Button title="Jugar" onPress={() => router.push('/elegir')} />
          <Button title="Tienda" kind="secondary" onPress={() => router.push('/tienda')} />
          <Button title="Ajustes" kind="secondary" onPress={() => router.push('/ajustes')} />
        </View>
        <Txt variant="body" tone="brand">
          {settings.coins} monedas · {ladder.beaten.size} de {LADDER.length} rivales ganados
        </Txt>
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
        {crew.map((dj) => {
          const locked = !unlocked.has(dj.id)
          return (
            <View key={dj.id} style={styles.member}>
              <DjPortrait dj={dj} size={72} locked={locked} />
              <Txt
                variant="label"
                style={{ color: locked ? palette.muted : djNameColor(dj.look.jersey, palette.fg) }}
                numberOfLines={1}
              >
                {locked ? '???' : dj.name}
              </Txt>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, flexDirection: 'row', alignItems: 'center', gap: space.xxl },
  left: { flex: 1, gap: space.md },
  title: { flexDirection: 'row' },
  buttons: { flexDirection: 'row', gap: space.md, marginVertical: space.sm },
  crew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 96 + 2 * space.md,
    gap: space.md,
    justifyContent: 'center',
  },
  member: { width: 96, alignItems: 'center', gap: space.xs },
})
