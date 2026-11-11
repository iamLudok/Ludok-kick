import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { playUi } from '../audio/ui'
import { getDj, isDjId, STARTER } from '../content/djs'
import { BADGES, LADDER, badgesAgainst, levelOfRung } from '../content/ladder'
import { setupParams } from '../content/setup'
import { STAGES, isStageId, type StageId } from '../content/stages'
import { useLadder } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { DjPortrait, StagePreview } from './Art'
import { BadgeIcon } from './BadgeIcon'
import { Button } from './Button'
import { Flag } from './Flag'
import { LEVEL_NAME, djNameColor } from './labels'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

/**
 * Segundo paso: el rival y el escenario. Los rivales van en escalera (como el
 * arcade de Head Soccer): hay que ganar a uno para poder jugar contra el
 * siguiente. El elegido se ve en grande con sus ocho logros.
 */
export function RivalScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const dj = isDjId(params.dj) ? params.dj : STARTER
  const { data: settings, ready } = useSettings()
  const { ladder, history } = useLadder()
  const [rival, setRival] = useState(LADDER[0])
  const [stage, setStage] = useState<StageId>(STAGES[0].id)

  // Se propone el rival más alto abierto (que no sea tu mismo DJ) y el último escenario.
  useEffect(() => {
    const open = LADDER.slice(0, ladder.open).filter((id) => id !== dj)
    if (open.length > 0) setRival(open[open.length - 1])
  }, [ladder.open, dj])
  useEffect(() => {
    if (ready && isStageId(settings.lastStage)) setStage(settings.lastStage)
  }, [ready, settings.lastStage])

  const rung = LADDER.indexOf(rival)
  const open = rung < ladder.open
  const same = rival === dj
  const canPlay = open && !same
  const d = getDj(rival)
  const earned = badgesAgainst(history, rival)

  const play = () => {
    if (canPlay) router.push({ pathname: '/partido', params: setupParams({ dj, rival, stage }) })
  }

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
          Elige rival
        </Txt>
        {!canPlay && (
          <Txt variant="data" tone="muted">
            {same ? 'Es tu mismo DJ: elige otro' : 'Gana al anterior para desbloquearlo'}
          </Txt>
        )}
        <Button title="¡A la cabina!" onPress={play} style={[styles.small, !canPlay && styles.off]} />
      </View>

      <View style={styles.body}>
        <View style={styles.hero}>
          <Txt variant="label" tone="muted">
            Rival {rung + 1} · {LEVEL_NAME[levelOfRung(rung)]}
          </Txt>
          <DjPortrait dj={d} size={110} locked={!open} flip />
          {open ? (
            <View style={styles.nameRow}>
              <Flag country={d.origin} height={16} />
              <Txt variant="body" style={{ color: djNameColor(d.look.jersey, palette.fg) }}>
                {d.name}
              </Txt>
            </View>
          ) : (
            <Txt variant="body" tone="muted">
              ???
            </Txt>
          )}
          <View style={styles.badgeList}>
            {BADGES.map((b) => (
              <View key={b.id} style={styles.badgeRow}>
                <BadgeIcon id={b.id} size={14} earned={earned.has(b.id)} />
                <Txt variant="data" tone={earned.has(b.id) ? 'fg' : 'muted'} numberOfLines={1}>
                  {b.title}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.right}>
          <View style={styles.ladder}>
            {LADDER.map((id, i) => {
              const r = getDj(id)
              const isOpen = i < ladder.open
              const count = badgesAgainst(history, id).size
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    playUi('select')
                    setRival(id)
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: id === rival }}
                  accessibilityLabel={isOpen ? r.name : 'Rival bloqueado'}
                  style={[styles.rung, id === rival && styles.selected, !isOpen && styles.closed]}
                >
                  <Txt variant="label" tone="muted">
                    {i + 1}
                  </Txt>
                  <DjPortrait dj={r} size={54} locked={!isOpen} />
                  <Txt variant="data" tone={count > 0 ? 'brand' : 'muted'}>
                    {isOpen ? `${count}/${BADGES.length}` : ' '}
                  </Txt>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.stages}>
            {STAGES.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  playUi('select')
                  setStage(s.id)
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: s.id === stage }}
                style={[styles.stage, s.id === stage && styles.selected]}
              >
                <View style={styles.preview}>
                  <StagePreview stage={s} width={104} height={44} />
                </View>
                <Txt variant="data" numberOfLines={1}>
                  {s.name}
                </Txt>
              </Pressable>
            ))}
          </View>
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
  body: { flex: 1, flexDirection: 'row', gap: space.lg },
  hero: {
    width: 270,
    alignItems: 'center',
    gap: 2,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badgeList: { alignSelf: 'stretch', gap: 3, marginTop: space.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  right: { flex: 1, gap: space.md, justifyContent: 'center' },
  // Cinco por fila: los diez rivales en dos filas.
  ladder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 5 * 84 + 4 * space.sm,
  },
  rung: {
    width: 84,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  closed: { opacity: 0.6 },
  selected: { borderColor: palette.brand },
  stages: { flexDirection: 'row', gap: space.sm },
  stage: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  preview: { borderRadius: radius.sm, overflow: 'hidden' },
})
