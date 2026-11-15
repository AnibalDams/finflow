/**
 * Vista previa del tema en el navegador.
 *
 * Se aplica como estilo en línea sobre `<html>`: gana a cualquier hoja de
 * estilos y desaparece al descartar o guardar, sin recargar la página.
 */

import {
	buildTokens,
	TOKEN_NAMES,
	TOKEN_VARS,
	type ResolvedMode,
	type ThemePreference
} from './derive';

let active = false;
const originalMeta: Array<{ element: HTMLMetaElement; content: string }> = [];

/** Modo que el navegador está mostrando cuando la preferencia es `system`. */
export function resolveColorMode(mode: ThemePreference['mode']): ResolvedMode {
	if (mode !== 'system') return mode;
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function previewTheme(preference: ThemePreference): void {
	if (typeof document === 'undefined') return;

	const mode = resolveColorMode(preference.mode);
	const tokens = buildTokens(preference, mode);
	const root = document.documentElement;

	for (const key of TOKEN_NAMES) root.style.setProperty(TOKEN_VARS[key], tokens[key]);
	root.style.setProperty('color-scheme', mode);

	const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
	if (!active) {
		originalMeta.length = 0;
		for (const element of metas) originalMeta.push({ element, content: element.content });
	}
	for (const element of metas) element.content = tokens.background;

	active = true;
}

/** Quita la vista previa y devuelve el tema que sirvió el servidor. */
export function clearThemePreview(): void {
	if (typeof document === 'undefined' || !active) return;

	const root = document.documentElement;
	for (const key of TOKEN_NAMES) root.style.removeProperty(TOKEN_VARS[key]);
	root.style.removeProperty('color-scheme');

	for (const { element, content } of originalMeta) {
		if (element.isConnected) element.content = content;
	}
	originalMeta.length = 0;
	active = false;
}
