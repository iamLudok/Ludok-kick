import { useMemo } from 'react'
import { Canvas, Picture, createPicture } from '@shopify/react-native-skia'
import type { Dj, DjLook } from '../content/djs'
import type { Stage } from '../content/stages'
import { createDjPaints, drawPortrait } from '../render/characters'
import { recordStagePreview } from '../render/draw'

const OUTLINE = '#0a0710'
/** Color de las siluetas de los DJs bloqueados. */
const SHADOW = '#2e2840'

/**
 * El retrato de un DJ, dibujado con el mismo código que en el partido. Si está
 * bloqueado, solo se ve su silueta: intriga sin desvelar cómo es.
 */
export function DjPortrait({
  dj,
  size,
  flip = false,
  locked = false,
}: {
  dj: Dj
  size: number
  flip?: boolean
  locked?: boolean
}) {
  // Se graba una vez por DJ, tamaño y estado: el retrato no cambia.
  const picture = useMemo(() => {
    const look: DjLook = locked
      ? { ...dj.look, jersey: SHADOW, skin: SHADOW, hairColor: SHADOW, accent: SHADOW }
      : dj.look
    const paints = createDjPaints(look, locked ? SHADOW : OUTLINE)
    if (locked) {
      // Hasta los blancos de los ojos y las máscaras, del mismo color.
      for (const p of [paints.white, paints.gold, paints.red, paints.mouseHead, paints.dark, paints.shine]) {
        p.setColor(paints.skin.getColor())
      }
      for (const p of [paints.brow, paints.thinOutline, paints.goldStroke]) p.setColor(paints.skin.getColor())
    }
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
  }, [dj, size, flip, locked])
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
