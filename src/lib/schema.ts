// Definición de tablas para Drizzle. Solo describe las columnas: las tablas se
// crean con SQL explícito (`schemaSql.ts`) y las migraciones van por
// PRAGMA user_version.
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Level } from '../types'

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  playedAt: integer('playedAt').notNull(),
  goalsFor: integer('goalsFor').notNull(),
  goalsAgainst: integer('goalsAgainst').notNull(),
  goldenGoal: integer('goldenGoal', { mode: 'boolean' }).notNull().default(false),
  perfects: integer('perfects').notNull().default(0),
  goods: integer('goods').notNull().default(0),
  powers: integer('powers'),
  bestStreak: integer('bestStreak'),
  kicks: integer('kicks'),
  jumps: integer('jumps'),
  dashes: integer('dashes'),
  coins: integer('coins'),
  level: text('level').$type<Level>(),
  dj: text('dj'),
  rivalDj: text('rivalDj'),
  stage: text('stage'),
})

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  // Nullable a propósito: ausente significa «sin calibrar», que no es lo mismo
  // que un desfase de 0 ms.
  audioOffsetMs: integer('audioOffsetMs'),
  musicVolume: real('musicVolume').notNull().default(1),
  sfxVolume: real('sfxVolume').notNull().default(1),
  lastDj: text('lastDj'),
  lastStage: text('lastStage'),
  lastLevel: text('lastLevel').$type<Level>(),
  showPerf: integer('showPerf', { mode: 'boolean' }),
  unlockAll: integer('unlockAll', { mode: 'boolean' }),
  coins: integer('coins').notNull().default(0),
  upSpeed: integer('upSpeed').notNull().default(0),
  upKick: integer('upKick').notNull().default(0),
  upJump: integer('upJump').notNull().default(0),
  upDash: integer('upDash').notNull().default(0),
  upPower: integer('upPower').notNull().default(0),
  lastBackup: integer('lastBackup').notNull().default(0),
  schemaVersion: integer('schemaVersion').notNull(),
})
