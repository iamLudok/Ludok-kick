/**
 * Los DJs. Son homenajes: caricaturas con nombres guiño que recuerdan a DJs
 * conocidos. A propósito no se nombra a quién recuerdan (ni aquí en la
 * interfaz ni en ninguna parte): el guiño se entiende solo, y así el APK se
 * puede compartir sin usar el nombre de nadie.
 *
 * Cada uno pone su música (su género, a su tempo) y tiene su habilidad
 * propia. Las estadísticas no son del DJ sino tuyas (ver `src/game/upgrades.ts`). Todo lo que distingue a un DJ está aquí: para
 * cambiar un nombre, un color o un número no hay que tocar nada más.
 */
import type { PowerKind } from "../game/types";
import type { GenreId } from "./genres";

export type DjId =
  | "ludok"
  | "karl"
  | "daft"
  | "deadmouse"
  | "marsmelou"
  | "mismonik"
  | "ritxie"
  | "solomoon"
  | "klaptone"
  | "boris"
  | "ihm";

export type DjLook = {
  /** Camiseta: el color que identifica al DJ en el campo. */
  jersey: string;
  skin: string;
  hairColor: string;
  /** Peinado. Es lo que hace reconocible la silueta. */
  hair:
    | "bald"
    | "buzz"
    | "short"
    | "side"
    | "spiky"
    | "slick"
    | "quiff"
    | "fringe"
    | "messy"
    | "long"
    | "longBack"
    | "longCenter"
    | "bob"
    | "bobSide"
    | "bobCenter"
    | "bun"
    | "hood";
  /** Lo que tapa la cara, si algo. Con casco, cubo o cabeza de ratón, el peinado no se ve. */
  mask: "none" | "robot" | "mouse" | "marsh" | "beak" | "jester" | "buff";
  glasses: "none" | "round" | "rect" | "thick";
  mouth: "grin" | "smile" | "smirk" | "neutral" | "open";
  brows: "frown" | "flat" | "raised";
  facialHair: "none" | "stubble" | "goatee" | "beard";
  headphones: boolean;
  /** Raya de ojos: un trazo hacia fuera desde el rabillo. */
  eyeliner: boolean;
  hat: "none" | "tophat";
  /** Mechones de otro color en la parte de delante (el verde de Mis Monik). */
  streaks?: string;
  /** Color de detalle: la capucha, el casco, el buff, los auriculares… */
  accent: string;
  /** Si los tiene, el color de detalle se sortea entre estos en cada partido. */
  accents?: string[];
};

export type Dj = {
  id: DjId;
  name: string;
  genre: GenreId;
  /** Su habilidad. Es lo único de juego que distingue a un DJ: las estadísticas son tuyas. */
  power: PowerKind;
  /** De dónde es, para la bandera del marcador. */
  origin: Country;
  look: DjLook;
};

/** Países de origen, con bandera dibujada en `src/ui/Flag.tsx`. */
export type Country = "eus" | "gb" | "fr" | "ca" | "us" | "ua" | "ba" | "de";

const look = (l: Partial<DjLook> & Pick<DjLook, "jersey">): DjLook => ({
  skin: "#f2c8a0",
  hairColor: "#2a1d16",
  hair: "short",
  mask: "none",
  glasses: "none",
  mouth: "neutral",
  brows: "flat",
  facialHair: "none",
  headphones: false,
  eyeliner: false,
  hat: "none",
  accent: "#2a2a32",
  ...l,
});

export const DJS: Dj[] = [
  {
    id: "ludok",
    name: "Ludok",
    genre: "melotechno",
    power: "scratch",
    origin: "eus",
    // Pelo castaño corto, gafas redondas de pasta y jersey verde oscuro.
    look: look({
      jersey: "#24382c",
      hairColor: "#3a2416",
      hair: "side",
      glasses: "round",
      mouth: "smile",
      accent: "#24382c",
    }),
  },
  {
    id: "karl",
    name: "Karl Box",
    genre: "techno",
    power: "stomp",
    origin: "gb",
    look: look({
      jersey: "#1d1d24",
      skin: "#5e3a28",
      hair: "bald",
      mouth: "grin",
      brows: "raised",
    }),
  },
  {
    id: "daft",
    name: "Daft Funk",
    genre: "french",
    power: "robot",
    origin: "fr",
    look: look({ jersey: "#2b2b33", mask: "robot", accent: "#d9b44a" }),
  },
  {
    id: "deadmouse",
    name: "Deadmouse",
    genre: "progressive",
    power: "bighead",
    origin: "ca",
    // La cabeza es negra; la boca cambia de color de un partido a otro, como
    // sus luces en directo (ver `forMatch`).
    look: look({
      jersey: "#1d1d24",
      mask: "mouse",
      accent: "#f2c230",
      accents: [
        "#f2c230",
        "#e8323c",
        "#3ad86b",
        "#2f8fff",
        "#c04cff",
        "#f3f1ec",
      ],
    }),
  },
  {
    id: "marsmelou",
    name: "Marsmelou",
    genre: "bounce",
    power: "cloud",
    origin: "us",
    look: look({ jersey: "#f3f1ec", mask: "marsh", accent: "#ffffff" }),
  },
  {
    id: "mismonik",
    name: "Mis Monik",
    genre: "proghouse",
    power: "laser",
    origin: "ua",
    look: look({
      jersey: "#141218",
      skin: "#f3d3bd",
      hairColor: "#4a3426",
      hair: "bobCenter",
      streaks: "#7cff3a",
      mouth: "smile",
    }),
  },
  {
    id: "ritxie",
    name: "Ritxi Hautin",
    genre: "minimal",
    power: "loop",
    origin: "ca",
    look: look({
      jersey: "#6b6b66",
      hairColor: "#e8b84a",
      hair: "fringe",
      facialHair: "stubble",
      brows: "flat",
    }),
  },
  {
    id: "solomoon",
    name: "Solomoon",
    genre: "melodic",
    power: "moon",
    origin: "ba",
    look: look({
      jersey: "#b49a7a",
      skin: "#e2b48e",
      hairColor: "#6b5236",
      hair: "longCenter",
      facialHair: "beard",
      brows: "frown",
    }),
  },
  {
    id: "klaptone",
    name: "Klaptone",
    genre: "deep",
    power: "wings",
    origin: "de",
    look: look({
      jersey: "#1d1d24",
      hairColor: "#1a1410",
      hair: "short",
      facialHair: "beard",
      mask: "beak",
      hat: "tophat",
      accent: "#e0b84a",
    }),
  },
  {
    id: "boris",
    name: "Boris Bretxa",
    genre: "hightech",
    power: "jester",
    origin: "de",
    look: look({ jersey: "#1d1d24", mask: "jester", accent: "#2f7fb0" }),
  },
  {
    id: "ihm",
    name: "I Hait Mudel",
    genre: "industrial",
    power: "blackout",
    origin: "fr",
    look: look({
      jersey: "#0e0e12",
      hairColor: "#4a4e58",
      hair: "messy",
      mask: "buff",
      accent: "#15151a",
      brows: "frown",
    }),
  },
];

/** El DJ con el que se empieza; los demás se desbloquean con misiones. */
export const STARTER: DjId = "ludok";

export function getDj(id: string | undefined): Dj {
  return DJS.find((d) => d.id === id) ?? DJS[0];
}

export function isDjId(value: unknown): value is DjId {
  return typeof value === "string" && DJS.some((d) => d.id === value);
}

/**
 * El DJ tal como sale a un partido: si cambia de color (Deadmouse), aquí se
 * sortea cuál le toca. Se llama una vez por partido para que la cara del VS y
 * la del campo coincidan.
 */
export function forMatch(dj: Dj, random: () => number = Math.random): Dj {
  const options = dj.look.accents;
  if (!options || options.length === 0) return dj;
  return {
    ...dj,
    look: {
      ...dj.look,
      accent: options[Math.floor(random() * options.length)],
    },
  };
}

/** Un rival al azar que no sea tu mismo DJ. Puede estar bloqueado: así se le conoce antes de ganarlo. */
export function pickRival(
  mine: DjId,
  random: () => number = Math.random,
): DjId {
  const others = DJS.filter((d) => d.id !== mine);
  return others[Math.floor(random() * others.length)].id;
}
