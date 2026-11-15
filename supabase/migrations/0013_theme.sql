-- ==========================================================================
-- Tema de la interfaz: paleta del catálogo, modo de color y semillas de la
-- paleta personalizada.
--
-- Aditiva e idempotente: no toca datos existentes y las filas actuales quedan
-- con la paleta por defecto y el modo `system` (sigue `prefers-color-scheme`).
-- Las políticas RLS de `profiles` cubren las columnas nuevas.
-- ==========================================================================

alter table public.profiles
	add column if not exists theme_palette text not null default 'esmeralda',
	add column if not exists theme_mode text not null default 'system',
	add column if not exists theme_custom jsonb;

alter table public.profiles drop constraint if exists profiles_theme_mode_check;
alter table public.profiles
	add constraint profiles_theme_mode_check check (theme_mode in ('light', 'dark', 'system'));

-- El catálogo vive en el código; la base solo acota el tamaño del identificador.
alter table public.profiles drop constraint if exists profiles_theme_palette_check;
alter table public.profiles
	add constraint profiles_theme_palette_check
	check (char_length(theme_palette) between 2 and 24);

comment on column public.profiles.theme_palette is
	'Id de la paleta del catálogo (`esmeralda`, `mercurio`, …) o `custom`.';
comment on column public.profiles.theme_mode is
	'Modo de color: `light`, `dark` o `system` (sigue al sistema operativo).';
comment on column public.profiles.theme_custom is
	'Semillas de la paleta personalizada: {primary, secondary, tertiary, neutral} en hex.';
