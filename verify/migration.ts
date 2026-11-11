/**
 * Verificación del esquema y de sus migraciones.
 *
 * Importa porque ya hay instalaciones con datos: si un `ALTER TABLE` falla, la
 * app no arranca. Se recrea el esquema tal y como se instaló en la versión 1,
 * con datos, se aplican los pasos y se comprueba que las columnas nuevas
 * existen, que NO se ha perdido nada y que el resultado es idéntico a una
 * instalación nueva. Además, que las tres descripciones del esquema (el SQL,
 * las tablas de Drizzle y los mapeadores) dicen lo mismo.
 */
import { getTableColumns } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { readSettings } from '../src/lib/backupCore'
import * as schema from '../src/lib/schema'
import { matches, settings } from '../src/lib/schema'
import { CREATE_SQL, DB_VERSION, MIGRATIONS } from '../src/lib/schemaSql'
import type { AppDb } from '../src/lib/backupCore'
import { check, eq, finish, rawClient } from './harness'

/** El esquema tal y como lo creaba la versión 1 de la app, sin showPerf. */
const V1_SQL = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY NOT NULL,
  playedAt INTEGER NOT NULL,
  goalsFor INTEGER NOT NULL,
  goalsAgainst INTEGER NOT NULL,
  goldenGoal INTEGER NOT NULL DEFAULT 0,
  perfects INTEGER NOT NULL DEFAULT 0,
  goods INTEGER NOT NULL DEFAULT 0,
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
  lastBackup INTEGER NOT NULL DEFAULT 0,
  schemaVersion INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_playedAt_idx ON matches (playedAt);
`

async function columnsOf(client: ReturnType<typeof rawClient>, table: string): Promise<string[]> {
  const res = await client.execute(`PRAGMA table_info(${table})`)
  return res.rows.map((r) => String(r.name)).sort()
}

/** Lo mismo que hace `db.ts` en el móvil al arrancar. */
async function migrate(client: ReturnType<typeof rawClient>): Promise<void> {
  const row = await client.execute('PRAGMA user_version')
  const current = Number(row.rows[0]?.user_version ?? 0)
  if (current >= DB_VERSION) return
  await client.executeMultiple(CREATE_SQL)
  if (current > 0) for (const step of MIGRATIONS.slice(current - 1)) await client.executeMultiple(step)
  await client.execute(`PRAGMA user_version = ${DB_VERSION}`)
}

async function main() {
  eq('la versión del esquema es el número de migraciones más uno', DB_VERSION, MIGRATIONS.length + 1)

  const fresh = rawClient()
  await migrate(fresh)

  // Si una columna está en el SQL pero no en Drizzle (o al revés), la app la
  // ignora en silencio al leer o revienta al escribir.
  for (const [name, table] of [
    ['matches', matches],
    ['settings', settings],
  ] as const) {
    const inSql = await columnsOf(fresh, name)
    const inDrizzle = Object.values(getTableColumns(table))
      .map((c) => c.name)
      .sort()
    check(`la tabla ${name} tiene las mismas columnas en el SQL y en Drizzle`, inSql.join() === inDrizzle.join(), `SQL: ${inSql} · Drizzle: ${inDrizzle}`)
  }

  /* --- Una instalación de la v1, con datos, que se actualiza ------------- */
  const old = rawClient()
  await old.executeMultiple(V1_SQL)
  await old.execute('PRAGMA user_version = 1')
  await old.execute(`INSERT INTO matches (id, playedAt, goalsFor, goalsAgainst, perfects, level, dj) VALUES ('m1', 5, 3, 1, 7, 'closing', 'txiki')`)
  await old.execute(`INSERT INTO settings (id, audioOffsetMs, musicVolume, lastLevel, lastBackup, schemaVersion) VALUES ('app', 120, 0.5, 'peak', 99, 1)`)

  await migrate(old)
  const version = Number((await old.execute('PRAGMA user_version')).rows[0]?.user_version)
  eq('tras actualizar, la base queda en la última versión', version, DB_VERSION)
  for (const name of ['matches', 'settings']) {
    check(`tras actualizar, ${name} queda igual que en una instalación nueva`, (await columnsOf(old, name)).join() === (await columnsOf(fresh, name)).join())
  }
  const m = (await old.execute(`SELECT * FROM matches WHERE id = 'm1'`)).rows[0]
  check('el partido de antes sigue entero', Number(m?.goalsFor) === 3 && Number(m?.perfects) === 7 && m?.dj === 'txiki')

  const db = drizzle(old, { schema }) as unknown as AppDb
  const s = await readSettings(db)
  check('los ajustes de antes siguen enteros', s.audioOffsetMs === 120 && s.musicVolume === 0.5 && s.lastLevel === 'peak' && s.lastBackup === 99)
  eq('y el campo nuevo arranca vacío (apagado)', s.showPerf, undefined)

  await migrate(old)
  eq('migrar dos veces no hace nada la segunda', Number((await old.execute('PRAGMA user_version')).rows[0]?.user_version), DB_VERSION)

  finish('esquema')
}

main()
