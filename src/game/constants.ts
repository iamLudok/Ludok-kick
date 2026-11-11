/**
 * Toda la configuración de jugabilidad vive en este fichero: velocidades,
 * gravedad, rebotes, tamaños y duración del partido. Si algo «se siente» mal
 * jugando, el número que hay que tocar está aquí y en ningún otro sitio.
 *
 * Unidades: el campo mide 1000 × 450 unidades de mundo («u»), con la Y hacia
 * abajo como en pantalla. Velocidades en u/s, aceleraciones en u/s², tiempos
 * en segundos. La pantalla escala el mundo entero, así que estos números no
 * dependen del móvil.
 */

export const FIELD = {
  W: 1000,
  H: 450,
  /** Altura del suelo. Lo que queda por debajo es la franja de los controles. */
  GROUND_Y: 345,
  /** Techo: el vinilo rebota en él para que no se pierda de vista. */
  CEILING_Y: 0,
}

export const GOAL = {
  /** Distancia de la pared a la línea de gol. */
  DEPTH: 78,
  /** Altura de la boca, del suelo al larguero. */
  HEIGHT: 150,
  /**
   * Cuánto sube el techo de la portería hacia la pared. Va inclinado a
   * propósito: con un techo plano el vinilo se quedaba parado encima y había
   * que ir a buscarlo; inclinado, rueda solo de vuelta al campo.
   */
  ROOF_RISE: 30,
  /** Grosor (radio) del larguero. */
  BAR_R: 6,
  /** Cuánto tiene que pasar el centro del vinilo de la línea para ser gol. */
  LINE_MARGIN: 6,
  BOUNCE: 0.55,
}

export const BALL = {
  R: 20,
  /** Menor que la de los jugadores: el vinilo flota más, que es lo divertido. */
  GRAVITY: 1500,
  /** Fracción de velocidad que pierde por segundo en el aire. */
  AIR_DRAG: 0.12,
  BOUNCE_GROUND: 0.72,
  BOUNCE_WALL: 0.8,
  BOUNCE_CEILING: 0.8,
  /** Fracción de velocidad horizontal que conserva en cada bote. */
  GROUND_GRIP: 0.93,
  /** Fracción de velocidad horizontal que pierde por segundo rodando. */
  ROLL_FRICTION: 0.85,
  /** Por debajo de esta velocidad de impacto no rebota: se queda apoyado. */
  REST_SPEED: 70,
  /**
   * Tope de velocidad. Con el paso fijo de SIM.DT, a esta velocidad avanza
   * menos de un radio por paso, que es lo que impide atravesar paredes.
   */
  MAX_SPEED: 1400,
  /** Altura desde la que cae en el saque. */
  DROP_Y: 120,
}

export const PLAYER = {
  HEAD_R: 36,
  /** Altura del centro de la cabeza sobre los pies. */
  HEAD_CY: 62,
  /** El cuerpo es un círculo pequeño a ras de suelo: sirve para conducir el vinilo. */
  BODY_R: 17,
  SPEED: 330,
  ACCEL: 3800,
  AIR_ACCEL: 2800,
  GRAVITY: 2600,
  JUMP_V: 800,
  /** Distancia a su pared en el saque. */
  START_X: 250,
  /** Lo más cerca que puede estar de cualquiera de las dos paredes. */
  MIN_X: 44,
  /**
   * Cuánta de la velocidad del jugador se transmite al vinilo al chocar. Con
   * 1 (física «correcta» con masa infinita) un cabezazo en salto lo mandaba
   * siempre al techo.
   */
  PUSH: 0.6,
}

export const HEADER = {
  RESTITUTION: 0.5,
  /** Empujón extra en la dirección del golpe: hace que cabecear «pegue». */
  BOOST: 150,
  /** Impacto mínimo para que cuente como cabezazo (y no como vinilo apoyado). */
  MIN_IMPACT: 60,
}

export const BODY = {
  RESTITUTION: 0.3,
}

export const KICK = {
  /** Lo que dura el barrido de la pierna. */
  DURATION: 0.17,
  /** Espera tras acabar el barrido antes de poder volver a chutar. */
  COOLDOWN: 0.12,
  /** Altura de la cadera sobre los pies. */
  HIP_Y: 44,
  LEG: 40,
  FOOT_R: 14,
  /** Ángulos del barrido en radianes: 0 es pierna recta hacia abajo, positivo hacia delante. */
  ANGLE_START: -0.6,
  ANGLE_END: 1.75,
  /** Velocidad que sale del pie. */
  VX: 650,
  VY: 470,
  /**
   * El momento del barrido en que se toca decide la parábola: al principio la
   * pierna va baja y el tiro sale raso y rápido; al final va alta y sale
   * bombeado. Esto da dos tiros distintos con un solo botón.
   */
  FLAT_VX: 1.12,
  FLAT_LIFT: 0.6,
  LOB_VX: 0.8,
  LOB_LIFT: 1.2,
  /** Cuánta de la velocidad del jugador se suma al tiro. */
  INHERIT: 0.35,
}

export const BEAT = {
  /**
   * El tempo sube a lo largo del partido, de BPM_START a BPM_END, compás a
   * compás. La velocidad del juego sube con él: a 145 BPM todo va un 21 % más
   * rápido que a 120.
   */
  BPM_START: 120,
  BPM_END: 145,
  /**
   * Ventanas del remate al ritmo: distancia máxima, en milisegundos, entre el
   * toque al vinilo y el beat más cercano, medidas a BPM_START. Al subir el
   * tempo se encogen en la misma proporción: siempre son la misma fracción del
   * compás, y con el juego más rápido no se vuelve más fácil acertar.
   */
  PERFECT_MS: 80,
  GOOD_MS: 160,
  /** Por cuánto se multiplica la velocidad del tiro. */
  PERFECT_POWER: 1.35,
  GOOD_POWER: 1.15,
  /**
   * Desfase de audio que se usa mientras nadie haya calibrado y el móvil no
   * diga cuál es el suyo: lo que tarda en oírse un sonido desde que se manda.
   */
  DEFAULT_OFFSET_MS: 40,
  /** Límites del ajuste manual en la pantalla de calibración. */
  MAX_OFFSET_MS: 500,
}

/**
 * La personalidad de cada nivel de la IA. No es más rápida ni más fuerte que
 * tú (juega con los mismos botones y la misma física): lo que cambia es cuánto
 * tarda en reaccionar, cuánto se equivoca y cuánto afina con el ritmo.
 */
export const AI = {
  /** Warm-up: lenta de reflejos, falla a menudo y casi nunca remata al ritmo. */
  warmup: {
    /** Cada cuánto «mira» y decide a dónde ir, en segundos, y cuánto varía. */
    think: 0.3,
    thinkJitter: 0.15,
    /** Error típico al calcular dónde caerá el vinilo, en unidades de campo. */
    aimError: 55,
    /** Fracción de la velocidad máxima a la que se mueve. */
    speed: 0.78,
    /** Probabilidad, en cada decisión, de quedarse en blanco un momento. */
    blunder: 0.2,
    freeze: 0.45,
    /** Probabilidad de ir a por un balón alto de cabeza en vez de esperarlo abajo. */
    headSkill: 0.45,
    /** Retraso aleatorio máximo entre tener el vinilo a tiro y chutar. */
    kickSlop: 0.16,
    /** Probabilidad de aguantar el chut hasta el siguiente beat. */
    beatSkill: 0.1,
    /**
     * Probabilidad, en cada decisión, de ir a por el vinilo cuando está en tu
     * campo; si no, se queda atrás guardando. Más no es mejor: presionando
     * mucho la cogían a contrapié y se comía contraataques (y goles en propia).
     */
    pressure: 0.2,
    /**
     * Con un poder listo: probabilidad, en cada decisión, de esperar al
     * momento bueno para usarlo (si no, lo suelta cuando le parece), y tiempo
     * máximo que lo guarda antes de gastarlo como sea.
     */
    powerIQ: 0.3,
    powerPatience: 12,
  },
  /** Peak Time: un rival decente. */
  peak: {
    think: 0.18,
    thinkJitter: 0.08,
    aimError: 26,
    speed: 0.92,
    blunder: 0.08,
    freeze: 0.3,
    headSkill: 0.75,
    kickSlop: 0.08,
    beatSkill: 0.4,
    pressure: 0.35,
    powerIQ: 0.65,
    powerPatience: 9,
  },
  /** Closing: reacciona rápido, falla poco y busca el beat casi siempre. */
  closing: {
    think: 0.1,
    thinkJitter: 0.04,
    aimError: 9,
    speed: 1,
    blunder: 0.03,
    freeze: 0.18,
    headSkill: 0.95,
    kickSlop: 0.03,
    beatSkill: 0.8,
    pressure: 0.45,
    powerIQ: 0.95,
    powerPatience: 6,
  },
  /** Dónde espera cuando no va a por el vinilo: distancia a su propia pared. */
  HOME_X: 240,
  /** Segundos con el vinilo parado tras los que deja de buscar la jugada buena y va a por él. */
  STALL: 2,
  /** Lo máximo que aguanta un chut buscando el beat. Más, y se lo quitan. */
  MAX_BEAT_WAIT: 0.3,
  /**
   * A qué distancia del beat da por buena la ocasión, en segundos. Más fino
   * que la ventana PERFECT: su cuenta tiene algo de error y así no se le
   * escapa por los pelos.
   */
  BEAT_AIM: 0.05,
}

/** Poderes de DJ y su barra de energía. */
export const POWER = {
  /** Energía por remate PERFECT (la barra va de 0 a 1): con 0,25 se llena con cuatro. */
  PER_PERFECT: 0.25,
  /** Scratch: el siguiente tiro gira su trayectoria a este ritmo (radianes por segundo) durante CURVE_TIME. */
  CURVE_RATE: 1.9,
  CURVE_TIME: 0.8,
  /** Low-pass: el rival va a esta fracción de su velocidad durante este tiempo (segundos de verdad). */
  SLOW_FACTOR: 0.45,
  LOWPASS_TIME: 3,
  /**
   * Loop: el vinilo se queda flotando donde está durante LOOP_TIME. Si estaba
   * por el suelo, sube hasta LOOP_HEIGHT (altura de su centro sobre el suelo),
   * que es la de una volea: más arriba ya está a la altura de la cabeza (que
   * es enorme) y al acercarse a chutar la cabeza lo apartaba antes que el pie.
   */
  LOOP_TIME: 1.5,
  LOOP_HEIGHT: 45,
}

/** La onda expansiva del drop: cuánto lanza al que encajó el gol. */
export const SHOCK = {
  PUSH_X: 620,
  PUSH_Y: 520,
}

export const CALIBRATION = {
  /**
   * Tempo del metrónomo de calibrar. Más lento que el del juego a propósito:
   * unos auriculares Bluetooth pueden retrasar el sonido 300 ms, y a 120 BPM
   * (un beat cada 500 ms) ya no se sabría si un toque va tarde respecto a un
   * beat o pronto respecto al siguiente.
   */
  BPM: 80,
  /** Toques necesarios antes de proponer una medida, y cuántos se tienen en cuenta. */
  MIN_TAPS: 8,
  TAPS_KEPT: 16,
  /** Lo máximo que un toque puede adelantarse al sonido y seguir contando para ese beat. */
  MAX_EARLY_MS: 100,
  /** Paso de los botones de ajuste fino. */
  NUDGE_MS: 5,
}

export const MATCH = {
  /**
   * Duración del partido en segundos de verdad, no de juego: aunque al final
   * todo vaya más rápido, el reloj marca segundos normales. Con empate al
   * final, gol de oro.
   */
  DURATION: 90,
  /**
   * Cada gol es un drop. Primero, el partido se congela mientras la música se
   * filtra y sube la tensión; luego, en un beat, cae el drop. La congelación
   * dura al menos MIN_FREEZE y acaba en el primer beat a partir de ahí, así
   * que a 120 BPM va de 0,75 a 1,25 s.
   */
  MIN_FREEZE: 0.75,
  /** Sin música (o si la música no responde), la congelación dura esto. */
  GOAL_FREEZE: 1,
  /** Tope de seguridad: si el drop no llega, el partido sigue igual. */
  MAX_FREEZE: 2.2,
  /** Lo que se deja correr tras el drop (rival volando, vinilo en la red) antes de sacar. */
  DROP_AFTER: 0.9,
  /** Congelación antes de que caiga el vinilo en el saque. */
  KICKOFF_DELAY: 0.8,
}

export const SIM = {
  /**
   * Paso fijo de la simulación. Fijo y no «lo que tarde el frame» por dos
   * motivos: la física se comporta igual a 60 que a 120 Hz, y la misma
   * secuencia de inputs da siempre el mismo partido, que es lo que hará falta
   * para el online.
   */
  DT: 1 / 120,
  /** Pasos máximos por frame: si la app se atasca, el juego se ralentiza en vez de dar un salto. */
  MAX_STEPS: 6,
}

export const DEBUG = {
  /** Enseña fps y milisegundos de trabajo por frame en una esquina. */
  OVERLAY: true,
}
