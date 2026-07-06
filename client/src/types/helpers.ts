import type { Database } from './database'

type Tables = Database['public']['Tables']

/** Insert payload for a table (omits auto-generated fields) */
export type InsertFor<T extends keyof Tables> = Tables[T]['Insert']

/** Update payload for a table (all fields optional) */
export type UpdateFor<T extends keyof Tables> = Tables[T]['Update']

/** Row type for a table */
export type RowFor<T extends keyof Tables> = Tables[T]['Row']

/**
 * Extends a Row type with joined relation types.
 * Usage: type AppointmentWithClient = Joined<'appointments', { client: Client }>
 */
export type Joined<T extends keyof Tables, Relations> = RowFor<T> & Relations
