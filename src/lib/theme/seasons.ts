/**
 * Temporadas visuales (Navidad, y las que vengan).
 *
 * Un pack declara una ventana de fechas locales y una identidad. El layout raíz
 * resuelve cuál está activo y lo expone como `data-season`; los componentes
 * consultan ese dato y el CSS del pack se activa con `[data-season='<id>']`.
 *
 * Para añadir otra fiesta: crea el pack en `SEASONAL_THEMES`, sus sprites y su
 * bloque de CSS. No hace falta tocar la lógica de resolución ni la base.
 */

export interface SeasonDate {
	/** 1–12. */
	month: number;
	/** 1–31. */
	day: number;
}

export interface SeasonWindow {
	from: SeasonDate;
	/** Inclusivo. Puede cruzar el fin de año (diciembre → enero). */
	to: SeasonDate;
}

export interface SeasonalTheme {
	id: string;
	name: string;
	description: string;
	/** Texto corto para la UI («Feliz Navidad»). */
	greeting: string;
	window: SeasonWindow;
	/** Paleta sugerida del catálogo; no se aplica sola. */
	palette?: string;
}

export const NAVIDAD: SeasonalTheme = {
	id: 'navidad',
	name: 'Navidad',
	description: 'Luces, pinos y nieve del 1 de diciembre al 6 de enero.',
	greeting: 'Feliz Navidad',
	window: { from: { month: 12, day: 1 }, to: { month: 1, day: 6 } },
	palette: 'navidad'
};

export const SEASONAL_THEMES: readonly SeasonalTheme[] = [NAVIDAD];

/** Preferencia guardada: `auto`, `off` o el id de un pack (forzado). */
export const SEASON_AUTO = 'auto';
export const SEASON_OFF = 'off';

export function findSeason(id: string): SeasonalTheme | null {
	return SEASONAL_THEMES.find((season) => season.id === id) ?? null;
}

export function seasonIds(): string[] {
	return SEASONAL_THEMES.map((season) => season.id);
}

function monthDay(value: SeasonDate): number {
	return value.month * 100 + value.day;
}

/** ¿La fecha local (`YYYY-MM-DD`) cae dentro de la ventana del pack? */
export function isSeasonActive(season: SeasonalTheme, isoDate: string): boolean {
	const [, month, day] = isoDate.slice(0, 10).split('-').map(Number);
	if (!month || !day) return false;

	const value = month * 100 + day;
	const from = monthDay(season.window.from);
	const to = monthDay(season.window.to);

	return from <= to ? value >= from && value <= to : value >= from || value <= to;
}

/**
 * Resuelve la temporada visible.
 *
 * - `auto`: la primera ventana que contenga la fecha.
 * - `off`: ninguna.
 * - id de pack: forzada, útil para probar fuera de temporada.
 * - Cualquier otro valor: se comporta como `auto`.
 */
export function resolveSeason(
	preference: string | null | undefined,
	isoDate: string
): SeasonalTheme | null {
	const value = preference?.trim() || SEASON_AUTO;

	if (value === SEASON_OFF) return null;

	const forced = value === SEASON_AUTO ? null : findSeason(value);
	if (forced) return forced;

	return SEASONAL_THEMES.find((season) => isSeasonActive(season, isoDate)) ?? null;
}

/** Normaliza el valor que llega de la base o de un formulario. */
export function isSeasonPreference(value: string): boolean {
	return value === SEASON_AUTO || value === SEASON_OFF || findSeason(value) !== null;
}
