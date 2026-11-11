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
| 4 | Drops en los goles | Hecha |
| 5 | Poderes de DJ y barra de energía | Hecha |
| 6 | Cuatro DJs, tres escenarios, menús y pantalla de resultado | Hecha |
| 7 | Pulido: partículas, focos al ritmo, sonidos de interfaz, icono y splash | Hecha |
| 8 | 11 DJs con su música y su habilidad, pantalla VS | Hecha |
| 9 | Escalera de rivales, logros por rival, monedas, tienda de mejoras, dash y banderas | Hecha |

## Cómo se juega

- **Mitad izquierda de la pantalla**: moverse. No hace falta acertar en las flechas; cuenta
  cualquier toque, y se puede deslizar de un lado a otro sin levantar el dedo. **Doble toque**
  rápido a un lado: dash.
- **Mitad derecha**: chutar (bota, hacia dentro) y saltar (flecha, en el extremo). Va al botón
  que quede más cerca del dedo.
- **Botón central**: el poder, cuando lo tienes.
- El cabezazo sale solo al chocar con la cabeza.
- Con el botón de chutar, el momento importa: si el pie pilla el vinilo al principio del
  barrido sale raso y rápido; si lo pilla al final, bombeado.
- **Rematar al ritmo**: cada toque al vinilo (pie o cabeza) se mide contra el bombo más
  cercano. A menos de 80 ms es PERFECT y el tiro sale un 35 % más fuerte; a menos de 160 ms
  es GOOD, un 15 % más. El anillo que se cierra sobre tu jugador llega a la cabeza justo en el
  beat, y el suelo y los bafles laten con él.
- **Cada DJ pone su música**, a su tempo, de 122 a 145 BPM. El tempo no cambia durante el
  partido ni la velocidad del juego: un techno suena más rápido que un house, pero los muñecos
  corren igual. Las ventanas de PERFECT y GOOD son siempre la misma fracción del beat.
- **Cada gol es un drop**: el partido se congela mientras la música se cierra y sube la
  tensión; en el primer beat a partir de unos 0,75 s cae el drop (bombo, bajo e impacto), la
  onda expansiva lanza por los aires al que encajó y tiembla la cámara. Luego se saca.
- Empate al acabar el tiempo: gol de oro.

## Los DJs

Once caricaturas con nombres guiño a DJs conocidos (no se nombra a nadie, así que el APK se
puede compartir). Cada uno pone su género y tiene su habilidad propia; arriba, en el partido,
lleva la bandera de su país junto a su barra de power. Solo están los que se reconocen de un
vistazo por algún rasgo (la calva, el flequillo, el pelo verde, la máscara): en el partido las
cabezas son pequeñas y un DJ sin rasgo propio se confunde con otro. Se empieza con Ludok; el
resto se desbloquea ganándole en la escalera.

| Escalón | DJ | País | Música | Habilidad | IA |
|---|---|---|---|---|---|
| — | **Ludok** (inicial) | Euskadi | Melodic techno · 124 | Scratch | — |
| 1 | **Karl Box** | Reino Unido | Techno · 130 | Bombo | Warm-up |
| 2 | **Marsmelou** | EE. UU. | Future bounce · 128 | Nube | Warm-up |
| 3 | **Ritxi Hautin** | Canadá | Minimal · 125 | Loop | Warm-up |
| 4 | **Mis Monik** | Ucrania | Progressive house · 124 | Rayo | Peak Time |
| 5 | **Deadmouse** | Canadá | Progressive · 128 | Cabeza gigante | Peak Time |
| 6 | **Daft Funk** | Francia | French house · 124 | Modo robot | Peak Time |
| 7 | **Solomoon** | Bosnia | Melodic house · 122 | Luna | Peak Time |
| 8 | **Klaptone** | Alemania | Deep house · 122 | Alas | Closing |
| 9 | **Boris Bretxa** | Alemania | High-tech minimal · 126 | Bufón | Closing |
| 10 | **I Hait Mudel** | Francia | Techno industrial · 145 | Apagón | Closing |

## La escalera, los logros y la tienda

Como el arcade de Head Soccer:

- **Escalera de rivales.** Se empieza con Ludok y solo contra el primero; ganarle abre el
  siguiente y lo desbloquea para jugar con él. La IA sube de nivel con la escalera (Warm-up,
  Peak Time, Closing) y sus estadísticas también (las del escalón 1 a 10).
- **Logros por rival** (ocho insignias contra cada uno): gana sin encajar, por 5 goles, con gol
  de oro, sin usar tu habilidad, sin dash, sin chutar, sin saltar, y gánale 10 veces. Se ven en
  la escalera, y durante el partido los de «sin…» se tachan en cuanto dejan de ser posibles.
- **Monedas y tienda.** Cada partido da monedas (más ganando, más arriba en la escalera y por
  cada logro nuevo). En la tienda se mejoran tus cinco estadísticas, de 0 a 10: velocidad,
  tiro, salto, dash y power (lo rápido que se llena la barra). Son tuyas y valen con
  cualquier DJ: los DJs se diferencian solo por su habilidad.

Todo sale del historial de partidos (más las monedas y los niveles, en los ajustes), así que la
copia de seguridad se lleva el progreso entero. El truco de las 7 pulsaciones en el título
abre toda la escalera y todos los DJs, para probar.



Nombres, colores, países y géneros están en `src/content/djs.ts`; las bases, en
`src/content/genres.ts`; la escalera y los logros, en `src/content/ladder.ts`; las mejoras, en
`src/game/upgrades.ts`. Para que el poder salga al
azar en vez de ser el del DJ, `POWER.SIGNATURE` en `src/game/constants.ts`.

## Los escenarios

| Escenario | Cómo se ve |
|---|---|
| **Warehouse, Bilbao** | Nave industrial: ventanales, pilares de acero, luz de sodio |
| **Atardecer, Donostia** | La bahía al atardecer: el sol sobre el mar, la isla, los montes |
| **Caserío rave** | Muro de piedra, cercha de madera y guirnaldas de bombillas |

El escenario es solo cómo se ve: la música la pone tu DJ. Todo está dibujado y sintetizado por
código.

## Poderes de DJ

Cada remate PERFECT llena un cuarto de la barra de energía (el anillo del botón central y la
barra junto a tu marcador). Llena, tienes lista la habilidad de tu DJ, que aparece en el botón;
se lanza al pulsarlo.

| Habilidad | Qué hace |
|---|---|
| **Scratch** | Tu siguiente tiro lleva un efecto que lo hunde hacia la portería |
| **Bombo** | Pisotón con onda: lanza al rival y despeja el vinilo hacia la portería contraria |
| **Manos arriba** | Saltas muchísimo más durante 5 s |
| **Modo robot** | El rival se queda congelado 1,5 s |
| **Cabeza gigante** | Tu cabeza crece durante 5 s |
| **Nube** | El vinilo se vuelve ligero y botón durante 5 s |
| **Muro** | Un bafle tapa tu portería durante 4 s |
| **Rayo** | Tu siguiente tiro sale recto y rapidísimo, sin caer |
| **Low-pass** | El rival a cámara lenta 3 s, y la música amortiguada menos el bombo |
| **Loop** | El vinilo se queda flotando 1,5 s; si iba por el suelo, sube a altura de volea |
| **Luna** | Gravedad baja para todos durante 5 s |
| **Alas** | Planeas al caer y tienes un salto en el aire, durante 5 s |
| **Bufón** | Al rival se le cambian izquierda y derecha 3 s (a la IA también la lía) |
| **Apagón** | El rival pierde lo que tuviera cargado y se queda 6 s sin cargar ni lanzar nada |

Manos arriba, Muro y Low-pass no las lleva ahora ningún DJ (eran de los que se quitaron). Siguen
en el juego y probadas: salen si se juega con habilidades al azar (`POWER.SIGNATURE = false`) o
si se le dan a un DJ nuevo.

La IA también carga energía con sus PERFECT y usa sus poderes: los niveles altos esperan al
momento bueno (el Muro con un tiro yendo a su portería, el Loop con el vinilo delante, el Low-pass en
plena disputa); los bajos los sueltan cuando sea.

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
  lleva su tempo; el juego cuenta los beats desde el compás que suena y de ahí saca sus
  ventanas. Durante la subida de un drop el tempo no se mueve, para que el
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
| `verify/powers.ts` | La barra de energía (solo la llenan los PERFECT) y las 14 habilidades, una por una: que se lanzan una vez por pulsación y que cada una hace lo que dice (el Muro para un tiro que era gol, la Cabeza gigante remata lo que la normal no alcanza, el Rayo no cae…) |
| `verify/characters.ts` | Que cada DJ tiene su ventaja y su poder, que ninguno gana o pierde casi siempre (la IA contra sí misma con cada pareja de DJs), que todas las bases dejan el bombo en las negras y que lo que llega por la ruta se lee bien aunque venga roto |
| `verify/ladder.ts` | La escalera (cada victoria abre el siguiente escalón y desbloquea a ese DJ), los ocho logros por rival y las monedas, contra historiales inventados |
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

Para ver los fps y los milisegundos de trabajo por frame durante el partido: **Ajustes →
Mostrar rendimiento**.

## Estructura

```
app/                 Rutas (expo-router): menú, elegir, partido, resultado, tienda y ajustes.
src/game/            El juego en sí. Sin React, sin Skia, sin nada nativo.
  constants.ts       Toda la configuración de jugabilidad.
  types.ts           El estado del partido y el InputFrame.
  state.ts           Estado inicial y saque.
  step.ts            La simulación: física, goles, reloj y remate al ritmo.
  beat.ts            La aritmética del beat (distancia, fase, juicio).
  ai.ts              El rival: una fuente de inputs más, como los botones.
  rng.ts             Azar con semilla: el mismo partido con los mismos inputs.
src/audio/           La música y el reloj. Lo único que importa la librería de audio.
  engine.ts          El AudioContext y los buses.
  synth.ts           Los instrumentos y los efectos, sintetizados.
  patterns.ts        Las bases, como rejillas de 16 pasos.
  sequencer.ts       Programa las notas con antelación, compás a compás, y prepara los drops.
  clock.ts           El reloj de audio leído desde el hilo del juego.
  useAudioSession.ts Enciende y apaga todo con la pantalla y con la app.
src/content/         Los DJs y los escenarios: nombres, ventajas, colores, decorado y música.
  djs.ts             Los once DJs.
  genres.ts          La música de cada DJ, con su tempo.
  ladder.ts          La escalera de rivales y los logros.
  stages.ts          Los tres escenarios.
  setup.ts           Lo que define un partido, de ida y vuelta por la ruta.
src/render/          Cómo se ve. Todo pintado por código con Skia.
  characters.ts      Los DJs: cabeza, peinados, gafas, retratos.
  decor.ts           Los decorados de fondo de cada escenario.
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

## Icono y splash

Los dibujos fuente están en `assets/src/` como SVG: un vinilo con auriculares sobre el morado
Ludok. Los PNG se generan con:

```bash
./scripts/icons.sh     # necesita ImageMagick con librsvg
```

Hay icono adaptable de Android (capa delantera sobre fondo morado) y versión monocroma para los
iconos temáticos de Android 13 en adelante. Tras cambiar el icono o el splash hay que borrar
`android/` antes de compilar, para que `expo prebuild` lo regenere con los dibujos nuevos.

## Dirección de arte

Cartoon legible en pantalla pequeña: cabezas enormes, cuerpo mínimo, contorno oscuro grueso y
colores planos. Cada DJ se distingue por silueta y por un color propio. Los escenarios son
oscuros y de pocas capas, para que el vinilo (negro, con borde claro y etiqueta de color) sea
siempre lo más fácil de seguir. El morado Ludok (`#7A45C4`) es el color de la interfaz.

Ahora mismo todo son formas pintadas por código. Cada cosa tiene su función de dibujo en
`src/render/draw.ts`; cambiar a sprites es cambiar el cuerpo de esas funciones.
