# Ludok Kick

Un 1 contra 1 arcade de DJs cabezones. Vista lateral, partidos de 90 segundos, la pelota es
un vinilo y las porterías son bafles. La música no va de fondo: marca el ritmo del partido y
premia rematar a tiempo.

Forma parte de la familia de apps Ludok. Android, hecha con Expo SDK 57.

## Estado

El juego se construye por fases, y cada una se prueba en el móvil antes de pasar a la
siguiente.

| Fase | Qué trae | Estado |
|---|---|---|
| 1 | Prototipo de física: campo, dos jugadores (el rival quieto), vinilo, porterías, goles, marcador y reloj | Hecha |
| 2 | Motor de beat: música sintetizada, remate al ritmo (PERFECT / GOOD), calibración de latencia | Pendiente |
| 3 | IA con tres niveles | Pendiente |
| 4 | Drops en los goles y BPM que sube con el partido | Pendiente |
| 5 | Poderes de DJ y barra de energía | Pendiente |
| 6 | Cuatro DJs, tres escenarios, menús y pantalla de resultado | Pendiente |
| 7 | Pulido: partículas, sacudida de cámara, icono y splash | Pendiente |

## Cómo se juega (fase 1)

- **Mitad izquierda de la pantalla**: moverse. No hace falta acertar en las flechas; cuenta
  cualquier toque, y se puede deslizar de un lado a otro sin levantar el dedo.
- **Mitad derecha**: saltar (flecha) y chutar (bota). Va al botón que quede más cerca del dedo.
- El cabezazo sale solo al chocar con la cabeza.
- Con el botón de chutar, el momento importa: si el pie pilla el vinilo al principio del
  barrido sale raso y rápido; si lo pilla al final, bombeado.
- Empate al acabar el tiempo: gol de oro.

## Arranque

```bash
npm install
npm run android     # compila la versión de desarrollo y la abre en el móvil conectado por adb
```

Hace falta **development build**: Skia y el resto de módulos nativos no van en Expo Go.

Requisitos: JDK 17, Android SDK con API 36 y `adb`.

## Compilar el APK

```bash
./scripts/build-apk.sh --compartir   # solo arm64-v8a, para instalar en un móvil
adb install -r ludok-kick-v1.0.0.apk
```

Tiene que ser el de release: en el de desarrollo el JavaScript se carga del ordenador y, sobre
todo, **va mucho más lento**. Los fps solo significan algo medidos en release.

Antes de cada APK que se vaya a instalar encima de otro, sube `android.versionCode` en
`app.json`.

## ⚠️ El keystore

La firma vive en `release.jks` y `keystore.properties`, los dos fuera del repo. Guárdalos junto
a tus copias de seguridad: Android solo deja instalar un APK encima de otro si van firmados con
la misma clave. Si se pierden, la única salida es desinstalar para poner la versión nueva, y
desinstalar borra los ajustes y el historial de partidos.

## Verificación

```bash
npm run typecheck
npm run verify
```

`verify/physics.ts` ejecuta en el ordenador **el mismo código de juego que corre en el
móvil** y comprueba lo que tiene que cumplirse siempre: que el vinilo no se sale del campo ni
se queda atrapado, que los goles se cuentan en el lado correcto, que el reloj acaba el partido
o da paso al gol de oro, que ningún lado tiene ventaja y que el resultado es el mismo se pinte
a 60 o a 120 Hz. No comprueba si es divertido: eso solo se ve jugando.

## Ajustar la sensación de juego

Todos los números de jugabilidad están en **`src/game/constants.ts`** y en ningún otro sitio:
velocidades, gravedad, rebotes, fuerza del chut, tamaño de las porterías, duración del
partido. Cada uno lleva al lado para qué sirve.

Para ver los fps y los milisegundos de trabajo por frame, `DEBUG.OVERLAY` en ese mismo fichero.

## Estructura

```
app/                 Rutas (expo-router). De momento, solo el partido.
src/game/            El juego en sí. Sin React, sin Skia, sin nada nativo.
  constants.ts       Toda la configuración de jugabilidad.
  types.ts           El estado del partido y el InputFrame.
  state.ts           Estado inicial y saque.
  step.ts            La simulación: física, goles y reloj.
src/render/          Cómo se ve. Todo pintado por código con Skia.
  draw.ts            Una función por cosa que se pinta (jugador, vinilo, botones…).
  stage.ts           La paleta del escenario.
  view.ts            Cómo encaja el campo en la pantalla y dónde van los botones.
src/ui/              Pantallas, marcador, controles táctiles y tokens de la interfaz.
verify/              Pruebas del núcleo, ejecutadas en Node.
scripts/build-apk.sh Compila y firma el APK.
```

Tres decisiones sostienen el resto:

- **El juego no sabe de dónde vienen los inputs.** `stepGame` recibe un `InputFrame` por
  jugador y le da igual que lo produzcan los botones táctiles, la IA o (más adelante) otro
  móvil. Es lo que permitirá añadir dos jugadores sin tocar la física.
- **La simulación va a paso fijo** (120 pasos por segundo) y es determinista: los mismos
  inputs dan siempre el mismo partido. Se ve fluida en cualquier pantalla porque el dibujo se
  adelanta lo que quede sin simular.
- **Simulación y dibujo corren en el hilo de UI**, no en el de JavaScript: los botones no
  esperan a React y un tirón de JavaScript no para el partido.

## Dirección de arte

Cartoon legible en pantalla pequeña: cabezas enormes, cuerpo mínimo, contorno oscuro grueso y
colores planos. Cada DJ se distingue por silueta y por un color propio. Los escenarios son
oscuros y de pocas capas, para que el vinilo (negro, con borde claro y etiqueta de color) sea
siempre lo más fácil de seguir. El morado Ludok (`#7A45C4`) es el color de la interfaz.

Ahora mismo todo son formas pintadas por código. Cada cosa tiene su función de dibujo en
`src/render/draw.ts`; cambiar a sprites es cambiar el cuerpo de esas funciones.
