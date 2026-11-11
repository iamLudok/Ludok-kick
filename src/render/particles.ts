/**
 * Partículas: chispas en los PERFECT, confeti en los goles, una lluvia de
 * chispas en el drop. Son solo adorno; el juego no las ve.
 *
 * Hay un número fijo de ellas, creadas una vez, que se reciclan: crear objetos
 * nuevos en cada gol acabaría en pausas del recolector de basura justo en el
 * momento más vistoso. Si se acaban, la siguiente pisa a la más vieja.
 */
import type { SkCanvas, SkPaint } from '@shopify/react-native-skia'
import { FIELD, GOAL } from '../game/constants'

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  /** Vida total en segundos; con `age >= life` la partícula está libre. */
  life: number
  /** Índice del color en los pinceles de partícula. */
  color: number
  size: number
  /** 0 chispa (un trazo en la dirección en que va), 1 confeti (un papelito que gira). */
  shape: number
  spin: number
}

export type ParticlePool = { items: Particle[]; next: number; seed: number }

const POOL = 200

/** Índices de color (ver `particlePaints` en `draw.ts`). */
export const PC = { PERFECT: 0, GOOD: 1, POWER: 2, GLOW: 3, WHITE: 4, P0: 5, P1: 6 }

export function createPool(): ParticlePool {
  'worklet'
  const items: Particle[] = []
  for (let i = 0; i < POOL; i++) {
    items.push({ x: 0, y: 0, vx: 0, vy: 0, age: 1, life: 0, color: 0, size: 0, shape: 0, spin: 0 })
  }
  return { items, next: 0, seed: 12345 }
}

function rnd(pool: ParticlePool): number {
  'worklet'
  // Un generador muy simple basta: esto no tiene que ser reproducible.
  pool.seed = (pool.seed * 1103515245 + 12345) & 0x7fffffff
  return pool.seed / 0x7fffffff
}

function emit(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: number,
  size: number,
  shape: number,
): void {
  'worklet'
  const p = pool.items[pool.next]
  pool.next = (pool.next + 1) % pool.items.length
  p.x = x
  p.y = y
  p.vx = vx
  p.vy = vy
  p.age = 0
  p.life = life
  p.color = color
  p.size = size
  p.shape = shape
  p.spin = (rnd(pool) - 0.5) * 20
}

/** Chispas en todas direcciones desde un punto: un PERFECT, el drop. */
export function burst(pool: ParticlePool, x: number, y: number, n: number, speed: number, color: number): void {
  'worklet'
  for (let i = 0; i < n; i++) {
    const a = rnd(pool) * Math.PI * 2
    const v = speed * (0.4 + rnd(pool) * 0.6)
    emit(
      pool,
      x,
      y,
      Math.cos(a) * v,
      Math.sin(a) * v - speed * 0.2,
      0.35 + rnd(pool) * 0.3,
      color,
      3 + rnd(pool) * 2,
      0,
    )
  }
}

/**
 * Confeti saliendo de la portería donde entró el gol, hacia el campo. `side`
 * es quien marcó: el confeti es de su color, con algo de dorado y blanco.
 */
export function confetti(pool: ParticlePool, side: number, n: number): void {
  'worklet'
  // Marca 0 en la portería derecha y 1 en la izquierda.
  const goalX = side === 0 ? FIELD.W - GOAL.DEPTH * 0.5 : GOAL.DEPTH * 0.5
  const dir = side === 0 ? -1 : 1
  const y = FIELD.GROUND_Y - GOAL.HEIGHT * 0.5
  const own = side === 0 ? PC.P0 : PC.P1
  for (let i = 0; i < n; i++) {
    const r = rnd(pool)
    const color = r < 0.55 ? own : r < 0.8 ? PC.PERFECT : r < 0.92 ? PC.WHITE : PC.POWER
    const vx = dir * (180 + rnd(pool) * 520)
    const vy = -(260 + rnd(pool) * 520)
    emit(pool, goalX, y + (rnd(pool) - 0.5) * 80, vx, vy, 1.2 + rnd(pool) * 0.9, color, 6 + rnd(pool) * 5, 1)
  }
}

export function updateParticles(pool: ParticlePool, dt: number): void {
  'worklet'
  for (let i = 0; i < pool.items.length; i++) {
    const p = pool.items[i]
    if (p.age >= p.life) continue
    p.age += dt
    // El confeti cae despacio y se frena con el aire; las chispas caen más.
    const drag = p.shape === 1 ? 2.2 : 1.2
    p.vx -= p.vx * drag * dt
    p.vy += (p.shape === 1 ? 420 : 900) * dt
    p.vy -= p.vy * drag * dt * 0.5
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.y > FIELD.GROUND_Y - 2) {
      p.y = FIELD.GROUND_Y - 2
      p.vy = -p.vy * 0.3
      p.vx *= 0.6
    }
  }
}

/** `strokes` para las chispas y `fills` para el confeti: un pincel por color en cada lista. */
export function drawParticles(canvas: SkCanvas, pool: ParticlePool, strokes: SkPaint[], fills: SkPaint[]): void {
  'worklet'
  for (let i = 0; i < pool.items.length; i++) {
    const p = pool.items[i]
    if (p.age >= p.life) continue
    const t = p.age / p.life
    const paint = p.shape === 0 ? strokes[p.color] : fills[p.color]
    paint.setAlphaf(t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3)
    if (p.shape === 0) {
      // Una chispa es un trazo corto en la dirección de su velocidad.
      const k = 0.025
      paint.setStrokeWidth(p.size)
      canvas.drawLine(p.x, p.y, p.x - p.vx * k, p.y - p.vy * k, paint)
    } else {
      // Un papelito: se estrecha y se ensancha al girar.
      const w = p.size * Math.abs(Math.cos(p.age * p.spin))
      canvas.drawRect({ x: p.x - w / 2, y: p.y - p.size * 0.35, width: Math.max(w, 1), height: p.size * 0.7 }, paint)
    }
  }
}
