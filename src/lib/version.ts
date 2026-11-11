/**
 * Versión del formato de las COPIAS DE SEGURIDAD. No es la del esquema de
 * SQLite (esa es `DB_VERSION`, en `schemaSql.ts`).
 *
 * Vive en un módulo propio y sin dependencias para que la puedan usar tanto los
 * mapeadores de filas como el núcleo de copias sin crear un ciclo de imports.
 */
export const SCHEMA_VERSION = 1
