-- ==========================================================================
-- Modo de tema por franja horaria («Horario»).
--
-- Aditiva e idempotente: añade la franja configurable al perfil y amplía el
-- check de `theme_mode`. Los perfiles existentes quedan con 07:00–18:00, así
-- que hasta que el usuario elija «Horario» nada cambia.
--
-- La franja se guarda en minutos desde medianoche local:
-- `{"lightStart":420,"darkStart":1080}`.
-- ==========================================================================

alter table public.profiles
	add column if not exists theme_schedule jsonb not null
		default '{"lightStart":420,"darkStart":1080}'::jsonb;

alter table public.profiles drop constraint if exists profiles_theme_mode_check;
alter table public.profiles
	add constraint profiles_theme_mode_check
	check (theme_mode in ('light', 'dark', 'schedule', 'system'));

-- Forma y rango de la franja: dos minutos del día distintos entre sí.
alter table public.profiles drop constraint if exists profiles_theme_schedule_check;
alter table public.profiles
	add constraint profiles_theme_schedule_check check (
		jsonb_typeof(theme_schedule) = 'object'
		and jsonb_typeof(theme_schedule->'lightStart') = 'number'
		and jsonb_typeof(theme_schedule->'darkStart') = 'number'
		and (theme_schedule->>'lightStart')::numeric between 0 and 1439
		and (theme_schedule->>'darkStart')::numeric between 0 and 1439
		and (theme_schedule->>'lightStart')::numeric <> (theme_schedule->>'darkStart')::numeric
	);

comment on column public.profiles.theme_mode is
	'Modo de color: `light`, `dark`, `schedule` (franja horaria) o `system` (sistema operativo).';
comment on column public.profiles.theme_schedule is
	'Franja del modo `schedule` en minutos desde medianoche: {lightStart, darkStart}.';
