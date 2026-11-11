/**
 * Tokens de la interfaz (menús, marcador, botones). ÚNICA fuente de color y de
 * medidas fuera del campo de juego: lo que se pinta dentro del campo sale de
 * `src/render/stage.ts`, que cambia con cada escenario.
 *
 * A diferencia del resto de apps Ludok, aquí solo hay tema oscuro: es un juego
 * ambientado en un club y el campo lleva su propia paleta, así que un tema
 * claro no tendría a qué aplicarse.
 */

export const palette = {
  bg: '#0a0a0c',
  surface: '#16131d',
  line: '#2a2536',
  fg: '#f3f1ec',
  muted: '#9a94a8',
  /** Morado de la familia Ludok. */
  brand: '#7A45C4',
  brandFg: '#ffffff',
  /** Velo sobre el campo cuando hay un panel encima. */
  scrim: 'rgba(8,6,14,0.74)',
  /** Fondo de las píldoras del marcador, para que se lean sobre cualquier escenario. */
  hud: 'rgba(10,8,16,0.62)',
} as const

/** Escala de espaciado (múltiplos de 4, sin valores a ojo). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  pill: 999,
} as const

/** Escala tipográfica. Las cifras van tabulares para que el marcador no baile. */
export const type = {
  banner: { fontSize: 56, fontWeight: '900', letterSpacing: 1 },
  score: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  data: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
} as const
