import { describe, expect, test } from 'vitest';
import { contrastRatio, hexToOklch } from './color';
import {
	buildTokens,
	DEFAULT_THEME,
	parseThemePreference,
	resolveTheme,
	themeContrast,
	themeCss,
	TOKEN_NAMES,
	TOKEN_VARS,
	validPaletteIds,
	type ThemePreference,
	type ResolvedMode
} from './derive';
import { PALETTES } from './palettes';

const MODES: ResolvedMode[] = ['light', 'dark'];

/** Distancia de tono por el arco corto (0–180). */
function hueDistance(a: string, b: string): number {
	const first = hexToOklch(a).h;
	const second = hexToOklch(b).h;
	const raw = Math.abs(first - second) % 360;
	return raw > 180 ? 360 - raw : raw;
}

describe('contraste de las paletas', () => {
	for (const palette of PALETTES) {
		for (const mode of MODES) {
			test(`${palette.id} · ${mode} cumple AA en los pares críticos`, () => {
				const tokens = buildTokens({ palette: palette.id, mode, custom: null }, mode);
				const contrasts = themeContrast({ palette: palette.id, mode, custom: null }, mode);

				expect(contrasts.body).toBeGreaterThanOrEqual(7);
				expect(contrasts.muted).toBeGreaterThanOrEqual(4.5);
				expect(contrasts.primary).toBeGreaterThanOrEqual(4.5);
				expect(contrasts.hero).toBeGreaterThanOrEqual(4.5);
				expect(contrastRatio(tokens.onPrimary, tokens.primary)).toBeGreaterThanOrEqual(4.5);
				expect(contrastRatio(tokens.onTertiary, tokens.tertiary)).toBeGreaterThanOrEqual(4.5);
				expect(contrastRatio(tokens.incomeText, tokens.incomeSurface)).toBeGreaterThanOrEqual(4.5);
				expect(contrastRatio(tokens.expenseText, tokens.expenseSurface)).toBeGreaterThanOrEqual(
					4.5
				);
				expect(contrastRatio(tokens.planText, tokens.planSurface)).toBeGreaterThanOrEqual(4.5);
				expect(
					contrastRatio(tokens.onSurface, tokens.surfaceContainerLowest)
				).toBeGreaterThanOrEqual(7);
			});
		}
	}
});

describe('distinción semántica', () => {
	for (const palette of PALETTES) {
		test(`${palette.id} separa el tono de ingresos y gastos`, () => {
			const tokens = buildTokens({ palette: palette.id, mode: 'light', custom: null }, 'light');
			expect(hueDistance(tokens.primary, tokens.tertiary)).toBeGreaterThanOrEqual(40);
		});
	}
});

describe('paleta personalizada', () => {
	const custom: ThemePreference = {
		palette: 'custom',
		mode: 'dark',
		custom: { primary: '#00a878', secondary: '#7c3aed', tertiary: '#e11d48', neutral: 'warm' }
	};

	test('deriva todos los tokens y respeta el contraste', () => {
		const tokens = buildTokens(custom, 'dark');
		expect(Object.keys(tokens).sort()).toEqual([...TOKEN_NAMES].sort());
		expect(contrastRatio(tokens.onSurface, tokens.surfaceContainerLowest)).toBeGreaterThanOrEqual(
			7
		);
		expect(contrastRatio(tokens.primary, tokens.background)).toBeGreaterThanOrEqual(4.5);
	});

	test('acepta colores cortos y normaliza', () => {
		const parsed = parseThemePreference('custom', 'light', {
			primary: '#0A8',
			secondary: '#7c3aed',
			tertiary: '#E11D48',
			neutral: 'cool'
		});
		expect(parsed.palette).toBe('custom');
		expect(parsed.custom).toEqual({
			primary: '#00aa88',
			secondary: '#7c3aed',
			tertiary: '#e11d48',
			neutral: 'cool'
		});
	});
});

describe('parseThemePreference', () => {
	test('cae en la paleta por defecto ante valores inválidos', () => {
		expect(parseThemePreference('inexistente', 'neon', null)).toEqual({
			palette: 'esmeralda',
			mode: 'system',
			custom: null
		});
	});

	test('desactiva custom si faltan colores válidos', () => {
		const parsed = parseThemePreference('custom', 'light', { primary: 'no-es-color' });
		expect(parsed.palette).toBe('esmeralda');
		expect(parsed.custom).toBeNull();
	});

	test('incluye custom en los ids válidos', () => {
		expect(validPaletteIds()).toContain('custom');
	});
});

describe('themeCss', () => {
	test('la paleta por defecto en claro no duplica tokens', () => {
		const css = themeCss({ palette: 'esmeralda', mode: 'light', custom: null });
		expect(css).toBe(':root:root{color-scheme:light}');
	});

	test('la paleta por defecto en oscuro emite todos los tokens', () => {
		const css = themeCss({ palette: 'esmeralda', mode: 'dark', custom: null });
		expect(css.startsWith(':root:root{')).toBe(true);
		expect(css).toContain('color-scheme:dark');
		for (const name of TOKEN_NAMES) {
			expect(css).toContain(`${TOKEN_VARS[name]}:`);
		}
	});

	test('el modo sistema usa la media query sin JavaScript', () => {
		const css = themeCss({ palette: 'esmeralda', mode: 'system', custom: null });
		expect(css).toContain('@media (prefers-color-scheme: dark)');
		expect(css).not.toContain('color-scheme:light}');
	});

	test('una paleta distinta emite claro y oscuro en modo sistema', () => {
		const css = themeCss({ palette: 'nubank', mode: 'system', custom: null });
		expect(css).toContain('color-scheme:light');
		expect(css).toContain('@media (prefers-color-scheme: dark)');
	});

	test('la especificidad doble evita depender del orden del CSS', () => {
		expect(themeCss({ palette: 'nubank', mode: 'light', custom: null })).toContain(':root:root{');
	});
});

describe('resolveTheme', () => {
	test('expone la paleta activa y los metadatos del navegador', () => {
		const theme = resolveTheme(DEFAULT_THEME);
		expect(theme.active).toEqual(theme.light);
		expect(theme.meta).toHaveLength(2);
		expect(theme.meta[0].media).toBe('(prefers-color-scheme: light)');
	});

	test('en modo oscuro usa el modo resuelto', () => {
		const theme = resolveTheme({ palette: 'revolut', mode: 'dark', custom: null });
		expect(theme.active).toEqual(theme.dark);
		expect(theme.meta).toHaveLength(1);
	});
});
