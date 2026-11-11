import { useMemo } from 'react'
import {
  Canvas,
  Picture,
  Skia,
  createPicture,
  matchFont,
  type SkCanvas,
  type SkPaint,
} from '@shopify/react-native-skia'
import type { BadgeId } from '../content/ladder'
import { palette } from './theme'

/**
 * El icono de cada logro, geométrico como el resto de la interfaz. Conseguido,
 * en dorado; por conseguir, apagado. «Tachado» es para el marcador del
 * partido: un logro que ya no se puede conseguir en este partido.
 */
function glyph(canvas: SkCanvas, id: BadgeId, s: number, paint: SkPaint, font: ReturnType<typeof matchFont>): void {
  const c = s / 2
  const path = Skia.Path.Make()
  switch (id) {
    case 'clean':
      // Un escudo: la portería a cero.
      path.moveTo(c, s * 0.12)
      path.lineTo(s * 0.85, s * 0.28)
      path.quadTo(s * 0.82, s * 0.72, c, s * 0.9)
      path.quadTo(s * 0.18, s * 0.72, s * 0.15, s * 0.28)
      path.close()
      canvas.drawPath(path, paint)
      return
    case 'golden':
      canvas.drawCircle(c, c, s * 0.36, paint)
      return
    case 'nopower':
      // Un rayo.
      path.moveTo(s * 0.58, s * 0.08)
      path.lineTo(s * 0.22, s * 0.55)
      path.lineTo(s * 0.48, s * 0.55)
      path.lineTo(s * 0.4, s * 0.92)
      path.lineTo(s * 0.78, s * 0.42)
      path.lineTo(s * 0.52, s * 0.42)
      path.close()
      canvas.drawPath(path, paint)
      return
    case 'nodash':
      // Dos flechas seguidas: el desplazamiento rápido.
      for (const ox of [0, s * 0.3]) {
        path.moveTo(s * 0.12 + ox, s * 0.2)
        path.lineTo(s * 0.45 + ox, c)
        path.lineTo(s * 0.12 + ox, s * 0.8)
        path.close()
      }
      canvas.drawPath(path, paint)
      return
    case 'nokick':
      // Una bota.
      path.moveTo(s * 0.2, s * 0.1)
      path.lineTo(s * 0.48, s * 0.1)
      path.lineTo(s * 0.48, s * 0.52)
      path.lineTo(s * 0.88, s * 0.66)
      path.lineTo(s * 0.88, s * 0.88)
      path.lineTo(s * 0.2, s * 0.88)
      path.close()
      canvas.drawPath(path, paint)
      return
    case 'nojump':
      // Una flecha hacia arriba.
      path.moveTo(c, s * 0.08)
      path.lineTo(s * 0.88, s * 0.52)
      path.lineTo(s * 0.64, s * 0.52)
      path.lineTo(s * 0.64, s * 0.92)
      path.lineTo(s * 0.36, s * 0.92)
      path.lineTo(s * 0.36, s * 0.52)
      path.lineTo(s * 0.12, s * 0.52)
      path.close()
      canvas.drawPath(path, paint)
      return
    case 'rout':
    case 'ten': {
      const text = id === 'rout' ? '+5' : '10'
      const w = font.measureText(text).width
      canvas.drawText(text, c - w / 2, s * 0.74, paint, font)
      return
    }
  }
}

export function BadgeIcon({
  id,
  size = 14,
  earned,
  crossed = false,
}: {
  id: BadgeId
  size?: number
  earned: boolean
  crossed?: boolean
}) {
  const picture = useMemo(() => {
    const paint = Skia.Paint()
    paint.setAntiAlias(true)
    paint.setColor(Skia.Color(earned ? '#ffd84a' : palette.muted))
    paint.setAlphaf(earned ? 1 : crossed ? 0.25 : 0.55)
    const font = matchFont({ fontFamily: 'sans-serif', fontSize: size * 0.62, fontWeight: '900' })
    return createPicture(
      (canvas) => {
        glyph(canvas, id, size, paint, font)
        if (crossed) {
          const x = Skia.Paint()
          x.setAntiAlias(true)
          x.setStyle(1)
          x.setStrokeWidth(Math.max(1.5, size * 0.1))
          x.setColor(Skia.Color('#e2564d'))
          canvas.drawLine(size * 0.15, size * 0.85, size * 0.85, size * 0.15, x)
        }
      },
      { width: size, height: size },
    )
  }, [id, size, earned, crossed])
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  )
}
