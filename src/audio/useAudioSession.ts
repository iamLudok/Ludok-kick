import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { POWER } from '../game/constants'
import type { Bar, Judge, PowerKind } from '../game/types'
import type { ClockSource } from './clock'
import { getEngine, holdEngine, releaseEngine } from './engine'
import type { Pattern } from './patterns'
import { startSequencer, type Sequencer } from './sequencer'
import { chargedSfx, goalSfx, hitSfx, powerSfx } from './synth'

export type AudioSession = {
  /** El reloj de audio, legible desde el hilo del juego. null hasta que arranca. */
  source: SharedValue<ClockSource | null>
  /** Los últimos compases programados, con su tempo. Vacío hasta que arranca. */
  bars: SharedValue<Bar[]>
  /** Lo que el propio móvil dice que tarda su salida de audio; 0 si no lo sabe. */
  deviceLatencyMs: number
  playHit: (judge: Judge) => void
  playGoal: () => void
  /** Prepara el drop a partir de `from` (reloj de audio) y devuelve cuándo cae; -1 si no suena. */
  drop: (from: number) => number
  /** La canción vuelve a la intro (nuevo partido). */
  restart: () => void
  /** Suena el poder lanzado; con Low-pass, además, la música se amortigua. */
  playPower: (kind: PowerKind) => void
  playCharged: () => void
}

/**
 * Pone música mientras la pantalla que lo usa esté abierta y la app en primer
 * plano. Al salir a otra app se congela todo (música y reloj) y al volver
 * sigue por el mismo compás.
 *
 * `bpm` puede ser un número fijo o una función a la que se pregunta el tempo
 * al empezar cada compás.
 */
export function useAudioSession(
  pattern: Pattern,
  bpm: number | (() => number),
  volume: { music: number; sfx: number },
): AudioSession {
  const source = useSharedValue<ClockSource | null>(null)
  const bars = useSharedValue<Bar[]>([])
  const [deviceLatencyMs, setDeviceLatencyMs] = useState(0)
  const seqRef = useRef<Sequencer | null>(null)
  // La función de tempo puede cambiar entre renders; el secuenciador siempre
  // pregunta a la última.
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm

  useEffect(() => {
    const e = getEngine()
    let mounted = true
    let wanted = false
    let probe: ReturnType<typeof setTimeout> | null = null
    // Si esta pantalla sujeta ahora mismo el audio: sujetar y soltar tienen
    // que ir a pares, o el contador del motor se descuadra.
    let holding = false
    const hold = () => {
      if (holding) return Promise.resolve()
      holding = true
      return holdEngine()
    }
    const release = () => {
      if (!holding) return
      holding = false
      void releaseEngine()
    }

    const run = async () => {
      wanted = true
      await hold()
      // Mientras se encendía el audio pueden haber cerrado la pantalla o
      // mandado la app a segundo plano.
      if (!mounted || !wanted) return
      if (seqRef.current) {
        seqRef.current.resume()
      } else {
        seqRef.current = startSequencer(e, pattern, {
          bpm: () => {
            const b = bpmRef.current
            return typeof b === 'number' ? b : b()
          },
          onBars: (next) => {
            bars.value = next
          },
        })
        source.value = e.ctx.context
      }
      // La latencia solo se puede preguntar con el audio ya sonando.
      probe = setTimeout(() => {
        if (mounted) setDeviceLatencyMs(Math.round(e.ctx.outputLatency * 1000))
      }, 800)
    }

    const pause = () => {
      wanted = false
      seqRef.current?.pause()
      release()
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
      seqRef.current?.stop()
      seqRef.current = null
      bars.value = []
      release()
    }
    // La base de una pantalla no cambia mientras está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const e = getEngine()
    e.music.gain.value = 0.8 * volume.music
    e.sfx.gain.value = 0.9 * volume.sfx
  }, [volume.music, volume.sfx])

  const playHit = useCallback((judge: Judge) => hitSfx(getEngine(), judge), [])
  const playGoal = useCallback(() => goalSfx(getEngine()), [])
  const drop = useCallback((from: number) => seqRef.current?.drop(from) ?? -1, [])
  const restart = useCallback(() => seqRef.current?.restart(), [])
  const playPower = useCallback((kind: PowerKind) => {
    powerSfx(getEngine(), kind)
    if (kind === 'lowpass') seqRef.current?.muffle(POWER.LOWPASS_TIME)
  }, [])
  const playCharged = useCallback(() => chargedSfx(getEngine()), [])

  return { source, bars, deviceLatencyMs, playHit, playGoal, drop, restart, playPower, playCharged }
}
