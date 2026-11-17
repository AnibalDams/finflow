-- ==========================================================================
-- Temporadas visuales: preferencia de decoración por usuario.
--
-- `auto`  → activa los packs dentro de su ventana de fechas (Navidad: 1 dic–6 ene)
-- `off`   → sin decoración
-- <id>    → fuerza un pack (vista previa / QA fuera de temporada)
--
-- Aditiva e idempotente; las filas existentes quedan en `auto`.
-- ==========================================================================

alter table public.profiles
	add column if not exists seasonal_theme text not null default 'auto';

alter table public.profiles drop constraint if exists profiles_seasonal_theme_check;
alter table public.profiles
	add constraint profiles_seasonal_theme_check
	check (char_length(seasonal_theme) between 2 and 24);

comment on column public.profiles.seasonal_theme is
	'Preferencia de temporada visual: auto, off o el id de un pack (navidad, …).';
