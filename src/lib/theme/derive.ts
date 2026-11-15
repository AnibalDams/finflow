/**
 * Motor de temas: convierte una preferencia (paleta + modo) en el conjunto de
 * variables CSS `--ff-*` que consume `layout.css`.
 *
 * Es isomorfo: lo usan el servidor (primer render sin parpadeo), la vista
 * previa del selector y los tests. No toca el DOM.
 */

import {
	bestOn,
	contrastRatio,
	ensureContrast,
	hexToOklch,
	normalizeHex,
	oklch,
	oklchToHex,
	relativeLuminance,
	withAlpha,
	type Oklch
} from './color';
import {
	DEFAULT_PALETTE_ID,
	findPalette,
	NEUTRAL_TEMPERATURES,
	paletteIds,
	PALETTES,
	type NeutralTemperature,
	type PaletteSeeds,
	type ThemeMode
} from './palettes';

export type ResolvedMode = 'light' | 'dark';

export interface CustomPalette {
	primary: string;
	secondary: string;
	tertiary: string;
	neutral: NeutralTemperature;
}

export interface ThemePreference {
	/** Id del catálogo o `custom`. */
	palette: string;
	mode: ThemeMode;
	custom: CustomPalette | null;
}

export const DEFAULT_THEME: ThemePreference = {
	palette: DEFAULT_PALETTE_ID,
	mode: 'system',
	custom: null
};

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/** Mapa explícito: cada token del sistema, con su variable CSS. */
export const TOKEN_VARS = {
	background: '--ff-background',
	surface: '--ff-surface',
	surfaceDim: '--ff-surface-dim',
	surfaceBright: '--ff-surface-bright',
	surfaceContainerLowest: '--ff-surface-container-lowest',
	surfaceContainerLow: '--ff-surface-container-low',
	surfaceContainer: '--ff-surface-container',
	surfaceContainerHigh: '--ff-surface-container-high',
	surfaceContainerHighest: '--ff-surface-container-highest',
	surfaceVariant: '--ff-surface-variant',
	onSurface: '--ff-on-surface',
	onSurfaceVariant: '--ff-on-surface-variant',
	onBackground: '--ff-on-background',
	inverseSurface: '--ff-inverse-surface',
	inverseOnSurface: '--ff-inverse-on-surface',
	outline: '--ff-outline',
	outlineVariant: '--ff-outline-variant',

	primary: '--ff-primary',
	onPrimary: '--ff-on-primary',
	primaryContainer: '--ff-primary-container',
	onPrimaryContainer: '--ff-on-primary-container',
	primaryFixed: '--ff-primary-fixed',
	primaryFixedDim: '--ff-primary-fixed-dim',
	onPrimaryFixed: '--ff-on-primary-fixed',
	onPrimaryFixedVariant: '--ff-on-primary-fixed-variant',

	secondary: '--ff-secondary',
	onSecondary: '--ff-on-secondary',
	secondaryContainer: '--ff-secondary-container',
	onSecondaryContainer: '--ff-on-secondary-container',
	secondaryFixed: '--ff-secondary-fixed',
	secondaryFixedDim: '--ff-secondary-fixed-dim',
	onSecondaryFixed: '--ff-on-secondary-fixed',
	onSecondaryFixedVariant: '--ff-on-secondary-fixed-variant',

	tertiary: '--ff-tertiary',
	onTertiary: '--ff-on-tertiary',
	tertiaryContainer: '--ff-tertiary-container',
	onTertiaryContainer: '--ff-on-tertiary-container',
	tertiaryFixed: '--ff-tertiary-fixed',
	tertiaryFixedDim: '--ff-tertiary-fixed-dim',
	onTertiaryFixed: '--ff-on-tertiary-fixed',
	onTertiaryFixedVariant: '--ff-on-tertiary-fixed-variant',

	error: '--ff-error',
	onError: '--ff-on-error',
	errorContainer: '--ff-error-container',
	onErrorContainer: '--ff-on-error-container',

	warning: '--ff-warning',
	warningInk: '--ff-warning-ink',
	warningInkStrong: '--ff-warning-ink-strong',
	success: '--ff-success',

	canvas: '--ff-canvas',
	level1: '--ff-level-1',
	hairline: '--ff-hairline',
	ink: '--ff-ink',
	muted: '--ff-muted',
	mutedSoft: '--ff-muted-soft',

	hero: '--ff-hero',
	heroForeground: '--ff-hero-foreground',
	heroOverlay: '--ff-hero-overlay',
	heroGradient: '--ff-hero-gradient',

	incomeSurface: '--ff-income-surface',
	incomeText: '--ff-income-text',
	expenseSurface: '--ff-expense-surface',
	expenseText: '--ff-expense-text',
	planSurface: '--ff-plan-surface',
	planText: '--ff-plan-text',

	shadowCard: '--ff-shadow-card',
	shadowElevated: '--ff-shadow-elevated',
	shadowSheet: '--ff-shadow-sheet',
	shadowFab: '--ff-shadow-fab',
	shadowHero: '--ff-shadow-hero',
	glow: '--ff-glow'
} as const;

export type ThemeToken = keyof typeof TOKEN_VARS;
export type ThemeTokens = Record<ThemeToken, string>;

export const TOKEN_NAMES = Object.keys(TOKEN_VARS) as ThemeToken[];

export interface ResolvedTheme {
	preference: ThemePreference;
	light: ThemeTokens;
	dark: ThemeTokens;
	/** CSS que debe inyectarse en el documento (puede ser vacío). */
	css: string;
	/** `theme-color` para la barra del sistema, dependiente del modo. */
	meta: Array<{ color: string; media?: string }>;
	/** Tokens del modo activo (o claro si es `system`, para la vista previa). */
	active: ThemeTokens;
}

/* -------------------------------------------------------------------------- */
/* Preferencia                                                                 */
/* -------------------------------------------------------------------------- */

function isThemeMode(value: unknown): value is ThemeMode {
	return value === 'light' || value === 'dark' || value === 'system';
}

function isNeutralTemperature(value: unknown): value is NeutralTemperature {
	return value === 'cool' || value === 'neutral' || value === 'warm';
}

/** Lectura defensiva de valores que vienen de la base (jsonb o columnas). */
export function parseThemePreference(
	palette: unknown,
	mode: unknown,
	custom: unknown
): ThemePreference {
	const requested = typeof palette === 'string' ? palette : '';
	const fallback = requested === 'custom' ? 'custom' : DEFAULT_PALETTE_ID;
	const resolvedPalette = findPalette(requested)?.id ?? fallback;

	const parsedCustom = parseCustomPalette(custom);

	return {
		palette: resolvedPalette === 'custom' && !parsedCustom ? DEFAULT_PALETTE_ID : resolvedPalette,
		mode: isThemeMode(mode) ? mode : DEFAULT_THEME.mode,
		custom: parsedCustom
	};
}

export function parseCustomPalette(value: unknown): CustomPalette | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	const primary = normalizeHex(record.primary);
	const secondary = normalizeHex(record.secondary);
	const tertiary = normalizeHex(record.tertiary);
	const neutral = isNeutralTemperature(record.neutral) ? record.neutral : 'neutral';

	if (!primary || !secondary || !tertiary) return null;

	return { primary, secondary, tertiary, neutral };
}

/* -------------------------------------------------------------------------- */
/* Derivación                                                                  */
/* -------------------------------------------------------------------------- */

function seedsFor(preference: ThemePreference): PaletteSeeds {
	if (preference.palette === 'custom' && preference.custom) {
		const temperature = NEUTRAL_TEMPERATURES[preference.custom.neutral];
		return {
			primary: preference.custom.primary,
			secondary: preference.custom.secondary,
			tertiary: preference.custom.tertiary,
			neutralHue: temperature.hue,
			neutralChroma: temperature.chroma,
			heroLight: '#1f2433',
			heroDark: '#151a24'
		};
	}

	const palette = findPalette(preference.palette) ?? findPalette(DEFAULT_PALETTE_ID) ?? PALETTES[0];
	return palette.seeds;
}

interface FamilyTokens {
	base: string;
	onBase: string;
	container: string;
	onContainer: string;
	fixed: string;
	fixedDim: string;
	onFixed: string;
	onFixedVariant: string;
}

/**
 * Familia cromática (marca, planes, gastos) en ocho tokens. El tono es el de la
 * semilla; la luminosidad se ajusta para cumplir contraste y para que el color
 * funcione tanto de fondo de botón como de texto.
 */
function buildFamily(
	seedHex: string,
	mode: ResolvedMode,
	background: string,
	heroSurface: string
): FamilyTokens {
	const seed = hexToOklch(seedHex);
	const chroma = Math.min(Math.max(seed.c, 0.045), 0.19);

	const baseColor: Oklch =
		mode === 'light'
			? ensureContrast({ l: seed.l, c: chroma, h: seed.h }, background, 4.6)
			: ensureContrast({ l: Math.max(seed.l, 0.66), c: chroma, h: seed.h }, background, 4.6);
	const base = oklchToHex(baseColor);

	const container: Oklch =
		mode === 'light'
			? {
					l: Math.min(0.8, Math.max(0.58, baseColor.l + 0.2)),
					c: Math.min(chroma * 1.05, 0.16),
					h: seed.h
				}
			: { l: 0.33, c: Math.min(chroma * 0.7, 0.12), h: seed.h };
	const containerHex = oklchToHex(container);

	const onContainer = ensureContrast(
		mode === 'light'
			? { l: Math.max(0.24, baseColor.l - 0.38), c: Math.min(chroma, 0.1), h: seed.h }
			: { l: 0.9, c: Math.min(chroma * 0.5, 0.09), h: seed.h },
		containerHex,
		4.6
	);

	const fixedColor = ensureContrast(
		{ l: 0.86, c: Math.min(chroma * 0.85, 0.14), h: seed.h },
		heroSurface,
		4.6
	);
	const fixed = oklchToHex(fixedColor);
	const fixedDim = oklchToHex(
		ensureContrast({ l: 0.79, c: Math.min(chroma * 0.9, 0.15), h: seed.h }, heroSurface, 4.5)
	);
	const onFixed = oklchToHex(
		ensureContrast({ l: 0.22, c: Math.min(chroma, 0.08), h: seed.h }, fixed, 7)
	);
	const onFixedVariant = oklchToHex(
		ensureContrast({ l: 0.38, c: Math.min(chroma, 0.1), h: seed.h }, fixed, 4.6)
	);

	return {
		base,
		onBase: bestOn(base),
		container: containerHex,
		onContainer: oklchToHex(onContainer),
		fixed,
		fixedDim,
		onFixed,
		onFixedVariant
	};
}

/** Superficie y texto de un estado financiero (ingreso, gasto, plan). */
function buildState(seedHex: string, mode: ResolvedMode): { surface: string; text: string } {
	const seed = hexToOklch(seedHex);
	const chroma = Math.min(Math.max(seed.c, 0.05), 0.19);

	const surface =
		mode === 'light'
			? oklch(0.968, Math.min(chroma * 0.3, 0.045), seed.h)
			: oklch(0.268, Math.min(chroma * 0.28, 0.045), seed.h);

	const text = oklchToHex(
		ensureContrast(
			mode === 'light'
				? { l: 0.4, c: Math.min(chroma, 0.12), h: seed.h }
				: { l: 0.88, c: Math.min(chroma * 0.6, 0.09), h: seed.h },
			surface,
			4.6
		)
	);

	return { surface, text };
}

function buildSurfaces(
	seeds: PaletteSeeds,
	mode: ResolvedMode
): Pick<
	ThemeTokens,
	| 'background'
	| 'surface'
	| 'surfaceDim'
	| 'surfaceBright'
	| 'surfaceContainerLowest'
	| 'surfaceContainerLow'
	| 'surfaceContainer'
	| 'surfaceContainerHigh'
	| 'surfaceContainerHighest'
	| 'surfaceVariant'
	| 'canvas'
	| 'level1'
	| 'hairline'
	| 'outline'
	| 'outlineVariant'
	| 'onSurface'
	| 'onSurfaceVariant'
	| 'onBackground'
	| 'inverseSurface'
	| 'inverseOnSurface'
	| 'ink'
	| 'muted'
	| 'mutedSoft'
> {
	const { neutralHue: h, neutralChroma: c } = seeds;

	if (mode === 'light') {
		const background = oklch(0.984, c * 0.7, h);
		const surfaceLowest = oklch(0.999, c * 0.4, h);
		const textBase = surfaceLowest;

		return {
			background,
			surface: background,
			surfaceDim: oklch(0.87, c * 1.3, h),
			surfaceBright: oklch(0.996, c * 0.5, h),
			surfaceContainerLowest: surfaceLowest,
			surfaceContainerLow: oklch(0.966, c * 1.1, h),
			surfaceContainer: oklch(0.946, c * 1.3, h),
			surfaceContainerHigh: oklch(0.926, c * 1.4, h),
			surfaceContainerHighest: oklch(0.906, c * 1.5, h),
			surfaceVariant: oklch(0.906, c * 1.5, h),
			canvas: oklch(0.973, c * 0.9, h),
			level1: oklch(0.956, c * 1.2, h),
			hairline: oklch(0.906, c * 1.4, h),
			outline: oklch(0.56, c * 1.3, h),
			outlineVariant: oklch(0.8, c * 1.4, h),
			onSurface: oklchToHex(ensureContrast({ l: 0.2, c: c * 1.5, h }, textBase, 12)),
			onSurfaceVariant: oklchToHex(ensureContrast({ l: 0.45, c: c * 1.4, h }, textBase, 7)),
			onBackground: oklchToHex(ensureContrast({ l: 0.2, c: c * 1.5, h }, textBase, 12)),
			inverseSurface: oklch(0.27, c * 1.8, h),
			inverseOnSurface: oklch(0.96, c * 0.5, h),
			ink: oklchToHex(ensureContrast({ l: 0.2, c: c * 1.5, h }, textBase, 12)),
			muted: oklchToHex(ensureContrast({ l: 0.57, c: c * 1.1, h }, textBase, 4.6)),
			mutedSoft: oklchToHex(ensureContrast({ l: 0.72, c: c * 0.9, h }, textBase, 4.5))
		};
	}

	const background = oklch(0.176, c * 1.2, h);
	const textBase = background;
	const card = oklch(0.226, c * 1.1, h);

	return {
		background,
		surface: oklch(0.19, c * 1.2, h),
		surfaceDim: oklch(0.138, c * 1.1, h),
		surfaceBright: oklch(0.32, c * 1.2, h),
		surfaceContainerLowest: card,
		surfaceContainerLow: oklch(0.246, c * 1.2, h),
		surfaceContainer: oklch(0.266, c * 1.2, h),
		surfaceContainerHigh: oklch(0.286, c * 1.3, h),
		surfaceContainerHighest: oklch(0.306, c * 1.3, h),
		surfaceVariant: oklch(0.306, c * 1.3, h),
		canvas: oklch(0.152, c * 0.9, h),
		level1: oklch(0.238, c * 1.1, h),
		hairline: oklch(0.3, c * 1.1, h),
		outline: oklch(0.58, c * 1.1, h),
		outlineVariant: oklch(0.38, c * 1.1, h),
		onSurface: oklchToHex(ensureContrast({ l: 0.95, c: c * 0.5, h }, textBase, 12)),
		onSurfaceVariant: oklchToHex(ensureContrast({ l: 0.8, c: c * 0.8, h }, textBase, 7)),
		onBackground: oklchToHex(ensureContrast({ l: 0.95, c: c * 0.5, h }, textBase, 12)),
		inverseSurface: oklch(0.93, c * 0.4, h),
		inverseOnSurface: oklch(0.2, c * 1.2, h),
		ink: oklchToHex(ensureContrast({ l: 0.95, c: c * 0.5, h }, textBase, 12)),
		muted: oklchToHex(ensureContrast({ l: 0.68, c: c * 0.9, h }, textBase, 4.6)),
		mutedSoft: oklchToHex(ensureContrast({ l: 0.6, c: c * 0.8, h }, textBase, 4.5))
	};
}

function buildShadows(
	primary: string,
	mode: ResolvedMode
): Pick<
	ThemeTokens,
	'shadowCard' | 'shadowElevated' | 'shadowSheet' | 'shadowFab' | 'shadowHero' | 'glow'
> {
	if (mode === 'light') {
		return {
			shadowCard: '0 1px 3px 0 rgb(15 23 42 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.03)',
			shadowElevated: '0 10px 25px -5px rgb(15 23 42 / 0.08)',
			shadowSheet: '0 -10px 30px -10px rgb(15 23 42 / 0.18)',
			shadowFab: `0 10px 20px -6px ${withAlpha(primary, 0.45)}`,
			shadowHero: '0 18px 40px -18px rgb(19 27 46 / 0.55)',
			glow: withAlpha(primary, 0.45)
		};
	}

	return {
		shadowCard: '0 1px 2px 0 rgb(0 0 0 / 0.45), 0 8px 20px -8px rgb(0 0 0 / 0.55)',
		shadowElevated: '0 18px 40px -12px rgb(0 0 0 / 0.7)',
		shadowSheet: '0 -12px 36px -12px rgb(0 0 0 / 0.75)',
		shadowFab: `0 10px 22px -6px ${withAlpha(primary, 0.5)}`,
		shadowHero: '0 18px 40px -18px rgb(0 0 0 / 0.8)',
		glow: withAlpha(primary, 0.55)
	};
}

/** Construye todos los tokens para una preferencia y un modo resuelto. */
export function buildTokens(preference: ThemePreference, mode: ResolvedMode): ThemeTokens {
	const seeds = seedsFor(preference);
	const surfaces = buildSurfaces(seeds, mode);
	const hero = mode === 'light' ? seeds.heroLight : seeds.heroDark;

	const primary = buildFamily(seeds.primary, mode, surfaces.background, hero);
	const secondary = buildFamily(seeds.secondary, mode, surfaces.background, hero);
	const tertiary = buildFamily(seeds.tertiary, mode, surfaces.background, hero);
	const income = buildState(seeds.primary, mode);
	const expense = buildState(seeds.tertiary, mode);
	const plan = buildState(seeds.secondary, mode);
	const shadows = buildShadows(primary.base, mode);

	const errorColor = oklchToHex(
		ensureContrast(
			mode === 'light' ? { l: 0.56, c: 0.21, h: 25 } : { l: 0.74, c: 0.17, h: 25 },
			surfaces.background,
			4.6
		)
	);
	const errorContainer = mode === 'light' ? oklch(0.925, 0.055, 25) : oklch(0.3, 0.09, 25);

	const heroForeground = oklchToHex(ensureContrast(hexToOklch(bestOn(hero)), hero, 7));
	const heroIsDark = relativeLuminance(hero) < 0.35;
	const heroOverlay = heroIsDark ? 'rgb(255 255 255 / 0.08)' : 'rgb(15 23 42 / 0.06)';

	return {
		...surfaces,
		primary: primary.base,
		onPrimary: primary.onBase,
		primaryContainer: primary.container,
		onPrimaryContainer: primary.onContainer,
		primaryFixed: primary.fixed,
		primaryFixedDim: primary.fixedDim,
		onPrimaryFixed: primary.onFixed,
		onPrimaryFixedVariant: primary.onFixedVariant,

		secondary: secondary.base,
		onSecondary: secondary.onBase,
		secondaryContainer: secondary.container,
		onSecondaryContainer: secondary.onContainer,
		secondaryFixed: secondary.fixed,
		secondaryFixedDim: secondary.fixedDim,
		onSecondaryFixed: secondary.onFixed,
		onSecondaryFixedVariant: secondary.onFixedVariant,

		tertiary: tertiary.base,
		onTertiary: tertiary.onBase,
		tertiaryContainer: tertiary.container,
		onTertiaryContainer: tertiary.onContainer,
		tertiaryFixed: tertiary.fixed,
		tertiaryFixedDim: tertiary.fixedDim,
		onTertiaryFixed: tertiary.onFixed,
		onTertiaryFixedVariant: tertiary.onFixedVariant,

		error: errorColor,
		onError: bestOn(errorColor),
		errorContainer,
		onErrorContainer: oklchToHex(
			ensureContrast(
				mode === 'light' ? { l: 0.35, c: 0.14, h: 25 } : { l: 0.88, c: 0.06, h: 25 },
				errorContainer,
				4.6
			)
		),

		warning: mode === 'light' ? oklch(0.79, 0.16, 78) : oklch(0.82, 0.15, 80),
		warningInk: oklchToHex(
			ensureContrast(
				mode === 'light' ? { l: 0.58, c: 0.13, h: 70 } : { l: 0.86, c: 0.11, h: 78 },
				surfaces.background,
				4.6
			)
		),
		warningInkStrong: oklchToHex(
			ensureContrast(
				mode === 'light' ? { l: 0.47, c: 0.12, h: 62 } : { l: 0.79, c: 0.12, h: 70 },
				surfaces.background,
				4.6
			)
		),
		success: oklchToHex(
			ensureContrast(
				mode === 'light' ? { l: 0.52, c: 0.12, h: 158 } : { l: 0.8, c: 0.11, h: 158 },
				surfaces.background,
				4.6
			)
		),

		hero,
		heroForeground,
		heroOverlay,
		heroGradient: `radial-gradient(115% 130% at 12% -10%, ${withAlpha(primary.base, 0.28)} 0%, ${withAlpha(primary.base, 0.06)} 45%, transparent 72%)`,

		incomeSurface: income.surface,
		incomeText: income.text,
		expenseSurface: expense.surface,
		expenseText: expense.text,
		planSurface: plan.surface,
		planText: plan.text,

		...shadows
	};
}

/* -------------------------------------------------------------------------- */
/* Serialización                                                               */
/* -------------------------------------------------------------------------- */

function declarations(tokens: ThemeTokens): string {
	return TOKEN_NAMES.map((key) => `${TOKEN_VARS[key]}:${tokens[key]}`).join(';');
}

/**
 * CSS del tema. `:root:root` eleva la especificidad para que el bloque gane sin
 * depender del orden en que el navegador inserte el CSS del layout o del HMR.
 *
 * El modo `system` delega la decisión en `prefers-color-scheme`: así no hay
 * parpadeo ni hace falta JavaScript para el primer render.
 */
export function themeCss(preference: ThemePreference): string {
	const isDefault = preference.custom === null && preference.palette === DEFAULT_PALETTE_ID;
	const light = buildTokens(preference, 'light');
	const dark = buildTokens(preference, 'dark');

	const lightBlock = `:root:root{${declarations(light)};color-scheme:light}`;
	const darkBlock = `@media (prefers-color-scheme: dark){:root:root{${declarations(dark)};color-scheme:dark}}`;

	switch (preference.mode) {
		case 'light':
			return isDefault ? ':root:root{color-scheme:light}' : lightBlock;
		case 'dark':
			return `:root:root{${declarations(dark)};color-scheme:dark}`;
		case 'system':
			return isDefault ? darkBlock : `${lightBlock}${darkBlock}`;
	}
}

/** Resuelve todo lo que necesita el layout raíz en una sola llamada. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	const light = buildTokens(preference, 'light');
	const dark = buildTokens(preference, 'dark');

	const meta: Array<{ color: string; media?: string }> =
		preference.mode === 'light'
			? [{ color: light.background }]
			: preference.mode === 'dark'
				? [{ color: dark.background }]
				: [
						{ color: light.background, media: '(prefers-color-scheme: light)' },
						{ color: dark.background, media: '(prefers-color-scheme: dark)' }
					];

	return {
		preference,
		light,
		dark,
		css: themeCss(preference),
		meta,
		active: preference.mode === 'dark' ? dark : light
	};
}

/** Colores representativos para las tarjetas del catálogo. */
export function palettePreview(paletteId: string): {
	primary: string;
	secondary: string;
	tertiary: string;
} {
	const palette = findPalette(paletteId) ?? PALETTES[0];
	const preference: ThemePreference = { palette: palette.id, mode: 'light', custom: null };
	const tokens = buildTokens(preference, 'light');
	return {
		primary: tokens.primary,
		secondary: tokens.secondary,
		tertiary: tokens.tertiary
	};
}

/** Contraste de los pares críticos, para mostrar el badge AA en el selector. */
export function themeContrast(
	preference: ThemePreference,
	mode: ResolvedMode
): {
	body: number;
	primary: number;
	muted: number;
	hero: number;
} {
	const tokens = buildTokens(preference, mode);
	return {
		body: contrastRatio(tokens.onSurface, tokens.surfaceContainerLowest),
		primary: contrastRatio(tokens.primary, tokens.background),
		muted: contrastRatio(tokens.muted, tokens.surfaceContainerLowest),
		hero: contrastRatio(tokens.heroForeground, tokens.hero)
	};
}

/** Lista de ids válidos (incluye `custom`). */
export function validPaletteIds(): string[] {
	return [...paletteIds(), 'custom'];
}

/**
 * Ajusta las semillas de una paleta personalizada hasta que cumplan contraste
 * en el modo indicado. Devuelve los colores ya corregidos para que la vista
 * previa y el guardado usen exactamente el mismo valor.
 */
export function fitCustomPalette(custom: CustomPalette, mode: ResolvedMode): CustomPalette {
	const tokens = buildTokens({ palette: 'custom', mode, custom }, mode);
	return {
		primary: tokens.primary,
		secondary: tokens.secondary,
		tertiary: tokens.tertiary,
		neutral: custom.neutral
	};
}
