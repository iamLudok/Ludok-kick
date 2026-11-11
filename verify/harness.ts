/**
 * Andamiaje común de los scripts de datos: comprobaciones sin framework y una
 * base de datos de usar y tirar.
 *
 * La idea: ejecutar el MISMO código que corre en el móvil contra un SQLite de
 * escritorio, gracias a que la lógica pide la base a `dbRef` en vez de crearla.
 */

// libsql y no better-sqlite3: better-sqlite3 es sincrónico y no admite
// transacciones asíncronas, mientras expo-sqlite (el del móvil) sí. Con libsql
// la semántica async coincide con la real y se ejecuta el mismo código.
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppDb } from '../src/lib/backupCore'
import { setDb } from '../src/lib/dbRef'
import * as schema from '../src/lib/schema'
// Importado, NO copiado: si el script declarase su propio DDL, validaría un
// esquema que no es el que crea la app.
import { CREATE_SQL } from '../src/lib/schemaSql'

let failures = 0

export function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

export function eq<T>(label: string, actual: T, expected: T): void {
  check(label, actual === expected, actual === expected ? '' : `esperado ${expected}, salió ${actual}`)
}

export async function rejects(label: string, fn: () => Promise<unknown>, fragment: string): Promise<void> {
  try {
    await fn()
    check(label, false, 'no lanzó ningún error')
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    check(label, message.includes(fragment), message.includes(fragment) ? '' : `el error fue: ${message}`)
  }
}

export function finish(titulo: string): never {
  cleanupTempFiles()
  console.log(failures === 0 ? `\n✔ ${titulo}: todo correcto` : `\n✘ ${titulo}: ${failures} fallo(s)`)
  process.exit(failures === 0 ? 0 : 1)
}

// Fichero temporal en vez de ':memory:': una base en memoria NO se comparte
// entre conexiones, y las transacciones abren la suya, así que las tablas
// desaparecían dentro de la transacción. Con fichero se comporta como en el
// móvil, que también usa un fichero.
const tempFiles: string[] = []
let dbSeq = 0

export function tempDbPath(): string {
  const path = join(tmpdir(), `ludok-kick-verify-${process.pid}-${dbSeq++}.db`)
  rmSync(path, { force: true })
  tempFiles.push(path)
  return path
}

export function rawClient(): Client {
  return createClient({ url: `file:${tempDbPath()}` })
}

export async function freshDb(): Promise<AppDb> {
  const client = rawClient()
  await client.executeMultiple(CREATE_SQL)
  return drizzle(client, { schema }) as unknown as AppDb
}

/** Igual que `freshDb`, pero además la registra para que la use la lógica real. */
export async function freshDbAsCurrent(): Promise<AppDb> {
  const database = await freshDb()
  setDb(database)
  return database
}

function cleanupTempFiles(): void {
  for (const f of tempFiles) {
    for (const suffix of ['', '-wal', '-shm']) rmSync(f + suffix, { force: true })
  }
}
