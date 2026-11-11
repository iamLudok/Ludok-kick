import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getDj } from '../content/djs'
import { BADGES, LADDER, ladderState } from '../content/ladder'
import { levelOf, readResult, readSetup, setupParams } from '../content/setup'
import { getStage } from '../content/stages'
import { useHistory } from '../hooks/useHistory'
import { BadgeIcon } from './BadgeIcon'
import { DjPortrait } from './Art'
import { Button } from './Button'
import { LEVEL_NAME } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/** Cómo acabó el partido, y qué hacer ahora. */
export function ResultScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const [setup] = useState(() => readSetup(params))
  const r = readResult(params)
  const fresh = r.newDjs
  const me = getDj(setup.dj)
  const rival = getDj(setup.rival)
  const stage = getStage(setup.stage)
  const { history, ready } = useHistory()
  // El siguiente rival de la escalera, si este partido lo ha abierto.
  const ladder = ladderState(history)
  const nextRival = LADDER[LADDER.indexOf(setup.rival) + 1]
  const nextOpen = ready && nextRival !== undefined && LADDER.indexOf(nextRival) < ladder.open && nextRival !== setup.dj

  // Con gol de oro no hay empate posible; sin él, sí.
  const outcome = r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'
  const title = outcome === 'win' ? '¡VICTORIA!' : outcome === 'loss' ? 'DERROTA' : 'EMPATE'

  return (
    // Dos columnas: en horizontal no cabe todo una cosa debajo de otra (los
    // botones se salían por abajo y el título chocaba con la barra de estado).
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, space.md),
          paddingBottom: Math.max(insets.bottom, space.md),
          paddingLeft: Math.max(insets.left, space.xl),
          paddingRight: Math.max(insets.right, space.xl),
        },
      ]}
    >
      <View style={styles.left}>
        <Txt variant="label" tone="muted">
          {LEVEL_NAME[levelOf(setup)]} · {stage.name}
          {r.golden ? ' · gol de oro' : ''}
        </Txt>
        <Txt variant="banner" tone={outcome === 'win' ? 'brand' : 'fg'}>
          {title}
        </Txt>
        <View style={styles.scoreRow}>
          <View style={styles.side}>
            <DjPortrait dj={me} size={84} />
            <Txt variant="label" numberOfLines={1}>
              {me.name}
            </Txt>
          </View>
          <Txt variant="banner">
            {r.goalsFor} – {r.goalsAgainst}
          </Txt>
          <View style={styles.side}>
            <DjPortrait dj={rival} size={84} flip />
            <Txt variant="label" numberOfLines={1}>
              {rival.name}
            </Txt>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        {fresh.length > 0 && (
          // Desbloquear un DJ es el momento más celebrable de todo el juego.
          <View style={styles.unlock}>
            {fresh.map((id) => (
              <DjPortrait key={id} dj={getDj(id)} size={44} />
            ))}
            <View style={styles.grow}>
              <Txt variant="label" tone="brand">
                {fresh.length === 1 ? '¡Nuevo DJ desbloqueado!' : '¡Nuevos DJs desbloqueados!'}
              </Txt>
              <Txt variant="body">{fresh.map((id) => getDj(id).name).join(' · ')}</Txt>
            </View>
          </View>
        )}

        {r.newBadges.map((b) => (
          <View key={b} style={styles.badgeRow}>
            <BadgeIcon id={b} size={16} earned />
            <Txt variant="data">{BADGES.find((x) => x.id === b)?.title}</Txt>
          </View>
        ))}

        <View style={styles.stats}>
          <Stat label="Monedas" value={`+${r.coins}`} />
          <Stat label="PERFECT" value={r.perfects} />
          <Stat label="GOOD" value={r.goods} />
          <Stat label="Poderes" value={r.powers} />
        </View>

        <View style={styles.buttons}>
          <Button
            title="Menú"
            kind="secondary"
            sound="back"
            onPress={() => router.dismissTo('/')}
            style={styles.button}
          />
          <Button title="Cambiar" kind="secondary" sound="back" onPress={() => router.back()} style={styles.button} />
          <Button
            title="Revancha"
            kind={nextOpen ? 'secondary' : 'primary'}
            onPress={() => router.replace({ pathname: '/partido', params: setupParams(setup) })}
            style={styles.button}
          />
          {nextOpen && (
            <Button
              title="Siguiente rival"
              onPress={() =>
                router.replace({ pathname: '/partido', params: setupParams({ ...setup, rival: nextRival }) })
              }
              style={styles.button}
            />
          )}
        </View>
      </View>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
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
  root: { flex: 1, backgroundColor: palette.bg, flexDirection: 'row', alignItems: 'center', gap: space.xl },
  left: { flex: 1, alignItems: 'center', gap: space.xs },
  right: { flex: 1, gap: space.sm },
  grow: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  side: { alignItems: 'center', gap: space.xs, maxWidth: 120 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: { minWidth: 0, flexGrow: 1, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.brand,
    backgroundColor: palette.surface,
  },
})
