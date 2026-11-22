/**
 * Aplicación del tema en el navegador.
 *
 * `previewTheme` pinta la vista previa del selector sobre `<html>` (gana a
 * cualquier hoja de estilos y se retira al guardar o descartar). El modo
 * `schedule` usa el mismo mecanismo, más un temporizador que lo cambia al
 * cruzar la hora límite sin recargar.
 */

import {
	buildTokens,
	DEFAULT_SCHEDULE,
	modeForMinutes,
	nextScheduleChangeDelay,
	TOKEN_NAMES,
	TOKEN_VARS,
	type ResolvedMode,
	type ThemePreference,
	type ThemeSchedule,
	type ThemeTokens
} from './derive';
import { SvelteDate } from 'svelte/reactivity';

let active = false;
const originalMeta: Array<{ element: HTMLMetaElement; content: string }> = [];

let scheduled: { preference: ThemePreference; schedule: ThemeSchedule } | null = null;
let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledPainted = false;

function paint(tokens: ThemeTokens, mode: ResolvedMode): void {
	const root = document.documentElement;
	for (const key of TOKEN_NAMES) root.style.setProperty(TOKEN_VARS[key], tokens[key]);
	root.style.setProperty('color-scheme', mode);

	for (const element of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		element.content = tokens.background;
	}
}

function removePaint(): void {
	const root = document.documentElement;
	for (const key of TOKEN_NAMES) root.style.removeProperty(TOKEN_VARS[key]);
	root.style.removeProperty('color-scheme');
}

/** Modo que el navegador debe mostrar ahora mismo. */
export function resolveColorMode(
	mode: ThemePreference['mode'],
	schedule: ThemeSchedule | null = null,
	now: Date = new SvelteDate()
): ResolvedMode {
	if (mode === 'schedule') {
		return modeForMinutes(schedule ?? DEFAULT_SCHEDULE, now.getHours() * 60 + now.getMinutes());
	}
	if (mode !== 'system') return mode;
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Pinta el modo vigente y reprograma el siguiente cambio de franja. */
function paintScheduled(): void {
	if (!scheduled) return;

	const now = new SvelteDate();
	const mode = modeForMinutes(scheduled.schedule, now.getHours() * 60 + now.getMinutes());
	paint(buildTokens(scheduled.preference, mode), mode);
	scheduledPainted = true;

	if (scheduledTimer) clearTimeout(scheduledTimer);
	scheduledTimer = setTimeout(
		() => {
			scheduledTimer = null;
			paintScheduled();
		},
		Math.max(1_000, nextScheduleChangeDelay(scheduled.schedule, now))
	);
}

/**
 * Mantiene el modo `schedule` sincronizado con la hora local. Devuelve la
 * limpieza que espera el `$effect` del layout raíz.
 */
export function startScheduledTheme(
	preference: ThemePreference,
	schedule: ThemeSchedule | null
): () => void {
	if (typeof document === 'undefined') return () => {};

	scheduled = { preference, schedule: schedule ?? DEFAULT_SCHEDULE };
	paintScheduled();

	return () => {
		if (scheduledTimer) clearTimeout(scheduledTimer);
		scheduledTimer = null;
		scheduled = null;

		if (scheduledPainted) {
			removePaint();
			scheduledPainted = false;
		}
	};
}

export function previewTheme(
	preference: ThemePreference,
	schedule: ThemeSchedule | null = null
): void {
	if (typeof document === 'undefined') return;

	const mode = resolveColorMode(preference.mode, schedule);

	if (!active) {
		originalMeta.length = 0;
		for (const element of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
			originalMeta.push({ element, content: element.content });
		}
	}

	paint(buildTokens(preference, mode), mode);
	active = true;
}

/** Quita la vista previa y devuelve el tema que sirve el layout. */
export function clearThemePreview(): void {
	if (typeof document === 'undefined' || !active) return;
	active = false;

	if (scheduled) {
		// El modo `schedule` sigue gobernando: se repinta en vez de quitarlo.
		paintScheduled();
		originalMeta.length = 0;
		return;
	}

	removePaint();

	for (const { element, content } of originalMeta) {
		if (element.isConnected) element.content = content;
	}
	originalMeta.length = 0;
}
