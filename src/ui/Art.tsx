import { useMemo } from 'react'
import { Canvas, Picture, createPicture } from '@shopify/react-native-skia'
import type { Dj } from '../content/djs'
import type { Stage } from '../content/stages'
import { createDjPaints, drawPortrait } from '../render/characters'
import { recordStagePreview } from '../render/draw'

const OUTLINE = '#0a0710'

/** El retrato de un DJ, dibujado con el mismo código que en el partido. */
export function DjPortrait({ dj, size, flip = false }: { dj: Dj; size: number; flip?: boolean }) {
  // Se graba una vez por DJ y tamaño: el retrato no cambia.
  const picture = useMemo(() => {
    const paints = createDjPaints(dj.look, OUTLINE)
    return createPicture(
      (canvas) => {
        if (flip) {
          // El rival, en la pantalla de resultado, mira hacia ti.
          canvas.translate(size, 0)
          canvas.scale(-1, 1)
        }
        drawPortrait(canvas, paints, size)
      },
      { width: size, height: size },
    )
  }, [dj, size, flip])
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  )
}

/** El escenario en pequeño. */
export function StagePreview({ stage, width, height }: { stage: Stage; width: number; height: number }) {
  const picture = useMemo(() => recordStagePreview(width, height, stage), [stage, width, height])
  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  )
}
