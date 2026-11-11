import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { playUi } from '../audio/ui'
import { DJS, STARTER, getDj, isDjId, type DjId } from '../content/djs'
import { getGenre } from '../content/genres'
import { useLadder } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { Flag } from './Flag'
import { POWER_HINT, POWER_NAME } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/**
 * Primer paso: elegir tu DJ. El rival y el escenario van en la pantalla
 * siguiente: todo junto en una sola no cabía sin quedar saturado.
 */
export function SelectScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { ladder } = useLadder()
  const [dj, setDj] = useState<DjId>(STARTER)

  useEffect(() => {
    if (ready && isDjId(settings.lastDj)) setDj(settings.lastDj)
  }, [ready, settings.lastDj])

  const chosen = getDj(dj)
  const locked = !ladder.playable.has(dj)
  const genre = getGenre(chosen.genre)

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: Math.max(insets.left, space.xl), paddingRight: Math.max(insets.right, space.xl) },
      ]}
    >
      <View style={styles.header}>
        <Button title="Volver" kind="secondary" sound="back" onPress={() => router.back()} style={styles.small} />
        <Txt variant="title" style={styles.grow}>
          Elige tu DJ
        </Txt>
        <Button
          title="Elegir rival"
          onPress={() => {
            if (!locked) router.push({ pathname: '/rival', params: { dj } })
          }}
          style={[styles.small, locked && styles.off]}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.hero}>
          <DjPortrait dj={chosen} size={150} locked={locked} />
          {locked ? (
            <Txt variant="body" tone="muted" style={styles.center}>
              Gánale en la escalera de rivales para jugar con él
            </Txt>
          ) : (
            <>
              <View style={styles.nameRow}>
                <Flag country={chosen.origin} height={18} />
                <Txt variant="title">
                  {chosen.name}
                </Txt>
              </View>
              <Txt variant="data" tone="muted">
                {genre.name} · {genre.bpm} BPM
              </Txt>
              <Txt variant="body" tone="brand" style={styles.center}>
                {POWER_NAME[chosen.power]}
              </Txt>
              <Txt variant="data" tone="muted" style={styles.center}>
                {POWER_HINT[chosen.power]}
              </Txt>
            </>
          )}
        </View>

        <View style={styles.grid}>
          {DJS.map((d) => {
            const isLocked = !ladder.playable.has(d.id)
            return (
              <Pressable
                key={d.id}
                onPress={() => {
                  playUi('select')
                  setDj(d.id)
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: d.id === dj }}
                accessibilityLabel={isLocked ? 'DJ bloqueado' : d.name}
                style={[styles.face, d.id === dj && styles.selected]}
              >
                <DjPortrait dj={d} size={78} locked={isLocked} />
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  off: { opacity: 0.4 },
  center: { textAlign: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xl },
  hero: {
    width: 260,
    alignItems: 'center',
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Seis por fila: los 11 DJs en dos filas.
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  face: { borderRadius: radius.lg, borderWidth: 2, borderColor: palette.line, backgroundColor: palette.surface },
  selected: { borderColor: palette.brand },
})
