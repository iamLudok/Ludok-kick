import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
  type AppStateStatus,
  type LayoutChangeEvent,
} from "react-native";
import {
  Canvas,
  Picture,
  createPicture,
  type SkPicture,
} from "@shopify/react-native-skia";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useFrameCallback,
  useSharedValue,
  type FrameInfo,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import {
  createAudioClock,
  readAudioClock,
  type AudioClock,
} from "../audio/clock";
import { useAudioSession } from "../audio/useAudioSession";
import { createAi, stepAi, type AiState } from "../game/ai";
import { barAt, beatPhase } from "../game/beat";
import { BEAT, MATCH } from "../game/constants";
import { createInitialState, emptyInput } from "../game/state";
import { stepGame, type BeatInput } from "../game/step";
import type { GameState, InputFrame, Phase } from "../game/types";
import { addMatch, allMatches } from "../lib/matches";
import { addCoins, coinsFor, levelsOf } from "../lib/progress";
import { rungOf, statLevelOfRung, unlockedBy } from "../content/ladder";
import { evenLevels, statsFor } from "../game/upgrades";
import { useSettings } from "../hooks/useSettings";
import { effectiveOffsetMs, updateSettings } from "../lib/settings";
import { burst, createPool, PC, updateParticles } from "../render/particles";
import {
  FX_LIFE,
  SHOCK_LIFE,
  createPainter,
  drawFrame,
  judgeLabel,
  powerLabel,
  type BeatView,
} from "../render/draw";
import { forMatch, getDj, type DjId } from "../content/djs";
import {
  levelOf,
  readSetup,
  resultParams,
  setupParams,
  type MatchResult,
  type MatchSetup,
} from "../content/setup";
import { getGenre } from "../content/genres";
import { getStage } from "../content/stages";
import { DjPortrait } from "./Art";
import { BadgeIcon } from "./BadgeIcon";
import { Flag } from "./Flag";
import type { BadgeId } from "../content/ladder";
import { Txt } from "./Text";
import { TouchControls } from "./TouchControls";
import { djNameColor } from "./labels";
import { palette, radius, space } from "./theme";

/** Lo que el marcador necesita saber del partido. Solo cambia unas pocas veces por minuto. */
type HudData = {
  score0: number;
  score1: number;
  seconds: number;
  phase: Phase;
  golden: boolean;
  /** Tempo del compás que suena; 0 sin música. */
  bpm: number;
  /** Energía de cada uno (0–1); llena es que tiene un poder listo. */
  energy0: number;
  energy1: number;
  /**
   * Los logros de «gana sin…» que ya no se pueden conseguir en este partido,
   * como bits: 1 encajó, 2 habilidad, 4 dash, 8 chut, 16 salto.
   */
  spoiled: number;
};

const INITIAL_HUD: HudData = {
  score0: 0,
  score1: 0,
  seconds: MATCH.DURATION,
  phase: "kickoff",
  golden: false,
  bpm: 0,
  energy0: 0,
  energy1: 0,
  spoiled: 0,
};

/** El drop que ha preparado la música para el gol número `goal` del partido. */
type DropInfo = { goal: number; at: number };

/**
 * Lo que vive en el hilo de UI mientras dura un partido. Se crea allí mismo,
 * en el primer frame, y no en JavaScript: un objeto creado en JS llega al hilo
 * de UI como copia, y el juego necesita mutar el original 120 veces por segundo.
 */
type Runtime = {
  game: GameState;
  ai: AiState;
  /** Remates a tiempo y poderes del jugador, para el resultado. */
  perfects: number;
  goods: number;
  powers: number;
  /** Lo que hizo el jugador: para los logros de «gana sin…». */
  kicks: number;
  jumps: number;
  dashes: number;
  /** Racha de PERFECT seguidos en curso y la mejor del partido. */
  streak: number;
  bestStreak: number;
  saved: boolean;
  hud: HudData;
  clock: AudioClock;
  beatIn: BeatInput;
  beatView: BeatView;
  perfTime: number;
  perfFrames: number;
  perfWork: number;
};

/** Lo que se guarda en el historial al acabar. */
/** Lo que manda el bucle del juego al acabar: el resultado sin lo que se calcula después (monedas, desbloqueos). */
type Final = Omit<MatchResult, "coins" | "newDjs" | "newBadges"> & {
  kicks: number;
  jumps: number;
  dashes: number;
};

/** Lo que dura la presentación «VS» antes de cada partido (se salta tocando). */
const VS_MS = 2200;

/** Cuánto se espera, con el marcador final a la vista, antes de pasar al resultado. */
const END_PAUSE_MS = 1400;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function MatchScreen() {
  const params = useLocalSearchParams();
  // Se lee una sola vez: si el rival saliera al azar en cada render, cambiaría
  // a mitad de partido.
  const [setup] = useState(() => readSetup(params));
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const insets = useSafeAreaInsets();
  useKeepAwake();

  // Se mide la vista en vez de preguntar el tamaño de la ventana: según el
  // móvil, la ventana cuenta o no la zona de la cámara, y el campo tiene que
  // encajar en lo que de verdad se pinta.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  }, []);

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
  );
}

function Match({
  width,
  height,
  insetX,
  setup,
}: {
  width: number;
  height: number;
  insetX: number;
  setup: MatchSetup;
}) {
  const router = useRouter();
  const level = levelOf(setup);
  const rung = rungOf(setup.rival);
  const stage = getStage(setup.stage);
  // Una vez por partido: si un DJ cambia de color, el mismo en el VS y en el campo.
  const me = useMemo(() => forMatch(getDj(setup.dj)), [setup.dj]);
  const rivalDj = useMemo(() => forMatch(getDj(setup.rival)), [setup.rival]);
  // La semilla del rival: cada partido, uno distinto. Se decide en JavaScript
  // porque en el hilo de UI la IA no usa Math.random (ver `ai.ts`).
  const seed = useSharedValue(Math.floor(Math.random() * 2 ** 31));
  const painter = useMemo(
    () => createPainter(width, height, insetX, stage, [me.look, rivalDj.look]),
    [width, height, insetX, stage, me, rivalDj],
  );
  const runtime = useSharedValue<Runtime | null>(null);
  const input = useSharedValue<InputFrame>(emptyInput());
  const picture = useSharedValue<SkPicture>(painter.blank);
  const [hud, setHud] = useState<HudData>(INITIAL_HUD);
  const [perf, setPerf] = useState("");
  // El overlay de rendimiento se enciende en Ajustes; el bucle lo consulta en
  // cada frame, así que viaja al hilo de UI en un valor compartido.
  const showPerf = useSharedValue(false);

  const { data: settings } = useSettings();
  // Suena la música de tu DJ, a su tempo, todo el partido.
  const genre = getGenre(me.genre);
  const audio = useAudioSession(genre.pattern, genre.bpm, {
    music: settings.musicVolume,
    sfx: settings.sfxVolume,
  });
  const {
    source,
    bars,
    playHit,
    playGoal,
    playPower,
    playCharged,
    drop: prepareDrop,
  } = audio;
  const dropInfo = useSharedValue<DropInfo>({ goal: -1, at: -1 });

  // Al marcar, la música decide cuándo cae el drop (en un beat) y se lo dice
  // al juego, que se queda congelado hasta entonces.
  const onGoal = useCallback(
    (goal: number, at: number) => {
      playGoal();
      if (at < 0) return;
      dropInfo.value = { goal, at: prepareDrop(at + MATCH.MIN_FREEZE) };
    },
    [dropInfo, playGoal, prepareDrop],
  );

  // El desfase calibrado viaja al hilo de UI en un valor compartido: cambia
  // como mucho una vez por partido, pero se lee en cada frame.
  const offsetMs = useSharedValue<number>(BEAT.DEFAULT_OFFSET_MS);
  const effectiveOffset = effectiveOffsetMs(settings, audio.deviceLatencyMs);
  useEffect(() => {
    showPerf.value = settings.showPerf === true;
  }, [settings.showPerf, showPerf]);

  useEffect(() => {
    offsetMs.value = effectiveOffset;
  }, [effectiveOffset, offsetMs]);

  const onEnded = useCallback(
    (f: Final) => {
      const save = async (): Promise<MatchResult> => {
        const before = await allMatches();
        // Primero se ve qué desbloquea el partido (sin monedas aún) para poder
        // pagar los logros nuevos; luego se guarda ya con las monedas.
        const draft = {
          ...f,
          id: "nuevo",
          playedAt: Date.now(),
          goldenGoal: f.golden,
          rivalDj: setup.rival,
          dj: setup.dj,
        };
        const unlocked = unlockedBy(before, [...before, draft], setup.rival);
        const coins = coinsFor({
          goalsFor: f.goalsFor,
          goalsAgainst: f.goalsAgainst,
          perfects: f.perfects,
          rung,
          newBadges: unlocked.badges.length,
        });
        await addMatch({
          goalsFor: f.goalsFor,
          goalsAgainst: f.goalsAgainst,
          goldenGoal: f.golden,
          perfects: f.perfects,
          goods: f.goods,
          powers: f.powers,
          bestStreak: f.bestStreak,
          kicks: f.kicks,
          jumps: f.jumps,
          dashes: f.dashes,
          coins,
          level,
          dj: setup.dj,
          rivalDj: setup.rival,
          stage: setup.stage,
        });
        await addCoins(coins);
        return {
          ...f,
          coins,
          newDjs: unlocked.djs,
          newBadges: unlocked.badges,
        };
      };
      // Un fallo al guardar no debe impedir ver el resultado: el partido ya se
      // jugó, y lo peor que pasa es que no sale en el historial.
      const saving = save().catch((): MatchResult => ({
        ...f,
        coins: 0,
        newDjs: [],
        newBadges: [],
      }));
      // Un momento con el marcador final a la vista y luego al resultado. Con
      // `replace`, «atrás» desde el resultado no vuelve a un partido acabado.
      setTimeout(async () => {
        const r = await saving;
        router.replace({
          pathname: "/resultado",
          params: { ...setupParams(setup), ...resultParams(r) },
        });
      }, END_PAUSE_MS);
    },
    [level, router, rung, setup],
  );

  useEffect(() => {
    updateSettings({ lastDj: setup.dj, lastStage: setup.stage }).catch(
      () => undefined,
    );
  }, [setup]);

  // Tus estadísticas son las de tus mejoras; las del rival, las de su escalón.
  const myStats = useMemo(
    () => statsFor(levelsOf(settings), me.power),
    [settings, me.power],
  );
  const rivalStats = useMemo(
    () => statsFor(evenLevels(statLevelOfRung(rung)), rivalDj.power),
    [rung, rivalDj.power],
  );

  // Con `useCallback` la función es la misma entre renders. Sin él, cada vez
  // que cambia el marcador (una vez por segundo, con el reloj) React crea otra
  // y el bucle se vuelve a registrar en el hilo de UI con todos sus pinceles.
  const onFrame = useCallback(
    (frame: FrameInfo) => {
      "worklet";
      const started = performance.now();
      let rt = runtime.value;
      if (!rt) {
        rt = {
          // La misma semilla que el rival: cada partido reparte poderes distintos.
          game: createInitialState(myStats, rivalStats, seed.value),
          ai: createAi(level, seed.value),
          perfects: 0,
          goods: 0,
          powers: 0,
          kicks: 0,
          jumps: 0,
          dashes: 0,
          streak: 0,
          bestStreak: 0,
          saved: false,
          hud: {
            score0: -1,
            score1: -1,
            seconds: -1,
            phase: "kickoff",
            golden: false,
            bpm: -1,
            energy0: -1,
            energy1: -1,
            spoiled: -1,
          },
          clock: createAudioClock(),
          beatIn: { time: 0, t0: 0, bpm: BEAT.REFERENCE_BPM, dropAt: -1 },
          beatView: {
            phase: -1,
            fx: [],
            shock: { x: 0, y: 0, age: -1 },
            particles: createPool(),
          },
          perfTime: 0,
          perfFrames: 0,
          perfWork: 0,
        };
        runtime.value = rt;
      }
      const s = rt.game;
      const dt = (frame.timeSincePreviousFrame ?? 1000 / 60) / 1000;
      const touch = input.value;

      // El ritmo sale del reloj de audio y de ningún otro sitio. «Ahora» es lo
      // que el jugador está oyendo: la hora del audio menos lo que tarda el
      // sonido en llegarle, que es el desfase calibrado.
      const src = source.value;
      const view = rt.beatView;
      let beat: BeatInput | undefined;
      view.phase = -1;
      if (src) {
        const heard = readAudioClock(src, rt.clock) - offsetMs.value / 1000;
        // El compás que se está oyendo. Antes del primer bombo no hay ninguno, y
        // el juego va a su velocidad normal y sin remate al ritmo.
        const bar = barAt(bars.value, heard);
        if (bar) {
          beat = rt.beatIn;
          beat.time = heard;
          beat.t0 = bar.t0;
          beat.bpm = bar.bpm;
          const d = dropInfo.value;
          beat.dropAt = d.goal === s.score[0] + s.score[1] ? d.at : -1;
          view.phase = beatPhase(heard, bar.t0, bar.bpm);
        }
      }

      const rival = stepAi(rt.ai, s, 1, dt);
      stepGame(s, touch, rival, dt, beat);
      // El dash es un pulso: se consume en el paso en que se pidió.
      if (touch.dash !== 0) touch.dash = 0;

      if (view.shock.age >= 0) {
        view.shock.age += dt;
        if (view.shock.age > SHOCK_LIFE) view.shock.age = -1;
      }

      updateParticles(view.particles, dt);
      for (let i = view.fx.length - 1; i >= 0; i--) {
        view.fx[i].age += dt;
        if (view.fx[i].age >= FX_LIFE) view.fx.splice(i, 1);
      }
      for (let i = 0; i < s.events.length; i++) {
        const ev = s.events[i];
        if (ev.type === "kick" || ev.type === "head") {
          scheduleOnRN(playHit, ev.judge);
          if (ev.side === 0 && ev.judge === 2) rt.perfects++;
          if (ev.side === 0) {
            // Cualquier toque que no sea PERFECT corta la racha.
            rt.streak = ev.judge === 2 ? rt.streak + 1 : 0;
            rt.bestStreak = Math.max(rt.bestStreak, rt.streak);
          }
          if (ev.side === 0 && ev.judge === 1) rt.goods++;
          if (ev.judge > 0)
            view.fx.push({
              label: judgeLabel(ev.judge),
              x: ev.x,
              y: ev.y,
              age: 0,
            });
          if (ev.judge === 2)
            burst(view.particles, ev.x, ev.y, 14, 520, PC.PERFECT);
        } else if (ev.type === "power") {
          if (ev.side === 0) rt.powers++;
          scheduleOnRN(playPower, ev.kind);
          view.fx.push({
            label: powerLabel(ev.kind),
            x: ev.x,
            y: ev.y,
            age: 0,
          });
          if (ev.kind === "stomp") {
            // El Bombo se ve como la onda de un drop: anillo, chispas y sacudida.
            view.shock.x = ev.x;
            view.shock.y = ev.y;
            view.shock.age = 0;
            burst(view.particles, ev.x, ev.y, 24, 700, PC.GLOW);
          }
        } else if (
          ev.type === "swing" ||
          ev.type === "jump" ||
          ev.type === "dash"
        ) {
          if (ev.side === 0) {
            if (ev.type === "swing") rt.kicks++;
            else if (ev.type === "jump") rt.jumps++;
            else rt.dashes++;
          }
        } else if (ev.type === "charged") {
          // Solo se avisa de la barra propia: la del rival se ve en el marcador.
          if (ev.side === 0) scheduleOnRN(playCharged);
        } else if (ev.type === "goal") {
          scheduleOnRN(onGoal, s.score[0] + s.score[1], ev.at);
        } else if (ev.type === "drop") {
          view.shock.x = ev.x;
          view.shock.y = ev.y;
          view.shock.age = 0;
          burst(view.particles, ev.x, ev.y, 36, 900, PC.GLOW);
        }
      }

      const live = s.phase !== "ended";
      if (!live && !rt.saved) {
        rt.saved = true;
        scheduleOnRN(onEnded, {
          goalsFor: s.score[0],
          goalsAgainst: s.score[1],
          golden: s.golden,
          perfects: rt.perfects,
          goods: rt.goods,
          powers: rt.powers,
          bestStreak: rt.bestStreak,
          kicks: rt.kicks,
          jumps: rt.jumps,
          dashes: rt.dashes,
        });
      }
      picture.value = createPicture((canvas) => {
        "worklet";
        drawFrame(canvas, s, painter, touch, live, view);
      }, painter.bounds);

      // El marcador es React normal y corriente: solo se le avisa cuando cambia
      // algo que enseña, no en cada frame.
      const seconds = Math.ceil(s.timeLeft);
      const bpm = beat ? beat.bpm : 0;
      const spoiled =
        (s.score[1] > 0 ? 1 : 0) |
        (rt.powers > 0 ? 2 : 0) |
        (rt.dashes > 0 ? 4 : 0) |
        (rt.kicks > 0 ? 8 : 0) |
        (rt.jumps > 0 ? 16 : 0);
      const h = rt.hud;
      if (
        h.score0 !== s.score[0] ||
        h.score1 !== s.score[1] ||
        h.seconds !== seconds ||
        h.phase !== s.phase ||
        h.golden !== s.golden ||
        h.bpm !== bpm ||
        h.energy0 !== s.players[0].energy ||
        h.energy1 !== s.players[1].energy ||
        h.spoiled !== spoiled
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
          spoiled,
        };
        scheduleOnRN(setHud, rt.hud);
      }

      if (showPerf.value) {
        rt.perfTime += dt;
        rt.perfFrames += 1;
        rt.perfWork += performance.now() - started;
        if (rt.perfTime >= 0.5) {
          const fps = Math.round(rt.perfFrames / rt.perfTime);
          const work = (rt.perfWork / rt.perfFrames).toFixed(1);
          const sound = beat
            ? `audio ${Math.round(offsetMs.value)} ms`
            : "sin audio";
          scheduleOnRN(setPerf, `${fps} fps · ${work} ms · ${sound}`);
          rt.perfTime = 0;
          rt.perfFrames = 0;
          rt.perfWork = 0;
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
      runtime,
      seed,
      showPerf,
      source,
    ],
  );
  const loop = useFrameCallback(onFrame);

  // Con la app en segundo plano el bucle se para. Android no lo hace solo: el
  // partido seguía corriendo sin nadie delante (el reloj avanzaba y el rival
  // podía marcar) y la app se comía la batería pintando a una pantalla que ya
  // no existe.
  // La presentación «VS» antes del partido. Mientras se ve, el partido espera
  // (la música ya suena: entra en la cabina con el bombo puesto).
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), VS_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const apply = (state: AppStateStatus) =>
      loop.setActive(state === "active" && !intro);
    apply(AppState.currentState);
    const sub = AppState.addEventListener("change", apply);
    return () => sub.remove();
  }, [loop, intro]);

  const ended = hud.phase === "ended";

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>

      {!ended && (
        <TouchControls layout={painter.controls} width={width} input={input} />
      )}

      <View
        style={[styles.hud, { paddingHorizontal: insetX + space.md }]}
        pointerEvents="none"
      >
        {/* Como en Head Soccer: arriba, a cada lado, la bandera y la barra de power de cada DJ. */}
        <View style={styles.topBar}>
          <View style={styles.side}>
            <Flag country={me.origin} height={18} />
            <PowerBar
              value={hud.energy0}
              color={me.look.jersey}
              full={stage.palette.power}
            />
          </View>
          <View style={styles.scoreboard}>
            <Txt
              variant="score"
              style={{ color: djNameColor(me.look.jersey, palette.fg) }}
            >
              {hud.score0}
            </Txt>
            <Txt
              variant={hud.golden ? "label" : "score"}
              tone={hud.golden ? "brand" : "fg"}
              style={styles.clock}
            >
              {hud.golden ? "Gol de oro" : clock(hud.seconds)}
            </Txt>
            <Txt
              variant="score"
              style={{ color: djNameColor(rivalDj.look.jersey, palette.fg) }}
            >
              {hud.score1}
            </Txt>
          </View>
          <View style={[styles.side, styles.sideRight]}>
            <PowerBar
              value={hud.energy1}
              color={rivalDj.look.jersey}
              full={stage.palette.power}
              flip
            />
            <Flag country={rivalDj.origin} height={18} />
          </View>
        </View>
        {/* Los logros de este partido: se tachan en cuanto ya no se pueden conseguir. */}
        <View style={styles.badges}>
          {LIVE_BADGES.map(([id, bit]) => (
            <BadgeIcon
              key={id}
              id={id}
              size={16}
              earned={false}
              crossed={(hud.spoiled & bit) !== 0}
            />
          ))}
          <Txt variant="data" tone="muted">
            {hud.bpm > 0 ? `  ${hud.bpm} BPM` : " "}
          </Txt>
        </View>
        {(hud.phase === "goal" || hud.phase === "drop") && (
          <Txt variant="banner" style={styles.banner}>
            ¡GOL!
          </Txt>
        )}
      </View>

      {intro && (
        <Pressable
          style={styles.vs}
          onPress={() => setIntro(false)}
          accessibilityLabel="Empezar el partido"
        >
          <View style={styles.vsSide}>
            <DjPortrait dj={me} size={170} />
            <Txt
              variant="title"
              style={{ color: djNameColor(me.look.jersey, palette.fg) }}
            >
              {me.name}
            </Txt>
          </View>
          <Txt variant="banner" tone="brand" style={styles.vsText}>
            VS
          </Txt>
          <View style={styles.vsSide}>
            <DjPortrait dj={rivalDj} size={170} flip />
            <Txt
              variant="title"
              style={{ color: djNameColor(rivalDj.look.jersey, palette.fg) }}
            >
              {rivalDj.name}
            </Txt>
          </View>
        </Pressable>
      )}

      {settings.showPerf === true && (
        <View
          style={[styles.perf, { left: insetX + space.sm }]}
          pointerEvents="none"
        >
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
  );
}

/**
 * La barra de power de cada jugador, junto a su bandera. Llena, se enciende
 * del color de los poderes: ese jugador tiene su habilidad lista. La del
 * rival se llena de derecha a izquierda, como un espejo.
 */
function PowerBar({
  value,
  color,
  full: fullColor,
  flip = false,
}: {
  value: number;
  color: string;
  full: string;
  flip?: boolean;
}) {
  const full = value >= 1;
  return (
    <View style={[styles.power, flip && styles.powerFlip]}>
      <View
        style={[
          styles.powerFill,
          {
            width: `${Math.round(Math.max(0, value) * 100)}%`,
            backgroundColor: full ? fullColor : color,
          },
        ]}
      />
    </View>
  );
}

/** Los logros que se ven durante el partido, con el bit que los tacha. */
const LIVE_BADGES: [BadgeId, number][] = [
  ["clean", 1],
  ["nopower", 2],
  ["nodash", 4],
  ["nokick", 8],
  ["nojump", 16],
];

const styles = StyleSheet.create({
  vs: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.scrim,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xxl,
  },
  vsSide: { alignItems: "center", gap: space.sm },
  vsText: { fontSize: 72, fontStyle: "italic" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
    alignSelf: "stretch",
  },
  side: { flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1 },
  sideRight: { justifyContent: "flex-end" },
  power: {
    width: 150,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
    flexDirection: "row",
  },
  powerFlip: { flexDirection: "row-reverse" },
  powerFill: { height: "100%", borderRadius: radius.pill },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
  },
  root: { flex: 1, backgroundColor: palette.bg },
  hud: { ...StyleSheet.absoluteFill, alignItems: "center" },
  scoreboard: {
    marginTop: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
  },
  // Ancho fijo: si no, el marcador se ensancha y encoge cada vez que cambia el reloj.
  clock: { minWidth: 88, textAlign: "center" },
  banner: { marginTop: space.lg },
  perf: { position: "absolute", top: space.xs },
  exit: {
    position: "absolute",
    top: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.hud,
  },
});
