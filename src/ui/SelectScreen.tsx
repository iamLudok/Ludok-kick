import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { playUi } from '../audio/ui'
import { DJS, STARTER, getDj, isDjId, pickRival, type DjId } from '../content/djs'
import { getGenre } from '../content/genres'
import { missionFor } from '../content/missions'
import { setupParams } from '../content/setup'
import { STAGES, isStageId, type StageId } from '../content/stages'
import { POWER } from '../game/constants'
import { useLevelTallies, useUnlocks } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { LEVELS, type Level } from '../types'
import { DjPortrait, StagePreview } from './Art'
import { Button } from './Button'
import { LEVEL_HINT, LEVEL_NAME, POWER_HINT, POWER_NAME, djNameColor } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/**
 * Elegir DJ, escenario y nivel. Los DJs bloqueados se ven en silueta, con la
 * misión que los desbloquea; el rival sale al azar entre los demás (también
 * entre los bloqueados: así se les conoce antes de ganarlos).
 */
export function SelectScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { data: tallies, ready: talliesReady } = useLevelTallies()
  const { unlocked, history } = useUnlocks()
  const [dj, setDj] = useState<DjId>(STARTER)
  const [stage, setStage] = useState<StageId>(STAGES[0].id)
  const [level, setLevel] = useState<Level>('warmup')

  // En cuanto la base responde, se propone lo último que se jugó.
  useEffect(() => {
    if (!ready) return
    if (isDjId(settings.lastDj)) setDj(settings.lastDj)
    if (isStageId(settings.lastStage)) setStage(settings.lastStage)
    if (settings.lastLevel) setLevel(settings.lastLevel)
  }, [ready, settings.lastDj, settings.lastLevel, settings.lastStage])

  const chosen = getDj(dj)
  const locked = !unlocked.has(dj)
  const mission = missionFor(dj)
  const genre = getGenre(chosen.genre)
  const power = chosen.stats.power

  const play = () => {
    if (locked) return
    router.push({ pathname: '/partido', params: setupParams({ dj, rival: pickRival(dj), stage, level }) })
  }

  const pick = <T,>(set: (v: T) => void, v: T) => {
    playUi('select')
    set(v)
  }

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
          Elige tu sesión
        </Txt>
        <Txt variant="data" tone="muted">
          {unlocked.size} / {DJS.length} DJs
        </Txt>
        <Button
          title={locked ? 'Bloqueado' : '¡A la cabina!'}
          onPress={play}
          style={[styles.small, locked && styles.disabled]}
        />
      </View>

      <View style={styles.body}>
        {/* El DJ elegido, en grande, con su ficha. */}
        <View style={[styles.card, styles.detail]}>
          <DjPortrait dj={chosen} size={112} locked={locked} />
          {locked ? (
            <>
              <Txt variant="body" tone="muted">
                DJ bloqueado
              </Txt>
              {mission && (
                <>
                  <Txt variant="body" style={styles.center}>
                    {mission.title}
                  </Txt>
                  <Txt variant="data" tone="brand">
                    {Math.min(mission.progress(history), mission.target)} / {mission.target}
                  </Txt>
                </>
              )}
            </>
          ) : (
            <>
              <Txt variant="title" style={{ color: djNameColor(chosen.look.jersey, palette.fg) }}>
                {chosen.name}
              </Txt>
              <Txt variant="data" tone="muted">
                {genre.name} · {genre.bpm} BPM
              </Txt>
              <StatBars dj={chosen} />
              {POWER.SIGNATURE && power && (
                <Txt variant="data" tone="brand" style={styles.center}>
                  {POWER_NAME[power]}: {POWER_HINT[power]}
                </Txt>
              )}
            </>
          )}
        </View>

        <View style={styles.right}>
          {/* Todos los DJs, en caras pequeñas: dos filas de siete. */}
          <View style={styles.grid}>
            {DJS.map((d) => {
              const selected = d.id === dj
              const isLocked = !unlocked.has(d.id)
              return (
                <Pressable
                  key={d.id}
                  onPress={() => pick(setDj, d.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={isLocked ? 'DJ bloqueado' : d.name}
                  style={[styles.face, selected && styles.selected]}
                >
                  <DjPortrait dj={d} size={FACE} locked={isLocked} />
                </Pressable>
              )
            })}
          </View>

          <View style={styles.row}>
            {STAGES.map((s) => {
              const selected = s.id === stage
              return (
                <Pressable
                  key={s.id}
                  onPress={() => pick(setStage, s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.card, styles.stage, selected && styles.selected]}
                >
                  <View style={styles.preview}>
                    <StagePreview stage={s} width={PREVIEW_W} height={PREVIEW_H} />
                  </View>
                  <Txt variant="data" numberOfLines={1}>
                    {s.name} · {s.place}
                  </Txt>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.row}>
            {LEVELS.map((l) => {
              const t = tallies[l]
              const selected = l === level
              return (
                <Pressable
                  key={l}
                  onPress={() => pick(setLevel, l)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.card, styles.level, selected && styles.selected]}
                >
                  <Txt variant="body">{LEVEL_NAME[l]}</Txt>
                  <Txt variant="data" tone="muted">
                    {talliesReady && t.played > 0 ? `${t.won} G · ${t.drawn} E · ${t.lost} P` : LEVEL_HINT[l]}
                  </Txt>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
    </View>
  )
}

/** Tamaño de cada cara de la cuadrícula y de las vistas previas de escenario. */
const FACE = 68
const PREVIEW_W = 128
const PREVIEW_H = 54

/**
 * Las ventajas del DJ como barras, de 1 a 5: 3 es lo normal. Se lee de un
 * vistazo mejor que una frase, y deja ver que las diferencias son pequeñas.
 */
function StatBars({ dj }: { dj: ReturnType<typeof getDj> }) {
  const st = dj.stats
  const rows: [string, number][] = [
    ['Velocidad', 3 + Math.round((st.speed - 1) / 0.04)],
    ['Tiro', 3 + Math.round((st.kick - 1) / 0.06)],
    ['Salto', 3 + Math.round((st.jump - 1) / 0.04)],
    ['Precisión', 3 + Math.round((st.timing - 1) / 0.12)],
  ]
  return (
    <View style={styles.stats}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.statRow}>
          <Txt variant="data" tone="muted" style={styles.statLabel}>
            {label}
          </Txt>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.pip, i <= Math.min(5, value) && styles.pipOn]} />
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  disabled: { opacity: 0.4 },
  center: { textAlign: 'center' },
  body: { flex: 1, flexDirection: 'row', gap: space.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: space.sm,
  },
  selected: { borderColor: palette.brand },
  detail: { width: 220, alignItems: 'center', justifyContent: 'center', gap: 2 },
  right: { flex: 1, gap: space.sm },
  // Siete por fila: 14 DJs en dos filas iguales.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, maxWidth: 7 * (FACE + 4) + 6 * space.xs },
  face: { borderRadius: radius.md, borderWidth: 2, borderColor: palette.line, backgroundColor: palette.surface },
  row: { flexDirection: 'row', gap: space.sm },
  stage: { flex: 1, alignItems: 'center', gap: space.xs },
  preview: { borderRadius: radius.md, overflow: 'hidden' },
  stats: { gap: 3, marginVertical: space.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statLabel: { width: 64 },
  pip: { width: 14, height: 7, borderRadius: 2, backgroundColor: palette.line },
  pipOn: { backgroundColor: palette.brand },
  level: { flex: 1, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.xs },
})
