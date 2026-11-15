/**
 * Paleta de los informes exportados.
 *
 * El informe se genera en modo claro aunque la app esté en oscuro: se comparte
 * y se imprime. Solo se hereda la identidad cromática (marca, planes, gastos),
 * no las superficies oscuras.
 */

import { ensureContrast, hexToOklch, oklchToHex } from './color';
import type { ThemeTokens } from './derive';

export interface ReportPalette {
	primary: string;
	/** Verde claro del brillo del hero y del filete de las tarjetas. */
	primaryFixed: string;
	secondary: string;
	tertiary: string;
	ink: string;
	muted: string;
	hairline: string;
	surface: string;
	canvas: string;
	level1: string;
	heroFrom: string;
	heroMid: string;
	heroTo: string;
	heroGlow: string;
	incomeSurface: string;
	incomeText: string;
	expenseSurface: string;
	expenseText: string;
	planSurface: string;
	planText: string;
	/** Colores de reserva para series y gráficos sin color propio. */
	series: string[];
}

/** Identidad original de FinFlow; se usa cuando no hay sesión o en pruebas. */
export const DEFAULT_REPORT_PALETTE: ReportPalette = {
	primary: '#006c49',
	primaryFixed: '#4edea3',
	secondary: '#4648d4',
	tertiary: '#bc0b3b',
	ink: '#0f172a',
	muted: '#64748b',
	hairline: '#e2e8f0',
	surface: '#ffffff',
	canvas: '#faf8ff',
	level1: '#f1f5f9',
	heroFrom: '#006c49',
	heroMid: '#00563c',
	heroTo: '#003927',
	heroGlow: '#6ffbbe',
	incomeSurface: '#e8f7ef',
	incomeText: '#006c49',
	expenseSurface: '#fdecef',
	expenseText: '#bc0b3b',
	planSurface: '#eef0ff',
	planText: '#4648d4',
	series: ['#006c49', '#4648d4', '#bc0b3b', '#b45309', '#0e7490', '#7c3aed', '#64748b']
};

/**
 * Traduce los tokens del tema a la paleta del informe. El hero se oscurece
 * hasta que el texto blanco cumple contraste, para que funcione con cualquier
 * marca (incluida una lima clara como la de Wise).
 */
export function reportPaletteFromTokens(tokens: ThemeTokens): ReportPalette {
	const hero = ensureContrast(hexToOklch(tokens.primary), '#ffffff', 4.6);
	const heroFrom = oklchToHex(hero);
	const heroMid = oklchToHex({
		l: Math.max(0.12, hero.l - 0.07),
		c: hero.c,
		h: hero.h
	});
	const heroTo = oklchToHex({
		l: Math.max(0.08, hero.l - 0.17),
		c: hero.c * 0.9,
		h: hero.h
	});

	return {
		primary: tokens.primary,
		primaryFixed: tokens.primaryFixed,
		secondary: tokens.secondary,
		tertiary: tokens.tertiary,
		ink: tokens.ink,
		muted: tokens.muted,
		hairline: tokens.hairline,
		surface: tokens.surfaceContainerLowest,
		canvas: tokens.canvas,
		level1: tokens.level1,
		heroFrom,
		heroMid,
		heroTo,
		heroGlow: tokens.primaryFixed,
		incomeSurface: tokens.incomeSurface,
		incomeText: tokens.incomeText,
		expenseSurface: tokens.expenseSurface,
		expenseText: tokens.expenseText,
		planSurface: tokens.planSurface,
		planText: tokens.planText,
		series: [
			tokens.primary,
			tokens.secondary,
			tokens.tertiary,
			tokens.warningInk,
			tokens.incomeText,
			tokens.planText,
			tokens.muted
		]
	};
}
