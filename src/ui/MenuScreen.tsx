import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useLevelTallies } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { LEVELS, type Level } from '../types'
import { Button } from './Button'
import { LEVEL_HINT, LEVEL_NAME } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/** Menú provisional: elegir rival y jugar. El de verdad llega con la fase de contenido. */
export function MenuScreen() {
  const router = useRouter()
  const { data: settings, ready } = useSettings()
  const { data: tallies, ready: talliesReady } = useLevelTallies()
  const [level, setLevel] = useState<Level>('warmup')

  // En cuanto la base responde, se propone el último nivel jugado.
  useEffect(() => {
    if (ready && settings.lastLevel) setLevel(settings.lastLevel)
  }, [ready, settings.lastLevel])

  return (
    <View style={styles.root}>
      <View style={styles.title}>
        <Txt variant="banner">LUDOK </Txt>
        <Txt variant="banner" tone="brand">
          KICK
        </Txt>
      </View>

      <View style={styles.levels}>
        {LEVELS.map((l) => {
          const t = tallies[l]
          const selected = l === level
          return (
            <Pressable
              key={l}
              onPress={() => setLevel(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.level, selected && styles.levelOn]}
            >
              <Txt variant="body">{LEVEL_NAME[l]}</Txt>
              <Txt variant="data" tone="muted">
                {LEVEL_HINT[l]}
              </Txt>
              <Txt variant="data" tone={selected ? 'fg' : 'muted'}>
                {talliesReady && t.played > 0 ? `${t.won} G · ${t.drawn} E · ${t.lost} P` : ' '}
              </Txt>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.buttons}>
        <Button title="Jugar" onPress={() => router.push({ pathname: '/partido', params: { nivel: level } })} />
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
  root: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  title: { flexDirection: 'row' },
  levels: { flexDirection: 'row', gap: space.md },
  level: {
    width: 156,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  levelOn: { borderColor: palette.brand },
  buttons: { flexDirection: 'row', gap: space.md },
  hint: { textAlign: 'center', paddingHorizontal: space.xxl },
})
