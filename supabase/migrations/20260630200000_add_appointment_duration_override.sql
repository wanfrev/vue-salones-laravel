-- Add duration_override column to appointments table
-- This allows per-appointment duration customization that overrides the service catalog duration.
-- Mirrors the price_override pattern for consistency.
-- end_time is always computed from start_time + effective duration, so duration_override is purely
-- a flag indicating "this appointment was customized away from the service default."

alter table public.appointments
  add column if not exists duration_override numeric(6, 2);
