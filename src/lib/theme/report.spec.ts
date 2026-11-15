import { describe, expect, test } from 'vitest';
import { contrastRatio } from './color';
import { buildTokens } from './derive';
import { DEFAULT_REPORT_PALETTE, reportPaletteFromTokens } from './report';
import { PALETTES } from './palettes';

describe('reportPaletteFromTokens', () => {
	for (const palette of PALETTES) {
		test(`${palette.id} mantiene el hero legible con texto blanco`, () => {
			const tokens = buildTokens({ palette: palette.id, mode: 'light', custom: null }, 'light');
			const report = reportPaletteFromTokens(tokens);

			expect(contrastRatio(report.heroFrom, '#ffffff')).toBeGreaterThanOrEqual(4.5);
			expect(contrastRatio(report.heroMid, '#ffffff')).toBeGreaterThanOrEqual(4.5);
			expect(contrastRatio(report.heroTo, '#ffffff')).toBeGreaterThanOrEqual(4.5);
			expect(report.series).toHaveLength(7);
			// El informe usa superficies claras aunque la app esté en oscuro.
			expect(report.surface).toBe(tokens.surfaceContainerLowest);
		});
	}

	test('hereda la marca del tema activo', () => {
		const tokens = buildTokens({ palette: 'nubank', mode: 'light', custom: null }, 'light');
		expect(reportPaletteFromTokens(tokens).primary).toBe(tokens.primary);
	});
});

describe('DEFAULT_REPORT_PALETTE', () => {
	test('conserva la identidad original para exportes sin sesión', () => {
		expect(DEFAULT_REPORT_PALETTE.primary).toBe('#006c49');
		expect(DEFAULT_REPORT_PALETTE.series[0]).toBe('#006c49');
	});

	test('el texto de las píldoras contrasta con su fondo', () => {
		expect(
			contrastRatio(DEFAULT_REPORT_PALETTE.incomeText, DEFAULT_REPORT_PALETTE.incomeSurface)
		).toBeGreaterThanOrEqual(4.5);
		expect(
			contrastRatio(DEFAULT_REPORT_PALETTE.expenseText, DEFAULT_REPORT_PALETTE.expenseSurface)
		).toBeGreaterThanOrEqual(4.5);
	});
});
