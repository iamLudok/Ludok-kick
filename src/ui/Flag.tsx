import { useMemo } from 'react'
import { Canvas, Picture, Skia, createPicture, type SkCanvas } from '@shopify/react-native-skia'
import type { Country } from '../content/djs'

/** Una bandera de 3:2 dibujada por código. Simplificadas: a este tamaño los detalles no se ven. */
function draw(canvas: SkCanvas, c: Country, w: number, h: number): void {
  const p = (color: string) => {
    const paint = Skia.Paint()
    paint.setAntiAlias(true)
    paint.setColor(Skia.Color(color))
    return paint
  }
  const line = (color: string, width: number) => {
    const paint = p(color)
    paint.setStyle(1)
    paint.setStrokeWidth(width)
    return paint
  }
  const rect = (x: number, y: number, rw: number, rh: number, color: string) =>
    canvas.drawRect({ x, y, width: rw, height: rh }, p(color))
  switch (c) {
    case 'fr':
      rect(0, 0, w / 3, h, '#0055a4')
      rect(w / 3, 0, w / 3, h, '#ffffff')
      rect((2 * w) / 3, 0, w / 3, h, '#ef4135')
      break
    case 'de':
      rect(0, 0, w, h / 3, '#000000')
      rect(0, h / 3, w, h / 3, '#dd0000')
      rect(0, (2 * h) / 3, w, h / 3, '#ffce00')
      break
    case 'ua':
      rect(0, 0, w, h / 2, '#0057b7')
      rect(0, h / 2, w, h / 2, '#ffd700')
      break
    case 'ca': {
      rect(0, 0, w, h, '#ffffff')
      rect(0, 0, w / 4, h, '#d52b1e')
      rect((3 * w) / 4, 0, w / 4, h, '#d52b1e')
      // La hoja de arce, reducida a un rombo con tallo.
      const leaf = Skia.Path.Make()
      leaf.moveTo(w / 2, h * 0.18)
      leaf.lineTo(w * 0.64, h * 0.5)
      leaf.lineTo(w / 2, h * 0.72)
      leaf.lineTo(w * 0.36, h * 0.5)
      leaf.close()
      canvas.drawPath(leaf, p('#d52b1e'))
      rect(w / 2 - 1, h * 0.7, 2, h * 0.14, '#d52b1e')
      break
    }
    case 'us':
      for (let i = 0; i < 7; i++) rect(0, (i * 2 * h) / 13, w, h / 13, '#b22234')
      for (let i = 0; i < 6; i++) rect(0, ((i * 2 + 1) * h) / 13, w, h / 13, '#ffffff')
      rect(0, 0, w * 0.42, (h * 7) / 13, '#3c3b6e')
      break
    case 'gb':
      rect(0, 0, w, h, '#012169')
      canvas.drawLine(0, 0, w, h, line('#ffffff', h * 0.22))
      canvas.drawLine(w, 0, 0, h, line('#ffffff', h * 0.22))
      canvas.drawLine(0, 0, w, h, line('#c8102e', h * 0.08))
      canvas.drawLine(w, 0, 0, h, line('#c8102e', h * 0.08))
      rect(w / 2 - h * 0.17, 0, h * 0.34, h, '#ffffff')
      rect(0, h / 2 - h * 0.17, w, h * 0.34, '#ffffff')
      rect(w / 2 - h * 0.1, 0, h * 0.2, h, '#c8102e')
      rect(0, h / 2 - h * 0.1, w, h * 0.2, '#c8102e')
      break
    case 'ba': {
      rect(0, 0, w, h, '#002395')
      const tri = Skia.Path.Make()
      tri.moveTo(w * 0.28, 0)
      tri.lineTo(w * 0.78, 0)
      tri.lineTo(w * 0.78, h)
      tri.close()
      canvas.drawPath(tri, p('#fecb00'))
      for (let i = 0; i < 7; i++)
        canvas.drawCircle(w * 0.22 + i * w * 0.075, h * 0.08 + i * h * 0.14, h * 0.045, p('#ffffff'))
      break
    }
    case 'eus':
      // Ikurriña: fondo rojo, aspa verde y cruz blanca encima.
      rect(0, 0, w, h, '#d52b1e')
      canvas.drawLine(0, 0, w, h, line('#009b48', h * 0.16))
      canvas.drawLine(w, 0, 0, h, line('#009b48', h * 0.16))
      rect(w / 2 - h * 0.07, 0, h * 0.14, h, '#ffffff')
      rect(0, h / 2 - h * 0.07, w, h * 0.14, '#ffffff')
      break
  }
}

export function Flag({ country, height = 16 }: { country: Country; height?: number }) {
  const w = Math.round(height * 1.5)
  const picture = useMemo(
    () =>
      createPicture(
        (canvas) => {
          draw(canvas, country, w, height)
          // Un borde fino: las banderas con blanco se pierden sobre fondos claros.
          const edge = Skia.Paint()
          edge.setStyle(1)
          edge.setStrokeWidth(1)
          edge.setColor(Skia.Color('rgba(0,0,0,0.5)'))
          canvas.drawRect({ x: 0.5, y: 0.5, width: w - 1, height: height - 1 }, edge)
        },
        { width: w, height },
      ),
    [country, w, height],
  )
  return (
    <Canvas style={{ width: w, height }}>
      <Picture picture={picture} />
    </Canvas>
  )
}
