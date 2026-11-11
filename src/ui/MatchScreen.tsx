import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Pressable, StyleSheet, View, type AppStateStatus, type LayoutChangeEvent } from 'react-native'
import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia'
import { useKeepAwake } from 'expo-keep-awake'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { createAudioClock, readAudioClock, type AudioClock } from '../audio/clock'
import { useAudioSession } from '../audio/useAudioSession'
import { createAi, stepAi, type AiState } from '../game/ai'
import { barAt, beatPhase, tempoAt } from '../game/beat'
import { BEAT, MATCH } from '../game/constants'
import { createInitialState, emptyInput } from '../game/state'
import { stepGame, type BeatInput } from '../game/step'
import type { GameState, InputFrame, Phase } from '../game/types'
import { addMatch } from '../lib/matches'
import { useSettings } from '../hooks/useSettings'
import { effectiveOffsetMs, updateSettings } from '../lib/settings'
import { burst, confetti, createPool, PC, updateParticles } from '../render/particles'
import { FX_LIFE, SHOCK_LIFE, createPainter, drawFrame, judgeLabel, powerLabel, type BeatView } from '../render/draw'
import { getDj } from '../content/djs'
import { readSetup, resultParams, setupParams, type MatchResult, type MatchSetup } from '../content/setup'
import { getStage } from '../content/stages'
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
  /** Tempo del compás que suena; 0 sin música. */
  bpm: number
  /** Energía de cada uno (0–1); llena es que tiene un poder listo. */
  energy0: number
  energy1: number
}

const INITIAL_HUD: HudData = {
  score0: 0,
  score1: 0,
  seconds: MATCH.DURATION,
  phase: 'kickoff',
  golden: false,
  bpm: 0,
  energy0: 0,
  energy1: 0,
}

/** El drop que ha preparado la música para el gol número `goal` del partido. */
type DropInfo = { goal: number; at: number }

/**
 * Lo que vive en el hilo de UI mientras dura un partido. Se crea allí mismo,
 * en el primer frame, y no en JavaScript: un objeto creado en JS llega al hilo
 * de UI como copia, y el juego necesita mutar el original 120 veces por segundo.
 */
type Runtime = {
  game: GameState
  ai: AiState
  /** Remates a tiempo y poderes del jugador, para el resultado. */
  perfects: number
  goods: number
  powers: number
  saved: boolean
  hud: HudData
  clock: AudioClock
  beatIn: BeatInput
  beatView: BeatView
  perfTime: number
  perfFrames: number
  perfWork: number
}

/** Lo que se guarda en el historial al acabar. */
/** Cuánto se espera, con el marcador final a la vista, antes de pasar al resultado. */
const END_PAUSE_MS = 1400

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function MatchScreen() {
  const params = useLocalSearchParams()
  // Se lee una sola vez: si el rival saliera al azar en cada render, cambiaría
  // a mitad de partido.
  const [setup] = useState(() => readSetup(params))
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
          setup={setup}
        />
      )}
    </View>
  )
}

function Match({ width, height, insetX, setup }: { width: number; height: number; insetX: number; setup: MatchSetup }) {
  const router = useRouter()
  const level = setup.level
  const stage = getStage(setup.stage)
  const me = getDj(setup.dj)
  const rivalDj = getDj(setup.rival)
  // La semilla del rival: cada partido, uno distinto. Se decide en JavaScript
  // porque en el hilo de UI la IA no usa Math.random (ver `ai.ts`).
  const seed = useSharedValue(Math.floor(Math.random() * 2 ** 31))
  const painter = useMemo(
    () => createPainter(width, height, insetX, stage, [me.look, rivalDj.look]),
    [width, height, insetX, stage, me, rivalDj],
  )
  const runtime = useSharedValue<Runtime | null>(null)
  const input = useSharedValue<InputFrame>(emptyInput())
  const picture = useSharedValue<SkPicture>(painter.blank)
  const [hud, setHud] = useState<HudData>(INITIAL_HUD)
  const [perf, setPerf] = useState('')
  // El overlay de rendimiento se enciende en Ajustes; el bucle lo consulta en
  // cada frame, así que viaja al hilo de UI en un valor compartido.
  const showPerf = useSharedValue(false)

  const { data: settings } = useSettings()
  // Lo avanzado del partido (0–1). Lo escribe el bucle del juego y lo lee la
  // música al empezar cada compás para decidir su tempo.
  const progress = useSharedValue(0)
  const tempo = useCallback(() => tempoAt(progress.value), [progress])
  const audio = useAudioSession(stage.pattern, tempo, { music: settings.musicVolume, sfx: settings.sfxVolume })
  const { source, bars, playHit, playGoal, playPower, playCharged, drop: prepareDrop } = audio
  const dropInfo = useSharedValue<DropInfo>({ goal: -1, at: -1 })

  // Al marcar, la música decide cuándo cae el drop (en un beat) y se lo dice
  // al juego, que se queda congelado hasta entonces.
  const onGoal = useCallback(
    (goal: number, at: number) => {
      playGoal()
      if (at < 0) return
      dropInfo.value = { goal, at: prepareDrop(at + MATCH.MIN_FREEZE) }
    },
    [dropInfo, playGoal, prepareDrop],
  )

  // El desfase calibrado viaja al hilo de UI en un valor compartido: cambia
  // como mucho una vez por partido, pero se lee en cada frame.
  const offsetMs = useSharedValue<number>(BEAT.DEFAULT_OFFSET_MS)
  const effectiveOffset = effectiveOffsetMs(settings, audio.deviceLatencyMs)
  useEffect(() => {
    showPerf.value = settings.showPerf === true
  }, [settings.showPerf, showPerf])

  useEffect(() => {
    offsetMs.value = effectiveOffset
  }, [effectiveOffset, offsetMs])

  const onEnded = useCallback(
    (r: MatchResult) => {
      // Un fallo al guardar no debe impedir ver el resultado: el partido ya se
      // jugó, y lo peor que pasa es que no sale en el historial.
      addMatch({
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goldenGoal: r.golden,
        perfects: r.perfects,
        goods: r.goods,
        level,
        dj: setup.dj,
        rivalDj: setup.rival,
        stage: setup.stage,
      }).catch(() => undefined)
      // Un momento con el marcador final a la vista y luego al resultado. Con
      // `replace`, «atrás» desde el resultado no vuelve a un partido acabado.
      setTimeout(() => {
        router.replace({ pathname: '/resultado', params: { ...setupParams(setup), ...resultParams(r) } })
      }, END_PAUSE_MS)
    },
    [level, router, setup],
  )

  useEffect(() => {
    updateSettings({ lastLevel: level, lastDj: setup.dj, lastStage: setup.stage }).catch(() => undefined)
  }, [level, setup])

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
          // La misma semilla que el rival: cada partido reparte poderes distintos.
          game: createInitialState(me.stats, rivalDj.stats, seed.value),
          ai: createAi(level, seed.value),
          perfects: 0,
          goods: 0,
          powers: 0,
          saved: false,
          hud: {
            score0: -1,
            score1: -1,
            seconds: -1,
            phase: 'kickoff',
            golden: false,
            bpm: -1,
            energy0: -1,
            energy1: -1,
          },
          clock: createAudioClock(),
          beatIn: { time: 0, t0: 0, bpm: BEAT.BPM_START, dropAt: -1 },
          beatView: { phase: -1, fx: [], shock: { x: 0, y: 0, age: -1 }, particles: createPool() },
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
      const view = rt.beatView
      let beat: BeatInput | undefined
      view.phase = -1
      if (src) {
        const heard = readAudioClock(src, rt.clock) - offsetMs.value / 1000
        // El compás que se está oyendo. Antes del primer bombo no hay ninguno, y
        // el juego va a su velocidad normal y sin remate al ritmo.
        const bar = barAt(bars.value, heard)
        if (bar) {
          beat = rt.beatIn
          beat.time = heard
          beat.t0 = bar.t0
          beat.bpm = bar.bpm
          const d = dropInfo.value
          beat.dropAt = d.goal === s.score[0] + s.score[1] ? d.at : -1
          view.phase = beatPhase(heard, bar.t0, bar.bpm)
        }
      }

      const rival = stepAi(rt.ai, s, 1, dt)
      stepGame(s, touch, rival, dt, beat)

      if (view.shock.age >= 0) {
        view.shock.age += dt
        if (view.shock.age > SHOCK_LIFE) view.shock.age = -1
      }

      updateParticles(view.particles, dt)
      for (let i = view.fx.length - 1; i >= 0; i--) {
        view.fx[i].age += dt
        if (view.fx[i].age >= FX_LIFE) view.fx.splice(i, 1)
      }
      for (let i = 0; i < s.events.length; i++) {
        const ev = s.events[i]
        if (ev.type === 'kick' || ev.type === 'head') {
          scheduleOnRN(playHit, ev.judge)
          if (ev.side === 0 && ev.judge === 2) rt.perfects++
          if (ev.side === 0 && ev.judge === 1) rt.goods++
          if (ev.judge > 0) view.fx.push({ label: judgeLabel(ev.judge), x: ev.x, y: ev.y, age: 0 })
          if (ev.judge === 2) burst(view.particles, ev.x, ev.y, 14, 520, PC.PERFECT)
        } else if (ev.type === 'power') {
          if (ev.side === 0) rt.powers++
          scheduleOnRN(playPower, ev.kind)
          view.fx.push({ label: powerLabel(ev.kind), x: ev.x, y: ev.y, age: 0 })
        } else if (ev.type === 'charged') {
          // Solo se avisa de la barra propia: la del rival se ve en el marcador.
          if (ev.side === 0) scheduleOnRN(playCharged)
        } else if (ev.type === 'goal') {
          scheduleOnRN(onGoal, s.score[0] + s.score[1], ev.at)
          confetti(view.particles, ev.side, 70)
        } else if (ev.type === 'drop') {
          view.shock.x = ev.x
          view.shock.y = ev.y
          view.shock.age = 0
          burst(view.particles, ev.x, ev.y, 36, 900, PC.GLOW)
        }
      }

      const live = s.phase !== 'ended'
      if (!live && !rt.saved) {
        rt.saved = true
        scheduleOnRN(onEnded, {
          goalsFor: s.score[0],
          goalsAgainst: s.score[1],
          golden: s.golden,
          perfects: rt.perfects,
          goods: rt.goods,
          powers: rt.powers,
        })
      }
      picture.value = createPicture((canvas) => {
        'worklet'
        drawFrame(canvas, s, painter, touch, live, view)
      }, painter.bounds)

      // El marcador es React normal y corriente: solo se le avisa cuando cambia
      // algo que enseña, no en cada frame.
      const seconds = Math.ceil(s.timeLeft)
      const bpm = beat ? beat.bpm : 0
      const h = rt.hud
      if (
        h.score0 !== s.score[0] ||
        h.score1 !== s.score[1] ||
        h.seconds !== seconds ||
        h.phase !== s.phase ||
        h.golden !== s.golden ||
        h.bpm !== bpm ||
        h.energy0 !== s.players[0].energy ||
        h.energy1 !== s.players[1].energy
      ) {
        rt.hud = {
          score0: s.score[0],
          score1: s.score[1],
          seconds,
          phase: s.phase,
          golden: s.golden,
          bpm,
          energy0: s.players[0].energy,
          energy1: s.players[1].energy,
        }
        scheduleOnRN(setHud, rt.hud)
        progress.value = 1 - s.timeLeft / MATCH.DURATION
      }

      if (showPerf.value) {
        rt.perfTime += dt
        rt.perfFrames += 1
        rt.perfWork += performance.now() - started
        if (rt.perfTime >= 0.5) {
          const fps = Math.round(rt.perfFrames / rt.perfTime)
          const work = (rt.perfWork / rt.perfFrames).toFixed(1)
          const sound = beat ? `audio ${Math.round(offsetMs.value)} ms · ×${s.speed.toFixed(2)}` : 'sin audio'
          scheduleOnRN(setPerf, `${fps} fps · ${work} ms · ${sound}`)
          rt.perfTime = 0
          rt.perfFrames = 0
          rt.perfWork = 0
        }
      }
    },
    [
      bars,
      dropInfo,
      input,
      level,
      offsetMs,
      onEnded,
      onGoal,
      painter,
      picture,
      playCharged,
      playHit,
      playPower,
      progress,
      runtime,
      seed,
      showPerf,
      source,
    ],
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

  const ended = hud.phase === 'ended'

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>

      {!ended && <TouchControls layout={painter.controls} width={width} input={input} />}

      <View style={styles.hud} pointerEvents="none">
        <View style={styles.scoreboard}>
          <EnergyBar value={hud.energy0} color={me.look.jersey} full={stage.palette.power} />
          <Txt variant="score" style={{ color: me.look.jersey }}>
            {hud.score0}
          </Txt>
          <Txt variant={hud.golden ? 'label' : 'score'} tone={hud.golden ? 'brand' : 'fg'} style={styles.clock}>
            {hud.golden ? 'Gol de oro' : clock(hud.seconds)}
          </Txt>
          <Txt variant="score" style={{ color: rivalDj.look.jersey }}>
            {hud.score1}
          </Txt>
          <EnergyBar value={hud.energy1} color={rivalDj.look.jersey} full={stage.palette.power} />
        </View>
        {/* El tempo a la vista: sube a lo largo del partido y se nota en el juego. */}
        <Txt variant="data" tone="muted" style={styles.bpm}>
          {hud.bpm > 0 ? `${hud.bpm} BPM` : ' '}
        </Txt>
        {(hud.phase === 'goal' || hud.phase === 'drop') && (
          <Txt variant="banner" style={styles.banner}>
            ¡GOL!
          </Txt>
        )}
      </View>

      {settings.showPerf === true && (
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
    </View>
  )
}

/**
 * La barra de energía de cada jugador, junto a su marcador. Llena, se enciende
 * del color de los poderes: ese jugador tiene uno listo.
 */
function EnergyBar({ value, color, full: fullColor }: { value: number; color: string; full: string }) {
  const full = value >= 1
  return (
    <View style={styles.energy}>
      <View
        style={[
          styles.energyFill,
          { width: `${Math.round(Math.max(0, value) * 100)}%`, backgroundColor: full ? fullColor : color },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  energy: { width: 56, height: 8, borderRadius: radius.pill, backgroundColor: palette.line, overflow: 'hidden' },
  energyFill: { height: '100%', borderRadius: radius.pill },
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
  banner: { marginTop: space.lg },
  bpm: { marginTop: space.xs },
  perf: { position: 'absolute', top: space.xs },
  exit: {
    position: 'absolute',
    top: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
  },
})
