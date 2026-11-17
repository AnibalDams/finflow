import { describe, expect, test } from 'vitest';
import {
	isSeasonActive,
	isSeasonPreference,
	NAVIDAD,
	resolveSeason,
	SEASON_AUTO,
	SEASON_OFF
} from './seasons';

describe('isSeasonActive', () => {
	test('cubre diciembre completo', () => {
		expect(isSeasonActive(NAVIDAD, '2026-12-01')).toBe(true);
		expect(isSeasonActive(NAVIDAD, '2026-12-25')).toBe(true);
		expect(isSeasonActive(NAVIDAD, '2026-12-31')).toBe(true);
	});

	test('cruza el fin de año hasta Reyes', () => {
		expect(isSeasonActive(NAVIDAD, '2027-01-01')).toBe(true);
		expect(isSeasonActive(NAVIDAD, '2027-01-06')).toBe(true);
		expect(isSeasonActive(NAVIDAD, '2027-01-07')).toBe(false);
	});

	test('queda apagada el resto del año', () => {
		expect(isSeasonActive(NAVIDAD, '2026-11-30')).toBe(false);
		expect(isSeasonActive(NAVIDAD, '2026-06-15')).toBe(false);
	});

	test('ignora horas si llegan en el ISO', () => {
		expect(isSeasonActive(NAVIDAD, '2026-12-24T23:30:00Z')).toBe(true);
	});

	test('una fecha inválida no activa nada', () => {
		expect(isSeasonActive(NAVIDAD, 'nope')).toBe(false);
	});
});

describe('resolveSeason', () => {
	test('auto respeta la ventana', () => {
		expect(resolveSeason(SEASON_AUTO, '2026-12-10')?.id).toBe('navidad');
		expect(resolveSeason(SEASON_AUTO, '2026-11-10')).toBeNull();
	});

	test('off desactiva aunque estemos en temporada', () => {
		expect(resolveSeason(SEASON_OFF, '2026-12-25')).toBeNull();
	});

	test('un id fuerza el pack fuera de temporada', () => {
		expect(resolveSeason('navidad', '2026-11-16')?.id).toBe('navidad');
	});

	test('un valor desconocido se comporta como auto', () => {
		expect(resolveSeason('halloween', '2026-12-25')?.id).toBe('navidad');
		expect(resolveSeason('halloween', '2026-06-15')).toBeNull();
	});
});

describe('isSeasonPreference', () => {
	test('acepta auto, off y packs conocidos', () => {
		expect(isSeasonPreference('auto')).toBe(true);
		expect(isSeasonPreference('off')).toBe(true);
		expect(isSeasonPreference('navidad')).toBe(true);
	});

	test('rechaza valores arbitrarios', () => {
		expect(isSeasonPreference('cumpleanos')).toBe(false);
		expect(isSeasonPreference('')).toBe(false);
	});
});
