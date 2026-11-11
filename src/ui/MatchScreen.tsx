import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Pressable, StyleSheet, View, type AppStateStatus, type LayoutChangeEvent } from 'react-native'
import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia'
import { useKeepAwake } from 'expo-keep-awake'
import { useRouter } from 'expo-router'
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { createAudioClock, readAudioClock, type AudioClock } from '../audio/clock'
import { PROTOTYPE_PATTERN } from '../audio/patterns'
import { useAudioSession } from '../audio/useAudioSession'
import { beatPhase } from '../game/beat'
import { BEAT, DEBUG, MATCH } from '../game/constants'
import { createInitialState, emptyInput } from '../game/state'
import { stepGame, type BeatInput } from '../game/step'
import type { GameState, InputFrame, Phase } from '../game/types'
import { useSettings } from '../hooks/useSettings'
import { effectiveOffsetMs } from '../lib/settings'
import { FX_LIFE, createPainter, drawFrame, type BeatView } from '../render/draw'
import { PROTOTYPE_STAGE } from '../render/stage'
import { Button } from './Button'
import { Txt } from './Text'
import { TouchControls } from './TouchControls'
import { palette, radius, space } from './theme'

/** Lo que el marcador necesita saber del partido. Solo cambia unas pocas veces por minuto. */
type HudData = {
  score0: number
  score1: number
  seconds: number
  phase: Phase
  golden: boolean
}

const INITIAL_HUD: HudData = { score0: 0, score1: 0, seconds: MATCH.DURATION, phase: 'kickoff', golden: false }

/**
 * Lo que vive en el hilo de UI mientras dura un partido. Se crea allí mismo,
 * en el primer frame, y no en JavaScript: un objeto creado en JS llega al hilo
 * de UI como copia, y el juego necesita mutar el original 120 veces por segundo.
 */
type Runtime = {
  game: GameState
  hud: HudData
  clock: AudioClock
  beatIn: BeatInput
  beatView: BeatView
  perfTime: number
  perfFrames: number
  perfWork: number
}

// El rival aún no tiene quién lo mueva: se queda quieto hasta que llegue la IA.
const RIVAL_IDLE = emptyInput()

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function MatchScreen() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const insets = useSafeAreaInsets()
  useKeepAwake()

  // Se mide la vista en vez de preguntar el tamaño de la ventana: según el
  // móvil, la ventana cuenta o no la zona de la cámara, y el campo tiene que
  // encajar en lo que de verdad se pinta.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
  }, [])

  return (
    <View style={styles.root} onLayout={onLayout}>
      {size && (
        <Match
          key={`${size.width}x${size.height}`}
          width={size.width}
          height={size.height}
          insetX={Math.max(insets.left, insets.right)}
        />
      )}
    </View>
  )
}

function Match({ width, height, insetX }: { width: number; height: number; insetX: number }) {
  const router = useRouter()
  const painter = useMemo(() => createPainter(width, height, insetX, PROTOTYPE_STAGE), [width, height, insetX])
  const runtime = useSharedValue<Runtime | null>(null)
  const input = useSharedValue<InputFrame>(emptyInput())
  const picture = useSharedValue<SkPicture>(painter.blank)
  const [hud, setHud] = useState<HudData>(INITIAL_HUD)
  const [perf, setPerf] = useState('')

  const { data: settings } = useSettings()
  const audio = useAudioSession(PROTOTYPE_PATTERN, BEAT.BPM, { music: settings.musicVolume, sfx: settings.sfxVolume })
  const { source, grid, playHit, playGoal } = audio

  // El desfase calibrado viaja al hilo de UI en un valor compartido: cambia
  // como mucho una vez por partido, pero se lee en cada frame.
  const offsetMs = useSharedValue<number>(BEAT.DEFAULT_OFFSET_MS)
  const effectiveOffset = effectiveOffsetMs(settings, audio.deviceLatencyMs)
  useEffect(() => {
    offsetMs.value = effectiveOffset
  }, [effectiveOffset, offsetMs])

  // Con `useCallback` la función es la misma entre renders. Sin él, cada vez
  // que cambia el marcador (una vez por segundo, con el reloj) React crea otra
  // y el bucle se vuelve a registrar en el hilo de UI con todos sus pinceles.
  const onFrame = useCallback(
    (frame: FrameInfo) => {
      'worklet'
      const started = performance.now()
      let rt = runtime.value
      if (!rt) {
        rt = {
          game: createInitialState(),
          hud: { score0: -1, score1: -1, seconds: -1, phase: 'kickoff', golden: false },
          clock: createAudioClock(),
          beatIn: { time: 0, t0: 0, bpm: BEAT.BPM },
          beatView: { phase: -1, fx: [] },
          perfTime: 0,
          perfFrames: 0,
          perfWork: 0,
        }
        runtime.value = rt
      }
      const s = rt.game
      const dt = (frame.timeSincePreviousFrame ?? 1000 / 60) / 1000
      const touch = input.value

      // El ritmo sale del reloj de audio y de ningún otro sitio. «Ahora» es lo
      // que el jugador está oyendo: la hora del audio menos lo que tarda el
      // sonido en llegarle, que es el desfase calibrado.
      const src = source.value
      const g = grid.value
      const view = rt.beatView
      let beat: BeatInput | undefined
      if (src && g) {
        const heard = readAudioClock(src, rt.clock) - offsetMs.value / 1000
        beat = rt.beatIn
        beat.time = heard
        beat.t0 = g.t0
        beat.bpm = g.bpm
        // Antes del primer bombo todavía no hay nada que marcar.
        view.phase = heard >= g.t0 ? beatPhase(heard, g.t0, g.bpm) : -1
      } else {
        view.phase = -1
      }

      stepGame(s, touch, RIVAL_IDLE, dt, beat)

      for (let i = view.fx.length - 1; i >= 0; i--) {
        view.fx[i].age += dt
        if (view.fx[i].age >= FX_LIFE) view.fx.splice(i, 1)
      }
      for (let i = 0; i < s.events.length; i++) {
        const ev = s.events[i]
        if (ev.type === 'kick' || ev.type === 'head') {
          scheduleOnRN(playHit, ev.judge)
          if (ev.judge > 0) view.fx.push({ judge: ev.judge, x: ev.x, y: ev.y, age: 0 })
        } else if (ev.type === 'goal') {
          scheduleOnRN(playGoal)
        }
      }

      const live = s.phase !== 'ended'
      picture.value = createPicture((canvas) => {
        'worklet'
        drawFrame(canvas, s, painter, touch, live, view)
      }, painter.bounds)

      // El marcador es React normal y corriente: solo se le avisa cuando cambia
      // algo que enseña, no en cada frame.
      const seconds = Math.ceil(s.timeLeft)
      const h = rt.hud
      if (
        h.score0 !== s.score[0] ||
        h.score1 !== s.score[1] ||
        h.seconds !== seconds ||
        h.phase !== s.phase ||
        h.golden !== s.golden
      ) {
        rt.hud = { score0: s.score[0], score1: s.score[1], seconds, phase: s.phase, golden: s.golden }
        scheduleOnRN(setHud, rt.hud)
      }

      if (DEBUG.OVERLAY) {
        rt.perfTime += dt
        rt.perfFrames += 1
        rt.perfWork += performance.now() - started
        if (rt.perfTime >= 0.5) {
          const fps = Math.round(rt.perfFrames / rt.perfTime)
          const work = (rt.perfWork / rt.perfFrames).toFixed(1)
          const sound = src && g ? `audio ${Math.round(offsetMs.value)} ms` : 'sin audio'
          scheduleOnRN(setPerf, `${fps} fps · ${work} ms · ${sound}`)
          rt.perfTime = 0
          rt.perfFrames = 0
          rt.perfWork = 0
        }
      }
    },
    [grid, input, offsetMs, painter, picture, playGoal, playHit, runtime, source],
  )
  const loop = useFrameCallback(onFrame)

  // Con la app en segundo plano el bucle se para. Android no lo hace solo: el
  // partido seguía corriendo sin nadie delante (el reloj avanzaba y el rival
  // podía marcar) y la app se comía la batería pintando a una pantalla que ya
  // no existe.
  useEffect(() => {
    const apply = (state: AppStateStatus) => loop.setActive(state === 'active')
    apply(AppState.currentState)
    const sub = AppState.addEventListener('change', apply)
    return () => sub.remove()
  }, [loop])

  const restart = useCallback(() => {
    // Basta con tirar el estado: el siguiente frame crea un partido nuevo.
    runtime.value = null
  }, [runtime])

  const ended = hud.phase === 'ended'

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>

      {!ended && <TouchControls layout={painter.controls} width={width} input={input} />}

      <View style={styles.hud} pointerEvents="none">
        <View style={styles.scoreboard}>
          <Txt variant="score" style={{ color: PROTOTYPE_STAGE.players[0] }}>
            {hud.score0}
          </Txt>
          <Txt variant={hud.golden ? 'label' : 'score'} tone={hud.golden ? 'brand' : 'fg'} style={styles.clock}>
            {hud.golden ? 'Gol de oro' : clock(hud.seconds)}
          </Txt>
          <Txt variant="score" style={{ color: PROTOTYPE_STAGE.players[1] }}>
            {hud.score1}
          </Txt>
        </View>
        {hud.phase === 'goal' && (
          <Txt variant="banner" style={styles.banner}>
            ¡GOL!
          </Txt>
        )}
      </View>

      {DEBUG.OVERLAY && (
        <View style={[styles.perf, { left: insetX + space.sm }]} pointerEvents="none">
          <Txt variant="data" tone="muted">
            {perf}
          </Txt>
        </View>
      )}

      {!ended && (
        // Va después de la capa táctil y con fondo propio: así el toque se lo
        // queda este botón y no cuenta como «saltar».
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={space.md}
          style={[styles.exit, { right: insetX + space.sm }]}
        >
          <Txt variant="label" tone="muted">
            Salir
          </Txt>
        </Pressable>
      )}

      {ended && (
        <View style={styles.end}>
          <Txt variant="label" tone="muted">
            Fin del partido
          </Txt>
          <Txt variant="banner">
            {hud.score0} – {hud.score1}
          </Txt>
          <View style={styles.endButtons}>
            <Button title="Menú" kind="secondary" onPress={() => router.back()} />
            <Button title="Otra vez" onPress={restart} />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  hud: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  scoreboard: {
    marginTop: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
  },
  // Ancho fijo: si no, el marcador se ensancha y encoge cada vez que cambia el reloj.
  clock: { minWidth: 88, textAlign: 'center' },
  banner: { marginTop: space.xxl },
  perf: { position: 'absolute', top: space.xs },
  exit: {
    position: 'absolute',
    top: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
  },
  end: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  endButtons: { flexDirection: 'row', gap: space.md },
})
