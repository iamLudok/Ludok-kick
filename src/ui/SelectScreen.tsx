import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { playUi } from '../audio/ui'
import { DJS, STARTER, getDj, isDjId, type DjId } from '../content/djs'
import { getGenre } from '../content/genres'
import { BADGES, LADDER, badgesAgainst, levelOfRung } from '../content/ladder'
import { setupParams } from '../content/setup'
import { STAGES, isStageId, type StageId } from '../content/stages'
import { useLadder } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { DjPortrait, StagePreview } from './Art'
import { BadgeIcon } from './BadgeIcon'
import { Button } from './Button'
import { Flag } from './Flag'
import { LEVEL_NAME, POWER_HINT, POWER_NAME, djNameColor } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/**
 * Elegir tu DJ, el rival y el escenario. Los rivales van en escalera (como el
 * arcade de Head Soccer): hay que ganar a uno para poder jugar contra el
 * siguiente, y ganarle a un DJ lo desbloquea para jugar con él. Cada rival
 * enseña sus logros: los conseguidos, en dorado.
 */
export function SelectScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings, ready } = useSettings()
  const { ladder, history } = useLadder()
  const [dj, setDj] = useState<DjId>(STARTER)
  const [rival, setRival] = useState<DjId>(LADDER[0])
  const [stage, setStage] = useState<StageId>(STAGES[0].id)

  // En cuanto la base responde, se propone lo último que se jugó y el rival
  // más alto que esté abierto.
  useEffect(() => {
    if (!ready) return
    if (isDjId(settings.lastDj)) setDj(settings.lastDj)
    if (isStageId(settings.lastStage)) setStage(settings.lastStage)
  }, [ready, settings.lastDj, settings.lastStage])
  useEffect(() => {
    setRival(LADDER[Math.max(0, ladder.open - 1)])
  }, [ladder.open])

  const chosen = getDj(dj)
  const mineLocked = !ladder.playable.has(dj)
  const rivalOpen = LADDER.indexOf(rival) < ladder.open
  // Contra uno mismo no se juega: dos muñecos iguales en el campo no se distinguen.
  const sameDj = rival === dj
  const canPlay = !mineLocked && rivalOpen && !sameDj
  const genre = getGenre(chosen.genre)

  const play = () => {
    if (!canPlay) return
    router.push({ pathname: '/partido', params: setupParams({ dj, rival, stage }) })
  }

  const pick = <T,>(set: (v: T) => void, v: T) => {
    playUi('select')
    set(v)
  }

  const reason = mineLocked ? 'Tu DJ está bloqueado' : !rivalOpen ? 'Rival bloqueado' : sameDj ? 'Elige otro rival' : ''

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
        {reason !== '' && (
          <Txt variant="data" tone="muted">
            {reason}
          </Txt>
        )}
        <Button title="¡A la cabina!" onPress={play} style={[styles.small, !canPlay && styles.off]} />
      </View>

      {/* Tu DJ: los que tienes, y en silueta los que faltan por ganar. */}
      <View style={styles.mine}>
        <View style={styles.faces}>
          {DJS.map((d) => {
            const locked = !ladder.playable.has(d.id)
            return (
              <Pressable
                key={d.id}
                onPress={() => pick(setDj, d.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: d.id === dj }}
                accessibilityLabel={locked ? 'DJ bloqueado' : d.name}
                style={[styles.face, d.id === dj && styles.selected]}
              >
                <DjPortrait dj={d} size={46} locked={locked} />
              </Pressable>
            )
          })}
        </View>
        <View style={styles.mineText}>
          {mineLocked ? (
            <Txt variant="body" tone="muted">
              Gánale en la escalera para jugar con él
            </Txt>
          ) : (
            <>
              <View style={styles.nameRow}>
                <Flag country={chosen.origin} height={14} />
                <Txt variant="body" style={{ color: djNameColor(chosen.look.jersey, palette.fg) }}>
                  {chosen.name}
                </Txt>
                <Txt variant="data" tone="muted">
                  {genre.name} · {genre.bpm} BPM
                </Txt>
              </View>
              <Txt variant="data" tone="brand">
                {POWER_NAME[chosen.power]}: {POWER_HINT[chosen.power]}
              </Txt>
            </>
          )}
        </View>
      </View>

      {/* La escalera de rivales. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ladder}>
        {LADDER.map((id, rung) => {
          const d = getDj(id)
          const open = rung < ladder.open
          const earned = badgesAgainst(history, id)
          return (
            <Pressable
              key={id}
              onPress={() => pick(setRival, id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: id === rival }}
              accessibilityLabel={open ? d.name : 'Rival bloqueado'}
              style={[styles.rung, id === rival && styles.selected, !open && styles.closed]}
            >
              <Txt variant="label" tone="muted">
                {rung + 1} · {LEVEL_NAME[levelOfRung(rung)]}
              </Txt>
              <DjPortrait dj={d} size={58} locked={!open} />
              <View style={styles.nameRow}>
                {open && <Flag country={d.origin} height={11} />}
                <Txt variant="data" numberOfLines={1} tone={open ? 'fg' : 'muted'}>
                  {open ? d.name : '???'}
                </Txt>
              </View>
              <View style={styles.badges}>
                {BADGES.map((b) => (
                  <BadgeIcon key={b.id} id={b.id} size={13} earned={earned.has(b.id)} />
                ))}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={styles.stages}>
        {STAGES.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => pick(setStage, s.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: s.id === stage }}
            style={[styles.stage, s.id === stage && styles.selected]}
          >
            <View style={styles.preview}>
              <StagePreview stage={s} width={86} height={36} />
            </View>
            <Txt variant="data" numberOfLines={1}>
              {s.name}
            </Txt>
          </Pressable>
        ))}
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
  selected: { borderColor: palette.brand },
  mine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  faces: { flexDirection: 'row', gap: 4 },
  face: { borderRadius: radius.md, borderWidth: 2, borderColor: palette.line, backgroundColor: palette.surface },
  mineText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  ladder: { gap: space.sm },
  rung: {
    width: 116,
    alignItems: 'center',
    gap: 2,
    padding: space.xs,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  closed: { opacity: 0.6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3, width: 70 },
  stages: { flexDirection: 'row', gap: space.sm },
  stage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  preview: { borderRadius: radius.sm, overflow: 'hidden' },
})
