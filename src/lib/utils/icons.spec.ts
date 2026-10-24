import { describe, expect, it } from 'vitest';
import { CATEGORY_ICONS, DEBT_ICONS, DEBT_ICON_GROUPS, ICON_GROUPS } from './icons';

describe('catálogo de iconos', () => {
	it('no repite grupos ni iconos', () => {
		const groupIds = ICON_GROUPS.map((group) => group.id);
		expect(new Set(groupIds).size).toBe(groupIds.length);

		const iconNames = ICON_GROUPS.flatMap((group) => group.icons);
		expect(new Set(iconNames).size).toBe(iconNames.length);
	});

	it('usa nombres válidos de Material Symbols', () => {
		for (const group of ICON_GROUPS) {
			expect(group.label.trim()).not.toBe('');
			for (const icon of group.icons) {
				expect(icon).toMatch(/^[a-z0-9_]{1,40}$/);
			}
		}
	});

	it('genera las listas planas en el mismo orden que los grupos', () => {
		expect(CATEGORY_ICONS).toEqual(ICON_GROUPS.flatMap((group) => group.icons));
		expect(DEBT_ICONS).toEqual(DEBT_ICON_GROUPS.flatMap((group) => group.icons));
		expect(DEBT_ICON_GROUPS.length).toBeGreaterThan(0);
		expect(DEBT_ICONS).toContain('credit_card');
		expect(DEBT_ICONS).toContain('home');
	});
});
