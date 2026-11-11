import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AppState, ScrollView, StyleSheet, View, type AppStateStatus } from 'react-native'
import { useRouter } from 'expo-router'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { createAudioClock, readAudioClock, type AudioClock } from '../audio/clock'
import { METRONOME_PATTERN } from '../audio/patterns'
import { useAudioSession } from '../audio/useAudioSession'
import { beatDelta, beatPhase } from '../game/beat'
import { BEAT, CALIBRATION } from '../game/constants'
import { useSettings } from '../hooks/useSettings'
import { importBackup, pickJsonFile, shareBackup } from '../lib/backup'
import { clearAudioOffset, effectiveOffsetMs, saveAudioOffset } from '../lib/settings'
import { Button } from './Button'
import { Txt } from './Text'
import { palette, radius, space } from './theme'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function formatDate(ms: number): string {
  if (!ms) return 'nunca'
  const d = new Date(ms)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: settings } = useSettings()
  const audio = useAudioSession(METRONOME_PATTERN, CALIBRATION.BPM, {
    music: settings.musicVolume,
    sfx: settings.sfxVolume,
  })
  const { source, grid } = audio

  const calibrated = settings.audioOffsetMs !== undefined
  const offset = effectiveOffsetMs(settings, audio.deviceLatencyMs)
  const offsetMs = useSharedValue<number>(offset)
  useEffect(() => {
    offsetMs.value = offset
  }, [offset, offsetMs])

  const [taps, setTaps] = useState<number[]>([])
  const addTap = useCallback((deltaMs: number) => {
    setTaps((prev) => [...prev, deltaMs].slice(-CALIBRATION.TAPS_KEPT))
  }, [])

  /* --- El reloj y el destello, en el hilo de UI --------------------------- */

  const clock = useSharedValue<AudioClock | null>(null)
  // Diferencia entre el reloj de audio y el del sistema, para poder fechar un
  // toque en el instante en que llega y no en el del frame siguiente.
  const clockOffset = useSharedValue<number | null>(null)
  const pulse = useSharedValue(0)

  const onFrame = useCallback(() => {
    'worklet'
    const src = source.value
    const g = grid.value
    if (!src || !g) {
      pulse.value = 0
      clockOffset.value = null
      return
    }
    let c = clock.value
    if (!c) {
      c = createAudioClock()
      clock.value = c
    }
    const now = readAudioClock(src, c)
    clockOffset.value = c.offset
    // El destello usa el desfase guardado: si está bien calibrado, se ve
    // exactamente cuando se oye el bombo. Es la forma de comprobarlo a ojo.
    const heard = now - offsetMs.value / 1000
    pulse.value = heard >= g.t0 ? Math.exp(-beatPhase(heard, g.t0, g.bpm) * 6) : 0
  }, [clock, clockOffset, grid, offsetMs, pulse, source])
  const loop = useFrameCallback(onFrame)

  useEffect(() => {
    const apply = (state: AppStateStatus) => loop.setActive(state === 'active')
    apply(AppState.currentState)
    const sub = AppState.addEventListener('change', apply)
    return () => sub.remove()
  }, [loop])

  const tap = useMemo(
    () =>
      Gesture.Manual()
        .onTouchesDown((_e, manager) => {
          'worklet'
          manager.activate()
          const g = grid.value
          const diff = clockOffset.value
          if (!g || diff === null) return
          // Se mide contra el beat tal como se PROGRAMÓ, sin desfase: lo que
          // sale es justo el desfase que hay que guardar.
          const at = performance.now() / 1000 + diff
          if (at < g.t0) return
          let delta = beatDelta(at, g.t0, g.bpm) * 1000
          // Un toque nunca llega mucho antes que el sonido: si «se adelanta»
          // más que esto, en realidad va tarde respecto al beat anterior.
          if (delta < -CALIBRATION.MAX_EARLY_MS) delta += 60000 / g.bpm
          scheduleOnRN(addTap, delta)
        })
        .onTouchesUp((_e, manager) => {
          'worklet'
          manager.end()
        })
        .onTouchesCancelled((_e, manager) => {
          'worklet'
          manager.end()
        }),
    [addTap, clockOffset, grid],
  )

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * pulse.value,
    transform: [{ scale: 1 + 0.18 * pulse.value }],
  }))

  /* --- Acciones ---------------------------------------------------------- */

  const enough = taps.length >= CALIBRATION.MIN_TAPS
  const measured = enough ? Math.round(median(taps)) : null

  const save = useCallback(async () => {
    if (measured === null) return
    await saveAudioOffset(measured)
    setTaps([])
  }, [measured])

  const nudge = useCallback((by: number) => void saveAudioOffset(offset + by), [offset])

  const reset = useCallback(async () => {
    await clearAudioOffset()
    setTaps([])
  }, [])

  const exportCopy = useCallback(async () => {
    try {
      await shareBackup()
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Error desconocido.')
    }
  }, [])

  const importCopy = useCallback(async () => {
    try {
      const raw = await pickJsonFile()
      if (raw === null) return
      Alert.alert('Importar copia', 'El historial de partidos de este móvil se sustituirá por el de la copia.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await importBackup(raw, 'replace')
              Alert.alert('Copia importada', `Partidos restaurados: ${result.matches}.`)
            } catch (e) {
              Alert.alert('No se pudo importar', e instanceof Error ? e.message : 'Error desconocido.')
            }
          },
        },
      ])
    } catch (e) {
      Alert.alert('No se pudo abrir el fichero', e instanceof Error ? e.message : 'Error desconocido.')
    }
  }, [])

  const status = calibrated
    ? `Calibrado: ${offset} ms`
    : audio.deviceLatencyMs > 0
      ? `Sin calibrar · el móvil indica ${offset} ms`
      : `Sin calibrar · se usan ${offset} ms`

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: Math.max(insets.left, space.lg), paddingRight: Math.max(insets.right, space.lg) },
      ]}
    >
      <View style={styles.header}>
        <Button title="Volver" kind="secondary" onPress={() => router.back()} style={styles.small} />
        <Txt variant="title">Ajustes</Txt>
      </View>

      <ScrollView contentContainerStyle={styles.columns} horizontal={false}>
        <View style={styles.card}>
          <Txt variant="label" tone="brand">
            Calibrar el audio
          </Txt>
          <Txt variant="body" tone="muted">
            Toca el círculo al ritmo del bombo. Si juegas con auriculares Bluetooth, calibra con ellos puestos.
          </Txt>

          <View style={styles.calibration}>
            <GestureDetector gesture={tap}>
              <View style={styles.pad} collapsable={false}>
                <Animated.View style={[styles.dot, dotStyle]} />
              </View>
            </GestureDetector>

            <View style={styles.readout}>
              <Txt variant="body">{status}</Txt>
              <Txt variant="data" tone="muted">
                {measured !== null
                  ? `${taps.length} toques · medido ${measured} ms`
                  : `${taps.length} de ${CALIBRATION.MIN_TAPS} toques`}
              </Txt>
              {measured !== null && <Button title={`Guardar ${measured} ms`} onPress={save} style={styles.small} />}
              <View style={styles.row}>
                <Button title="−5" kind="secondary" onPress={() => nudge(-CALIBRATION.NUDGE_MS)} style={styles.tiny} />
                <Button title="+5" kind="secondary" onPress={() => nudge(CALIBRATION.NUDGE_MS)} style={styles.tiny} />
                {calibrated && <Button title="Restablecer" kind="secondary" onPress={reset} style={styles.small} />}
              </View>
            </View>
          </View>
          <Txt variant="data" tone="muted">
            El círculo destella con el desfase guardado: bien calibrado, se ve justo cuando suena. Máximo ±
            {BEAT.MAX_OFFSET_MS} ms.
          </Txt>
        </View>

        <View style={styles.card}>
          <Txt variant="label" tone="brand">
            Copia de seguridad
          </Txt>
          <Txt variant="body" tone="muted">
            Guarda tus ajustes y tu historial de partidos en un fichero que puedes llevarte a donde quieras.
          </Txt>
          <Txt variant="data" tone="muted">
            Última copia: {formatDate(settings.lastBackup)}
          </Txt>
          <View style={styles.row}>
            <Button title="Exportar" onPress={exportCopy} style={styles.small} />
            <Button title="Importar" kind="secondary" onPress={importCopy} style={styles.small} />
          </View>
          <Txt variant="data" tone="muted">
            La calibración de audio no viaja en la copia: es propia de cada móvil y de cada auricular.
          </Txt>
        </View>
      </ScrollView>
    </View>
  )
}

const PAD = 132

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingTop: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.md },
  columns: { flexDirection: 'row', gap: space.lg, paddingBottom: space.lg, alignItems: 'flex-start' },
  card: {
    flex: 1,
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  calibration: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  pad: {
    width: PAD,
    height: PAD,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: PAD * 0.6, height: PAD * 0.6, borderRadius: radius.pill, backgroundColor: palette.brand },
  readout: { flex: 1, gap: space.sm, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  small: { minWidth: 0, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  tiny: { minWidth: 56, minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.md },
})
