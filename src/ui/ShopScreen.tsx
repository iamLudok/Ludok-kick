import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STATS, UPGRADE, upgradeCost, type Stat } from '../game/upgrades'
import { useSettings } from '../hooks/useSettings'
import { buyUpgrade, levelsOf } from '../lib/progress'
import { Button } from './Button'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

const NAME: Record<Stat, string> = { speed: 'Velocidad', kick: 'Tiro', jump: 'Salto', dash: 'Dash', power: 'Power' }
const HINT: Record<Stat, string> = {
  speed: 'corres más rápido',
  kick: 'chutas más fuerte',
  jump: 'saltas más alto',
  dash: 'el dash llega más lejos',
  power: 'la barra se llena antes',
}

/** La tienda: tus cinco estadísticas, que valen para cualquier DJ. */
export function ShopScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings } = useSettings()
  const levels = levelsOf(settings)

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
          Tienda
        </Txt>
        <View style={styles.coins}>
          <View style={styles.coin} />
          <Txt variant="title">{settings.coins}</Txt>
        </View>
      </View>
      <Txt variant="data" tone="muted">
        Las mejoras son tuyas y valen con cualquier DJ. Las monedas se ganan en cada partido: más ganando, y más aún
        contra los rivales de arriba de la escalera.
      </Txt>

      <View style={styles.list}>
        {STATS.map((stat) => {
          const level = levels[stat]
          const maxed = level >= UPGRADE.MAX_LEVEL
          const cost = upgradeCost(level)
          const affordable = settings.coins >= cost
          return (
            <View key={stat} style={styles.row}>
              <View style={styles.name}>
                <Txt variant="body">{NAME[stat]}</Txt>
                <Txt variant="data" tone="muted">
                  {HINT[stat]}
                </Txt>
              </View>
              <View style={styles.pips}>
                {Array.from({ length: UPGRADE.MAX_LEVEL }, (_, i) => (
                  <View key={i} style={[styles.pip, i < level && styles.pipOn]} />
                ))}
              </View>
              <Button
                title={maxed ? 'Al máximo' : `Mejorar · ${cost}`}
                kind={maxed || !affordable ? 'secondary' : 'primary'}
                onPress={() => {
                  if (!maxed && affordable) void buyUpgrade(stat)
                }}
                style={[styles.buy, (maxed || !affordable) && styles.off]}
              />
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  grow: { flex: 1 },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  coins: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coin: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: '#ffd84a',
    borderWidth: 2,
    borderColor: '#b98f2e',
  },
  list: { gap: space.sm, marginTop: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
  },
  name: { width: 200 },
  pips: { flex: 1, flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 12, borderRadius: 3, backgroundColor: palette.line },
  pipOn: { backgroundColor: palette.brand },
  buy: { minWidth: 160, minHeight: 40, paddingVertical: space.xs },
  off: { opacity: 0.5 },
})
