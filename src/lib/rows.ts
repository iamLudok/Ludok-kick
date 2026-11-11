// Traducción entre las filas de SQLite y el modelo de dominio. En la base un
// hueco es `null`; en el dominio (y en el fichero de copia) es `undefined`.
import { matches, settings } from './schema'
import { SCHEMA_VERSION } from './version'
import type { MatchRecord, Settings } from '../types'

type MatchRow = typeof matches.$inferSelect
type MatchInsert = typeof matches.$inferInsert
type SettingsRow = typeof settings.$inferSelect
type SettingsInsert = typeof settings.$inferInsert

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v)
const n = <T>(v: T | undefined): T | null => (v === undefined ? null : v)

export function rowToMatch(r: MatchRow): MatchRecord {
  return {
    id: r.id,
    playedAt: r.playedAt,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goldenGoal: r.goldenGoal,
    perfects: r.perfects,
    goods: r.goods,
    level: u(r.level),
    dj: u(r.dj),
    rivalDj: u(r.rivalDj),
    stage: u(r.stage),
  }
}

export function matchToRow(m: MatchRecord): MatchInsert {
  return {
    id: m.id,
    playedAt: m.playedAt,
    goalsFor: m.goalsFor,
    goalsAgainst: m.goalsAgainst,
    // `?? …` porque una copia escrita a mano o por una versión futura puede no
    // traer estos campos, y la columna no admite huecos.
    goldenGoal: m.goldenGoal ?? false,
    perfects: m.perfects ?? 0,
    goods: m.goods ?? 0,
    level: n(m.level),
    dj: n(m.dj),
    rivalDj: n(m.rivalDj),
    stage: n(m.stage),
  }
}

export function rowToSettings(r: SettingsRow): Settings {
  return {
    id: 'app',
    audioOffsetMs: u(r.audioOffsetMs),
    musicVolume: r.musicVolume,
    sfxVolume: r.sfxVolume,
    lastDj: u(r.lastDj),
    lastStage: u(r.lastStage),
    lastLevel: u(r.lastLevel),
    lastBackup: r.lastBackup,
    schemaVersion: r.schemaVersion,
  }
}

export function settingsToRow(s: Settings): SettingsInsert {
  return {
    id: 'app',
    audioOffsetMs: n(s.audioOffsetMs),
    musicVolume: s.musicVolume,
    sfxVolume: s.sfxVolume,
    lastDj: n(s.lastDj),
    lastStage: n(s.lastStage),
    lastLevel: n(s.lastLevel),
    lastBackup: s.lastBackup,
    schemaVersion: s.schemaVersion ?? SCHEMA_VERSION,
  }
}
