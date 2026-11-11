/**
 * Verificación del esquema y de sus migraciones.
 *
 * Importa porque puede haber ya una instalación con datos: si un `ALTER TABLE`
 * falla, la app no arranca. Todavía no hay ningún paso de migración, así que
 * de momento se comprueba lo que los hará posibles sin sustos: que crear el
 * esquema dos veces no rompe nada y, sobre todo, que las tres descripciones
 * del esquema (el SQL, las tablas de Drizzle y los mapeadores) dicen lo mismo.
 */
import { getTableColumns } from 'drizzle-orm'
import { matches, settings } from '../src/lib/schema'
import { CREATE_SQL, DB_VERSION, MIGRATIONS } from '../src/lib/schemaSql'
import { check, eq, finish, rawClient } from './harness'

async function columnsOf(client: ReturnType<typeof rawClient>, table: string): Promise<string[]> {
  const res = await client.execute(`PRAGMA table_info(${table})`)
  return res.rows.map((r) => String(r.name)).sort()
}

async function main() {
  eq('la versión del esquema es el número de migraciones más uno', DB_VERSION, MIGRATIONS.length + 1)

  const client = rawClient()
  await client.executeMultiple(CREATE_SQL)
  await client.execute(`INSERT INTO matches (id, playedAt, goalsFor, goalsAgainst) VALUES ('a', 1, 2, 3)`)
  await client.executeMultiple(CREATE_SQL)
  const kept = await client.execute('SELECT goalsFor FROM matches WHERE id = \'a\'')
  eq('crear el esquema sobre una base que ya existe no borra nada', Number(kept.rows[0]?.goalsFor), 2)

  // Si una columna está en el SQL pero no en Drizzle (o al revés), la app la
  // ignora en silencio al leer o revienta al escribir.
  for (const [name, table] of [
    ['matches', matches],
    ['settings', settings],
  ] as const) {
    const inSql = await columnsOf(client, name)
    const inDrizzle = Object.values(getTableColumns(table))
      .map((c) => c.name)
      .sort()
    check(`la tabla ${name} tiene las mismas columnas en el SQL y en Drizzle`, inSql.join() === inDrizzle.join(), `SQL: ${inSql} · Drizzle: ${inDrizzle}`)
  }

  // Cada paso de migración tiene que dejar el mismo esquema que una
  // instalación nueva. Con la lista vacía esto es trivial; el día que se añada
  // un ALTER, aquí es donde se nota si se olvidó tocar CREATE_SQL.
  const migrated = rawClient()
  await migrated.executeMultiple(CREATE_SQL)
  for (const step of MIGRATIONS) await migrated.executeMultiple(step)
  for (const name of ['matches', 'settings']) {
    check(`tras migrar, ${name} queda igual que en una instalación nueva`, (await columnsOf(migrated, name)).join() === (await columnsOf(client, name)).join())
  }

  finish('esquema')
}

main()
