import { useCallback, useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import type { Judge } from '../game/types'
import type { ClockSource } from './clock'
import { getEngine, setEngineRunning } from './engine'
import type { Pattern } from './patterns'
import { startSequencer, type Sequencer } from './sequencer'
import { goalSfx, hitSfx } from './synth'

/** Dónde caen los beats de lo que está sonando. */
export type BeatGrid = { t0: number; bpm: number }

export type AudioSession = {
  /** El reloj de audio, legible desde el hilo del juego. null hasta que arranca. */
  source: SharedValue<ClockSource | null>
  grid: SharedValue<BeatGrid | null>
  /** Lo que el propio móvil dice que tarda su salida de audio; 0 si no lo sabe. */
  deviceLatencyMs: number
  playHit: (judge: Judge) => void
  playGoal: () => void
}

/**
 * Pone música mientras la pantalla que lo usa esté abierta y la app en primer
 * plano. Al salir a otra app se congela todo (música y reloj) y al volver
 * sigue por el mismo compás.
 */
export function useAudioSession(pattern: Pattern, bpm: number, volume: { music: number; sfx: number }): AudioSession {
  const source = useSharedValue<ClockSource | null>(null)
  const grid = useSharedValue<BeatGrid | null>(null)
  const [deviceLatencyMs, setDeviceLatencyMs] = useState(0)

  useEffect(() => {
    const e = getEngine()
    let seq: Sequencer | null = null
    let mounted = true
    let wanted = false
    let probe: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      wanted = true
      await setEngineRunning(true)
      // Mientras se encendía el audio pueden haber cerrado la pantalla o
      // mandado la app a segundo plano.
      if (!mounted || !wanted) return
      if (seq) {
        seq.resume()
      } else {
        seq = startSequencer(e, pattern, bpm)
        source.value = e.ctx.context
        grid.value = { t0: seq.t0, bpm }
      }
      // La latencia solo se puede preguntar con el audio ya sonando.
      probe = setTimeout(() => {
        if (mounted) setDeviceLatencyMs(Math.round(e.ctx.outputLatency * 1000))
      }, 800)
    }

    const pause = () => {
      wanted = false
      seq?.pause()
      void setEngineRunning(false)
    }

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void run()
      else pause()
    }
    onAppState(AppState.currentState)
    const sub = AppState.addEventListener('change', onAppState)

    return () => {
      mounted = false
      wanted = false
      sub.remove()
      if (probe) clearTimeout(probe)
      seq?.stop()
      grid.value = null
      void setEngineRunning(false)
    }
    // La base y el tempo de una pantalla no cambian mientras está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const e = getEngine()
    e.music.gain.value = 0.8 * volume.music
    e.sfx.gain.value = 0.9 * volume.sfx
  }, [volume.music, volume.sfx])

  const playHit = useCallback((judge: Judge) => hitSfx(getEngine(), judge), [])
  const playGoal = useCallback(() => goalSfx(getEngine()), [])

  return { source, grid, deviceLatencyMs, playHit, playGoal }
}
