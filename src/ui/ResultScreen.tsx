import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getDj } from '../content/djs'
import { readResult, readSetup, setupParams } from '../content/setup'
import { getStage } from '../content/stages'
import { useLevelTallies } from '../hooks/useHistory'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { LEVEL_NAME } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/** Cómo acabó el partido, y qué hacer ahora. */
export function ResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [setup] = useState(() => readSetup(params))
  const r = readResult(params)
  const me = getDj(setup.dj)
  const rival = getDj(setup.rival)
  const stage = getStage(setup.stage)
  const { data: tallies, ready } = useLevelTallies()
  const t = tallies[setup.level]

  // Con gol de oro no hay empate posible; sin él, sí.
  const outcome = r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'
  const title = outcome === 'win' ? '¡VICTORIA!' : outcome === 'loss' ? 'DERROTA' : 'EMPATE'

  return (
    <View style={styles.root}>
      <Txt variant="label" tone="muted">
        {LEVEL_NAME[setup.level]} · {stage.name}, {stage.place}
        {r.golden ? ' · gol de oro' : ''}
      </Txt>
      <Txt variant="banner" tone={outcome === 'win' ? 'brand' : 'fg'}>
        {title}
      </Txt>

      <View style={styles.scoreRow}>
        <View style={styles.side}>
          <DjPortrait dj={me} size={92} />
          <Txt variant="label" style={{ color: me.look.jersey }}>
            {me.name}
          </Txt>
        </View>
        <Txt variant="banner">
          {r.goalsFor} – {r.goalsAgainst}
        </Txt>
        <View style={styles.side}>
          <DjPortrait dj={rival} size={92} flip />
          <Txt variant="label" style={{ color: rival.look.jersey }}>
            {rival.name}
          </Txt>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="PERFECT" value={r.perfects} />
        <Stat label="GOOD" value={r.goods} />
        <Stat label="Poderes" value={r.powers} />
      </View>

      <Txt variant="data" tone="muted">
        {ready && t.played > 0 ? `Contra ${LEVEL_NAME[setup.level]}: ${t.won} G · ${t.drawn} E · ${t.lost} P` : ' '}
      </Txt>

      <View style={styles.buttons}>
        <Button title="Menú" kind="secondary" onPress={() => router.dismissTo('/')} />
        <Button title="Cambiar" kind="secondary" onPress={() => router.back()} />
        <Button title="Revancha" onPress={() => router.replace({ pathname: '/partido', params: setupParams(setup) })} />
      </View>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Txt variant="score">{value}</Txt>
      <Txt variant="label" tone="muted">
        {label}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.xxl },
  side: { alignItems: 'center', gap: space.xs },
  stats: { flexDirection: 'row', gap: space.lg },
  stat: {
    alignItems: 'center',
    minWidth: 96,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
  },
  buttons: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
})
