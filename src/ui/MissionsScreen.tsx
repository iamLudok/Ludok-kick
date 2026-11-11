import { ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DJS, getDj } from '../content/djs'
import { MISSIONS } from '../content/missions'
import { useUnlocks } from '../hooks/useHistory'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { Txt } from './Text'
import { djNameColor } from './labels'
import { palette, radius, space } from './theme'

/** Las misiones y lo que llevas de cada una. Cumplir una desbloquea su DJ. */
export function MissionsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { unlocked, history } = useUnlocks()

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: Math.max(insets.left, space.lg), paddingRight: Math.max(insets.right, space.lg) },
      ]}
    >
      <View style={styles.header}>
        <Button title="Volver" kind="secondary" sound="back" onPress={() => router.back()} style={styles.small} />
        <Txt variant="title" style={styles.grow}>
          Misiones
        </Txt>
        <Txt variant="data" tone="muted">
          {unlocked.size} / {DJS.length} DJs desbloqueados
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {MISSIONS.map((m) => {
          const dj = getDj(m.dj)
          const done = unlocked.has(m.dj)
          const progress = Math.min(m.progress(history), m.target)
          return (
            <View key={m.dj} style={[styles.card, done && { borderColor: djNameColor(dj.look.jersey, palette.brand) }]}>
              <DjPortrait dj={dj} size={56} locked={!done} />
              <View style={styles.text}>
                <Txt variant="body">{m.title}</Txt>
                <Txt variant="data" tone={done ? 'brand' : 'muted'}>
                  {done ? `Desbloqueado: ${dj.name}` : '???'}
                </Txt>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((progress / m.target) * 100)}%` }]} />
                </View>
              </View>
              <Txt variant="data" tone="muted">
                {progress}/{m.target}
              </Txt>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingBottom: space.lg },
  card: {
    width: '49%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  text: { flex: 1, gap: 2 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: palette.line, overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', backgroundColor: palette.brand },
})
