/**
 * El motor de audio: un único AudioContext para toda la app y los buses a los
 * que se conecta todo lo que suena. No hay ni un fichero de sonido: cada golpe
 * se sintetiza en el momento con osciladores y ruido.
 *
 * Es el único sitio (junto con `synth.ts` y `sequencer.ts`) que importa la
 * librería de audio. El juego solo conoce su reloj.
 */
import { AudioContext, type AudioBuffer, type BiquadFilterNode, type GainNode } from 'react-native-audio-api'

export type Engine = {
  ctx: AudioContext
  /** Entrada de la música. Pasa por un filtro que hoy está abierto del todo; es el que cerrará el drop de los goles. */
  music: GainNode
  musicFilter: BiquadFilterNode
  /** Entrada de los efectos (golpes al vinilo, gol): no pasan por el filtro. */
  sfx: GainNode
  /** Un segundo de ruido blanco, la materia prima de platos y palmas. */
  noise: AudioBuffer
}

let engine: Engine | null = null

export function getEngine(): Engine {
  if (engine) return engine

  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0.85
  master.connect(ctx.destination)

  const musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 20000
  musicFilter.connect(master)

  const music = ctx.createGain()
  music.gain.value = 0.8
  music.connect(musicFilter)

  const sfx = ctx.createGain()
  sfx.gain.value = 0.9
  sfx.connect(master)

  const length = Math.floor(ctx.sampleRate)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBuffer(1, length, ctx.sampleRate)
  noise.copyToChannel(data, 0)

  engine = { ctx, music, musicFilter, sfx, noise }
  return engine
}

/**
 * Enciende o apaga la salida de audio. Las órdenes se encadenan una detrás de
 * otra: `resume` y `suspend` son asíncronas, y al cambiar de pantalla una
 * pide apagar justo cuando la siguiente pide encender. Lanzadas a la vez, la
 * que tardaba más ganaba y la pantalla nueva se quedaba muda.
 */
let transition: Promise<unknown> = Promise.resolve()

export function setEngineRunning(running: boolean): Promise<unknown> {
  const { ctx } = getEngine()
  transition = transition
    .then(() => (running ? ctx.resume() : ctx.suspend()))
    // Un fallo aquí (p. ej. otra app tiene el audio) no debe romper la cadena.
    .catch(() => undefined)
  return transition
}
