/**
 * DDL del esquema local. Vive aparte de `db.ts` (que importa expo-sqlite, y por
 * tanto solo funciona en el móvil) para que las pruebas de escritorio puedan
 * crear EXACTAMENTE el mismo esquema que crea la app. Si esto estuviera
 * duplicado en el test, el test validaría un esquema que no es el real.
 */
export const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY NOT NULL,
  playedAt INTEGER NOT NULL,
  goalsFor INTEGER NOT NULL,
  goalsAgainst INTEGER NOT NULL,
  goldenGoal INTEGER NOT NULL DEFAULT 0,
  perfects INTEGER NOT NULL DEFAULT 0,
  goods INTEGER NOT NULL DEFAULT 0,
  powers INTEGER,
  bestStreak INTEGER,
  level TEXT,
  dj TEXT,
  rivalDj TEXT,
  stage TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  audioOffsetMs INTEGER,
  musicVolume REAL NOT NULL DEFAULT 1,
  sfxVolume REAL NOT NULL DEFAULT 1,
  lastDj TEXT,
  lastStage TEXT,
  lastLevel TEXT,
  showPerf INTEGER,
  unlockAll INTEGER,
  lastBackup INTEGER NOT NULL DEFAULT 0,
  schemaVersion INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS matches_playedAt_idx ON matches (playedAt);
`

/**
 * Cambios de esquema sobre bases ya creadas, en orden. El índice del array + 1
 * es la versión a la que lleva cada paso (`PRAGMA user_version`).
 *
 * `CREATE_SQL` de arriba siempre describe el esquema COMPLETO y actual, así que
 * una instalación nueva no ejecuta ninguno de estos pasos: son solo para bases
 * que ya existían antes del cambio.
 *
 * ⚠️ Añadir una columna a CREATE_SQL SIN añadir aquí su ALTER deja rotas todas
 * las instalaciones que ya existen.
 */
export const MIGRATIONS: string[] = [
  // v1 → v2: interruptor del overlay de rendimiento (fps) en Ajustes.
  `ALTER TABLE settings ADD COLUMN showPerf INTEGER;`,
  // v2 → v3: lo que necesitan las misiones y no se guardaba.
  `ALTER TABLE matches ADD COLUMN powers INTEGER;
   ALTER TABLE matches ADD COLUMN bestStreak INTEGER;`,
  // v3 → v4: el modo prueba que desbloquea todos los DJs.
  `ALTER TABLE settings ADD COLUMN unlockAll INTEGER;`,
]

/** Versión del esquema de SQLite. NO es la del formato de copia (`version.ts`). */
export const DB_VERSION = MIGRATIONS.length + 1
