import { describe, expect, test } from 'vitest';
import { contrastRatio, hexToOklch } from './color';
import {
	buildTokens,
	DEFAULT_SCHEDULE,
	DEFAULT_THEME,
	formatTimeOfDay,
	modeForMinutes,
	nextScheduleChangeDelay,
	parseThemePreference,
	parseThemeSchedule,
	parseTimeOfDay,
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

	test('acepta el modo por franja horaria', () => {
		expect(parseThemePreference('esmeralda', 'schedule', null).mode).toBe('schedule');
	});
});

describe('franja horaria', () => {
	test('respeta los bordes 07:00 y 18:00', () => {
		expect(modeForMinutes(DEFAULT_SCHEDULE, 6 * 60 + 59)).toBe('dark');
		expect(modeForMinutes(DEFAULT_SCHEDULE, 7 * 60)).toBe('light');
		expect(modeForMinutes(DEFAULT_SCHEDULE, 17 * 60 + 59)).toBe('light');
		expect(modeForMinutes(DEFAULT_SCHEDULE, 18 * 60)).toBe('dark');
	});

	test('acepta una franja que cruza la medianoche', () => {
		const schedule = { lightStart: 20 * 60, darkStart: 6 * 60 };
		expect(modeForMinutes(schedule, 21 * 60)).toBe('light');
		expect(modeForMinutes(schedule, 3 * 60)).toBe('light');
		expect(modeForMinutes(schedule, 12 * 60)).toBe('dark');
	});

	test('calcula el próximo cambio de franja', () => {
		const at = (hours: number, minutes = 0): Date => new Date(2026, 10, 22, hours, minutes);

		expect(nextScheduleChangeDelay(DEFAULT_SCHEDULE, at(10))).toBe(8 * 3_600_000);
		expect(nextScheduleChangeDelay(DEFAULT_SCHEDULE, at(19))).toBe(12 * 3_600_000);
		expect(nextScheduleChangeDelay({ lightStart: 20 * 60, darkStart: 6 * 60 }, at(12))).toBe(
			8 * 3_600_000
		);
	});

	test('parsea y formatea horas locales', () => {
		expect(parseTimeOfDay('07:30')).toBe(450);
		expect(parseTimeOfDay('7:05')).toBe(425);
		expect(parseTimeOfDay('24:00')).toBeNull();
		expect(formatTimeOfDay(1080)).toBe('18:00');
	});

	test('la franja guardada cae en la de por defecto si es inválida', () => {
		expect(parseThemeSchedule({ lightStart: 480, darkStart: 1200 })).toEqual({
			lightStart: 480,
			darkStart: 1200
		});
		expect(parseThemeSchedule(null)).toEqual(DEFAULT_SCHEDULE);
		expect(parseThemeSchedule({ lightStart: 480, darkStart: 480 })).toEqual(DEFAULT_SCHEDULE);
	});

	test('el CSS pinta un único modo, sin media query', () => {
		const css = themeCss({ palette: 'esmeralda', mode: 'schedule', custom: null }, 'dark');
		expect(css.startsWith(':root:root{')).toBe(true);
		expect(css).toContain('color-scheme:dark');
		expect(css).not.toContain('@media');
		for (const name of TOKEN_NAMES) {
			expect(css).toContain(`${TOKEN_VARS[name]}:`);
		}
	});

	test('resolveTheme resuelve el modo según la hora local', () => {
		const preference: ThemePreference = {
			palette: 'esmeralda',
			mode: 'schedule',
			custom: null
		};

		const day = resolveTheme(preference, { schedule: DEFAULT_SCHEDULE, minutes: 8 * 60 });
		expect(day.mode).toBe('light');
		expect(day.active).toEqual(day.light);
		expect(day.meta).toHaveLength(1);

		const night = resolveTheme(preference, { schedule: DEFAULT_SCHEDULE, minutes: 20 * 60 });
		expect(night.mode).toBe('dark');
		expect(night.active).toEqual(night.dark);
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
