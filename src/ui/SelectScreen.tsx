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
import { LEVEL_HINT, LEVEL_NAME, POWER_HINT, POWER_NAME } from './labels'
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

      {/* Todos los DJs en una tira; el elegido se ve en detalle abajo. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
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
              style={[styles.chip, selected && { borderColor: isLocked ? palette.muted : d.look.jersey }]}
            >
              <DjPortrait dj={d} size={58} locked={isLocked} />
              <Txt variant="data" tone={isLocked ? 'muted' : 'fg'} numberOfLines={1} style={styles.chipName}>
                {isLocked ? '???' : d.name}
              </Txt>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={[styles.card, styles.detail]}>
          <DjPortrait dj={chosen} size={88} locked={locked} />
          <View style={styles.detailText}>
            {locked ? (
              <>
                <Txt variant="body" tone="muted">
                  DJ bloqueado
                </Txt>
                {mission && (
                  <>
                    <Txt variant="body">{mission.title}</Txt>
                    <Txt variant="data" tone="brand">
                      {Math.min(mission.progress(history), mission.target)} / {mission.target}
                    </Txt>
                  </>
                )}
              </>
            ) : (
              <>
                <Txt
                  variant="title"
                  style={{ color: chosen.look.jersey === '#1d1d24' ? palette.fg : chosen.look.jersey }}
                >
                  {chosen.name}
                </Txt>
                <Txt variant="data" tone="muted">
                  Homenaje a {chosen.tribute}
                </Txt>
                <Txt variant="data">
                  {genre.name} · {genre.bpm} BPM
                </Txt>
                {chosen.perk !== '' && <Txt variant="data">{chosen.perk}</Txt>}
                {POWER.SIGNATURE && power && (
                  <Txt variant="data" tone="brand">
                    {POWER_NAME[power]}: {POWER_HINT[power]}
                  </Txt>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.column}>
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
                <View>
                  <Txt variant="data">{s.name}</Txt>
                  <Txt variant="data" tone="muted">
                    {s.place}
                  </Txt>
                </View>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.column}>
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
  )
}

const PREVIEW_W = 84
const PREVIEW_H = 38

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  disabled: { opacity: 0.4 },
  strip: { gap: space.sm },
  chip: {
    width: 76,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipName: { maxWidth: 70 },
  bottom: { flex: 1, flexDirection: 'row', gap: space.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: space.sm,
  },
  selected: { borderColor: palette.brand },
  detail: { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: space.md },
  detailText: { flex: 1, gap: 2 },
  column: { flex: 1, gap: space.sm },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  preview: { borderRadius: radius.sm, overflow: 'hidden' },
  level: { flex: 1, justifyContent: 'center', paddingHorizontal: space.md },
})
