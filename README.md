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
| 2 | Motor de beat: música sintetizada, remate al ritmo (PERFECT / GOOD), calibración de latencia, ajustes y copia de seguridad | Hecha |
| 3 | IA con tres niveles (Warm-up, Peak Time, Closing) e historial de partidos | Hecha |
| 4 | Drops en los goles y BPM que sube con el partido | Hecha |
| 5 | Poderes de DJ y barra de energía | Pendiente |
| 6 | Cuatro DJs, tres escenarios, menús y pantalla de resultado | Pendiente |
| 7 | Pulido: partículas, sacudida de cámara, icono y splash | Pendiente |

## Cómo se juega

- **Mitad izquierda de la pantalla**: moverse. No hace falta acertar en las flechas; cuenta
  cualquier toque, y se puede deslizar de un lado a otro sin levantar el dedo.
- **Mitad derecha**: saltar (flecha) y chutar (bota). Va al botón que quede más cerca del dedo.
- El cabezazo sale solo al chocar con la cabeza.
- Con el botón de chutar, el momento importa: si el pie pilla el vinilo al principio del
  barrido sale raso y rápido; si lo pilla al final, bombeado.
- **Rematar al ritmo**: cada toque al vinilo (pie o cabeza) se mide contra el bombo más
  cercano. A menos de 80 ms es PERFECT y el tiro sale un 35 % más fuerte; a menos de 160 ms
  es GOOD, un 15 % más. El anillo que se cierra sobre tu jugador llega a la cabeza justo en el
  beat, y el suelo y los bafles laten con él.
- **El tempo sube**: de 120 BPM al empezar a 145 al acabar. Con él sube la velocidad del juego
  (al final todo va un 21 % más rápido) y se encogen las ventanas de PERFECT y GOOD, que son
  siempre la misma fracción del beat. El reloj del partido sigue marcando segundos de verdad.
- **Cada gol es un drop**: el partido se congela mientras la música se cierra y sube la
  tensión; en el primer beat a partir de unos 0,75 s cae el drop (bombo, bajo e impacto), la
  onda expansiva lanza por los aires al que encajó y tiembla la cámara. Luego se saca.
- Empate al acabar el tiempo: gol de oro.

## El rival

Tres niveles: **Warm-up**, **Peak Time** y **Closing**. La IA juega con los mismos botones y
la misma física que tú: no corre más ni chuta más fuerte. Lo que cambia entre niveles es
cuánto tarda en reaccionar, cuánto falla al calcular dónde caerá el vinilo, cuánto se queda en
blanco, cuánto se atreve a subir y, sobre todo, cuánto busca el beat: en Closing, dos de cada
tres chutes suyos son PERFECT.

No decide en cada frame sino cada cierto tiempo, como una persona que mira y reacciona; entre
decisión y decisión sigue con el plan que tenía. Su azar sale de una semilla y no de
`Math.random`, así que un partido se puede repetir exacto, y eso es lo que permite probarla.

## Lo que manda: que el ritmo sea justo

Un juego que premia rematar a tiempo solo es justo si «a tiempo» significa lo mismo para el
juego que para tu oído. Tres decisiones lo sostienen:

- **El reloj de audio es la única fuente de verdad del beat.** La música no se dispara con
  temporizadores de JavaScript: cada nota se programa con antelación para un instante exacto
  del reloj de audio, y el juego pregunta la hora a ese mismo reloj. Si la app da un tirón, la
  música no se entera y el juicio tampoco.
- **El tempo lo decide la música y el juego lo obedece.** Cada compás empieza en un beat y
  lleva su tempo; el juego cuenta los beats desde el compás que suena y de ahí saca su
  velocidad y sus ventanas. Durante la subida de un drop el tempo no se mueve, para que el
  drop caiga exactamente en el beat que se anunció.
- **Se juzga lo que oyes, no lo que el móvil manda al altavoz.** Entre una cosa y otra pasan
  unas decenas de milisegundos con el altavoz del móvil y hasta 300 con auriculares Bluetooth.
  Ese desfase se resta antes de juzgar y antes de pintar el anillo.
- **El desfase se puede calibrar** en Ajustes, tocando al ritmo de un metrónomo. Sin
  calibrar se usa el que el propio móvil dice tener. Con Bluetooth, calibrar es
  imprescindible; aun así, el *sonido* del golpe se oirá tarde, y eso no tiene arreglo.

## Tus datos

Sin cuentas ni servidores. Los ajustes y el historial de partidos se guardan en una base
SQLite dentro del almacenamiento privado de la app. Desde Ajustes se exporta todo a un
fichero JSON con el menú de compartir del sistema, y se importa de vuelta.

La calibración de audio no viaja en la copia: es una medida de un móvil concreto con unos
auriculares concretos, y restaurada en otro aparato haría injustos todos los remates sin que
se notara por qué.

## Arranque

```bash
npm install
npm run android     # compila la versión de desarrollo y la abre en el móvil conectado por adb
```

Hace falta **development build**: Skia, el audio y el resto de módulos nativos no van en Expo Go.

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

Los scripts de `verify/` ejecutan en el ordenador **el mismo código que corre en el móvil**:

| Script | Qué comprueba |
|---|---|
| `verify/physics.ts` | Que el vinilo no se sale del campo ni se queda atrapado, que los goles se cuentan en el lado correcto, que el reloj acaba el partido o da paso al gol de oro, que ningún lado tiene ventaja y que el resultado es el mismo a 60 que a 120 Hz |
| `verify/beat.ts` | La cuenta del ritmo: a qué distancia del beat cae un toque, qué juicio le toca, que el tiro sale con su potencia, que el tempo sube y encoge las ventanas, y que el drop cae cuando dice la música |
| `verify/sequencer.ts` | La música, con un motor de audio de mentira que apunta qué se programa: bombos en los beats, tempo que cambia solo entre compases, drop en un beat y sin bombo ni bajo durante la subida |
| `verify/ai.ts` | Enfrenta los niveles entre sí y contra un rival quieto: que están ordenados, que los altos rematan más al ritmo, que nunca se atascan y que no se meten goles en propia |
| `verify/data.ts` | Ida y vuelta de la copia de seguridad contra un SQLite de escritorio: que nada se pierde ni se mezcla y que se rechaza lo que hay que rechazar |
| `verify/library.ts` | Las reglas de ajustes, calibración e historial |
| `verify/migration.ts` | Que el SQL del esquema y las tablas de Drizzle describen lo mismo |

No comprueban si es divertido ni cómo suena: eso solo se sabe jugando.

## Ajustar la sensación de juego

Todos los números de jugabilidad están en **`src/game/constants.ts`** y en ningún otro sitio:
velocidades, gravedad, rebotes, fuerza del chut, tamaño de las porterías, duración del
partido, tempo, ventanas de PERFECT y GOOD y cuánto premian, y la personalidad de cada nivel
de la IA (`AI`). Cada uno lleva al lado para qué sirve.

Para ver los fps y los milisegundos de trabajo por frame, `DEBUG.OVERLAY` en ese mismo fichero.

## Estructura

```
app/                 Rutas (expo-router): menú, partido y ajustes.
src/game/            El juego en sí. Sin React, sin Skia, sin nada nativo.
  constants.ts       Toda la configuración de jugabilidad.
  types.ts           El estado del partido y el InputFrame.
  state.ts           Estado inicial y saque.
  step.ts            La simulación: física, goles, reloj y remate al ritmo.
  beat.ts            La aritmética del beat (distancia, fase, juicio).
  ai.ts              El rival: una fuente de inputs más, como los botones.
src/audio/           La música y el reloj. Lo único que importa la librería de audio.
  engine.ts          El AudioContext y los buses.
  synth.ts           Los instrumentos y los efectos, sintetizados.
  patterns.ts        Las bases, como rejillas de 16 pasos.
  sequencer.ts       Programa las notas con antelación, compás a compás, y prepara los drops.
  clock.ts           El reloj de audio leído desde el hilo del juego.
  useAudioSession.ts Enciende y apaga todo con la pantalla y con la app.
src/render/          Cómo se ve. Todo pintado por código con Skia.
  draw.ts            Una función por cosa que se pinta (jugador, vinilo, botones…).
  stage.ts           La paleta del escenario.
  view.ts            Cómo encaja el campo en la pantalla y dónde van los botones.
src/lib/             Los datos: esquema, ajustes, historial y copias.
  db.ts              El único fichero que importa expo-sqlite.
  dbRef.ts           Por aquí pide la base todo lo demás (y por eso se puede probar en Node).
src/ui/              Pantallas, marcador, controles táctiles y tokens de la interfaz.
verify/              Pruebas del núcleo y de los datos, ejecutadas en Node.
scripts/build-apk.sh Compila y firma el APK.
```

Tres decisiones sostienen el resto:

- **El juego no sabe de dónde vienen los inputs.** `stepGame` recibe un `InputFrame` por
  jugador y le da igual que lo produzcan los botones táctiles, la IA (`stepAi`) o (más
  adelante) otro móvil. Es lo que permitirá añadir dos jugadores sin tocar la física.
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
