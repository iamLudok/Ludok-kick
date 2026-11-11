import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector, type GestureTouchEvent } from 'react-native-gesture-handler'
import type { SharedValue } from 'react-native-reanimated'
import { emptyInput } from '../game/state'
import type { InputFrame } from '../game/types'
import type { ControlsLayout } from '../render/view'

interface Props {
  layout: ControlsLayout
  /** Ancho de la pantalla: la mitad izquierda mueve, la derecha salta y chuta. */
  width: number
  /** Donde se deja lo que el jugador está pulsando; lo lee el bucle del juego. */
  input: SharedValue<InputFrame>
}

/**
 * Convierte los dedos que hay en pantalla en un InputFrame.
 *
 * No hay un «botón» por cada control sino una sola capa que cubre la pantalla
 * y decide por posición. Con botones sueltos, un pulgar que se sale un poco
 * del círculo deja de contar y el muñeco se para en mitad de una jugada; así,
 * cualquier toque en la mitad izquierda mueve y cualquiera en la derecha va al
 * botón más cercano. Además se puede deslizar de izquierda a derecha sin
 * levantar el dedo.
 */
function readTouches(e: GestureTouchEvent, lifted: boolean, layout: ControlsLayout, width: number): InputFrame {
  'worklet'
  const out: InputFrame = { move: 0, jump: false, kick: false, power: false }
  const padCenter = (layout.left.x + layout.right.x) / 2
  const pr = layout.powerR * 1.3
  for (const t of e.allTouches) {
    // Al levantar un dedo, según la plataforma, `allTouches` todavía lo
    // incluye: se descarta a mano para que el botón no se quede pulsado.
    if (lifted && e.changedTouches.some((c) => c.id === t.id)) continue
    // El botón de poder va en medio, justo donde se parten las dos mitades:
    // se mira antes que nada, o un toque en él movería al jugador.
    const px = t.x - layout.power.x
    const py = t.y - layout.power.y
    if (px * px + py * py < pr * pr) {
      out.power = true
      continue
    }
    if (t.x < width / 2) {
      out.move = t.x < padCenter ? -1 : 1
    } else {
      const dJump = Math.abs(t.x - layout.jump.x)
      const dKick = Math.abs(t.x - layout.kick.x)
      if (dJump < dKick) out.jump = true
      else out.kick = true
    }
  }
  return out
}

export function TouchControls({ layout, width, input }: Props) {
  const gesture = useMemo(
    () =>
      // Todo esto corre en el hilo de UI, sin pasar por JavaScript: entre el
      // dedo y el muñeco no hay más espera que la del propio frame.
      Gesture.Manual()
        .onTouchesDown((e, manager) => {
          'worklet'
          input.value = readTouches(e, false, layout, width)
          manager.activate()
        })
        .onTouchesMove((e) => {
          'worklet'
          input.value = readTouches(e, false, layout, width)
        })
        .onTouchesUp((e, manager) => {
          'worklet'
          input.value = readTouches(e, true, layout, width)
          if (e.numberOfTouches === 0) manager.end()
        })
        .onTouchesCancelled((_e, manager) => {
          'worklet'
          input.value = emptyInput()
          manager.end()
        }),
    [input, layout, width],
  )

  // Si la capa desaparece con un dedo puesto (acaba el partido), nadie avisa de
  // que se levantó: sin esto el jugador seguiría corriendo solo en la revancha.
  useEffect(() => {
    return () => {
      input.value = emptyInput()
    }
  }, [input])

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false} />
    </GestureDetector>
  )
}
