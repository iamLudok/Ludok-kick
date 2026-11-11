/** 0 es el jugador de la izquierda (ataca hacia la derecha); 1, el de la derecha. */
export type Side = 0 | 1

/**
 * - kickoff: todos en su sitio, el vinilo aún no cae.
 * - goal: congelado tras un gol, esperando el drop.
 * - drop: el drop ya cayó; la física corre un momento (rival volando, vinilo
 *   en la red) y luego se saca.
 */
export type Phase = 'kickoff' | 'play' | 'goal' | 'drop' | 'ended'

/**
 * Lo que un jugador «quiere hacer» en un paso. El núcleo solo conoce esto: le
 * da igual que venga de los botones táctiles, de la IA o, más adelante, de la
 * red. Es la frontera que permite añadir 2 jugadores sin tocar la física.
 */
export type InputFrame = {
  /** -1 izquierda, 0 quieto, 1 derecha. */
  move: number
  jump: boolean
  kick: boolean
  power: boolean
}

/** Multiplicadores por personaje. Con todo a 1 es el jugador base. */
export type PlayerStats = {
  speed: number
  jump: number
  kick: number
}

export type PlayerState = {
  side: Side
  /** Hacia dónde mira y chuta: fijo durante el partido, como en el género. */
  facing: 1 | -1
  /** Posición de los pies. */
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  /** Progreso del barrido de la pierna en segundos; -1 si no está chutando. */
  kickT: number
  kickCd: number
  /** Cada barrido solo puede golpear el vinilo una vez. */
  kickHit: boolean
  /** Evita contar varios toques seguidos de cabeza como toques distintos. */
  touchCd: number
  stats: PlayerStats
}

export type BallState = {
  x: number
  y: number
  vx: number
  vy: number
  /** Solo visual: el giro del vinilo. */
  angle: number
  spin: number
}

/** Cómo de a tiempo fue un toque: 0 normal, 1 GOOD, 2 PERFECT. */
export type Judge = 0 | 1 | 2

export type GameEvent =
  /** `at` es el instante (reloj de audio, ya corregido) en que se marcó; -1 sin música. */
  | { type: 'goal'; side: Side; at: number }
  /** Cae el drop: `side` es quien marcó, y (x, y) el centro de la onda. */
  | { type: 'drop'; side: Side; x: number; y: number }
  /** Un toque al vinilo, con el pie o con la cabeza, y dónde estaba el vinilo. */
  | { type: 'kick' | 'head'; side: Side; judge: Judge; x: number; y: number }
  | { type: 'bounce'; speed: number }

/**
 * El pulso de la música, tal como lo ve la simulación. Los tiempos son del
 * reloj de audio, en segundos, ya corregidos con el desfase calibrado: «ahora»
 * es lo que el jugador está oyendo, no lo que el móvil acaba de mandar al
 * altavoz.
 */
export type BeatState = {
  /** Sin música (o en las pruebas) no hay remate al ritmo. */
  on: boolean
  now: number
  /** Instante de un beat cualquiera; el resto caen cada 60 / bpm segundos. */
  t0: number
  bpm: number
  /** Cuándo cae el drop del último gol, según la música; -1 si aún no se sabe. */
  dropAt: number
}

/** Un compás tal como lo programó la música: cuándo empieza y a qué tempo va. */
export type Bar = { t0: number; bpm: number }

/** Resultado de una colisión. Vive en el estado para no crear un objeto por choque. */
export type Contact = {
  nx: number
  ny: number
  pen: number
}

export type GameState = {
  phase: Phase
  /** Tiempo que le queda a la fase actual (solo en 'kickoff' y 'goal'). */
  phaseT: number
  timeLeft: number
  /** Se acabó el tiempo con empate: el siguiente gol gana. */
  golden: boolean
  score: [number, number]
  players: [PlayerState, PlayerState]
  ball: BallState
  /** Tiempo de frame aún sin simular (ver SIM.DT). */
  acc: number
  tick: number
  /** Lo ocurrido en el último frame. Se vacía al empezar cada `stepGame`. */
  events: GameEvent[]
  contact: Contact
  beat: BeatState
  /** Velocidad del juego respecto a BPM_START: sube con el tempo. */
  speed: number
  /** Quién marcó el último gol, para la onda del drop. */
  scorer: Side
}
