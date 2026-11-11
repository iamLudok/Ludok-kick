import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DJS, isDjId, pickRival, type DjId } from '../content/djs'
import { setupParams } from '../content/setup'
import { STAGES, isStageId, type StageId } from '../content/stages'
import { POWER } from '../game/constants'
import { useLevelTallies } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { LEVELS, type Level } from '../types'
import { DjPortrait, StagePreview } from './Art'
import { Button } from './Button'
import { LEVEL_HINT, LEVEL_NAME, POWER_HINT, POWER_NAME } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/** Elegir DJ, escenario y nivel. El rival sale al azar entre los otros tres DJs. */
export function SelectScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { data: tallies, ready: talliesReady } = useLevelTallies()
  const [dj, setDj] = useState<DjId>(DJS[0].id)
  const [stage, setStage] = useState<StageId>(STAGES[0].id)
  const [level, setLevel] = useState<Level>('warmup')

  // En cuanto la base responde, se propone lo último que se jugó.
  useEffect(() => {
    if (!ready) return
    if (isDjId(settings.lastDj)) setDj(settings.lastDj)
    if (isStageId(settings.lastStage)) setStage(settings.lastStage)
    if (settings.lastLevel) setLevel(settings.lastLevel)
  }, [ready, settings.lastDj, settings.lastLevel, settings.lastStage])

  const play = () => {
    router.push({ pathname: '/partido', params: setupParams({ dj, rival: pickRival(dj), stage, level }) })
  }

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: Math.max(insets.left, space.lg), paddingRight: Math.max(insets.right, space.lg) },
      ]}
    >
      <View style={styles.header}>
        <Button title="Volver" kind="secondary" onPress={() => router.back()} style={styles.small} />
        <Txt variant="title" style={styles.grow}>
          Elige tu sesión
        </Txt>
        <Button title="¡A la cabina!" onPress={play} style={styles.small} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.row}>
          {DJS.map((d) => {
            const selected = d.id === dj
            const power = d.stats.power
            return (
              <Pressable
                key={d.id}
                onPress={() => setDj(d.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.card, styles.djCard, selected && { borderColor: d.look.jersey }]}
              >
                <DjPortrait dj={d} size={64} />
                <View style={styles.djText}>
                  <Txt variant="body" style={{ color: d.look.jersey }}>
                    {d.name}
                  </Txt>
                  <Txt variant="data" tone="muted">
                    {d.style}
                  </Txt>
                  <Txt variant="data">{d.perk}</Txt>
                  {POWER.SIGNATURE && power && (
                    <Txt variant="data" tone="brand">
                      {POWER_NAME[power]}: {POWER_HINT[power]}
                    </Txt>
                  )}
                </View>
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
                onPress={() => setStage(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.card, styles.stageCard, selected && styles.selected]}
              >
                <View style={styles.preview}>
                  <StagePreview stage={s} width={PREVIEW_W} height={PREVIEW_H} />
                </View>
                <Txt variant="body">{s.name}</Txt>
                <Txt variant="data" tone="muted">
                  {s.place}
                </Txt>
              </Pressable>
            )
          })}

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
      </ScrollView>
    </View>
  )
}

const PREVIEW_W = 168
const PREVIEW_H = 76

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.sm },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  body: { gap: space.md, paddingBottom: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: space.sm,
  },
  selected: { borderColor: palette.brand },
  djCard: { flex: 1, flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  djText: { flex: 1, gap: 2 },
  stageCard: { width: PREVIEW_W + space.sm * 2 + 4, gap: 2 },
  preview: { borderRadius: radius.md, overflow: 'hidden', marginBottom: space.xs },
  levels: { flex: 1, gap: space.sm },
  level: { flex: 1, justifyContent: 'center', paddingHorizontal: space.md },
})
