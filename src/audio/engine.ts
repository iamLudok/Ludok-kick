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
 * La salida de audio está encendida mientras alguien la necesite: la música
 * de una pantalla, un clic de un botón. Cada uno la «sujeta» y la «suelta», y
 * se apaga cuando nadie la sujeta. Con un simple encender/apagar, el clic del
 * botón que lleva al partido apagaba el audio justo cuando el partido lo
 * acababa de encender.
 *
 * Las órdenes al motor se encadenan una detrás de otra: `resume` y `suspend`
 * son asíncronas, y lanzadas a la vez ganaba la que tardaba más.
 */
let holds = 0
let transition: Promise<unknown> = Promise.resolve()

function apply(): Promise<unknown> {
  const { ctx } = getEngine()
  transition = transition
    .then(() => (holds > 0 ? ctx.resume() : ctx.suspend()))
    // Un fallo aquí (p. ej. otra app tiene el audio) no debe romper la cadena.
    .catch(() => undefined)
  return transition
}

export function holdEngine(): Promise<unknown> {
  holds++
  return apply()
}

export function releaseEngine(): Promise<unknown> {
  holds = Math.max(0, holds - 1)
  return apply()
}
