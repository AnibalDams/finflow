import { describe, expect, it } from 'vitest';
import {
	addDays,
	dateAtOffset,
	daysLeftInMonth,
	daysUntil,
	formatCountdown,
	formatDayMonth,
	formatFullDate,
	formatLongDate,
	formatMonthName,
	formatRelativeDay,
	localDateTimeToUtc,
	localRangeInstants,
	monthGrid,
	monthKey,
	monthParam,
	monthRange,
	monthsBetween,
	parseISODate,
	parseMonthParam,
	periodRange,
	resolveLocalInstant,
	shiftPeriodReference,
	startOfWeek,
	timeAtOffset,
	toISODate
} from './dates';

describe('fechas base', () => {
	it('serializa y parsea como fecha local', () => {
		const date = new Date(2026, 9, 18);
		expect(toISODate(date)).toBe('2026-10-18');
		expect(toISODate(parseISODate('2026-10-18'))).toBe('2026-10-18');
		expect(parseISODate('2026-10-18').getHours()).toBe(0);
	});

	it('calcula la clave del mes y el lunes de la semana', () => {
		expect(monthKey(new Date(2026, 9, 18))).toBe('2026-10-01');
		// 18 Oct 2026 es domingo: la semana empieza el lunes 12.
		expect(toISODate(startOfWeek(new Date(2026, 9, 18)))).toBe('2026-10-12');
		expect(toISODate(addDays(new Date(2026, 9, 18), 3))).toBe('2026-10-21');
	});

	it('serializa e interpreta la clave de mes para URLs', () => {
		expect(monthParam(new Date(2026, 9, 18))).toBe('2026-10');
		expect(toISODate(parseMonthParam('2026-10') ?? new Date(0))).toBe('2026-10-01');
		expect(parseMonthParam('2026-13')).toBeNull();
		expect(parseMonthParam('2026-1')).toBeNull();
		expect(parseMonthParam('octubre')).toBeNull();
		expect(parseMonthParam(null)).toBeNull();
	});
});

describe('monthGrid', () => {
	it('empieza en lunes y rellena con los meses vecinos', () => {
		// Octubre de 2026 empieza en jueves: la rejilla arranca el lunes 28 de septiembre.
		const cells = monthGrid(new Date(2026, 9, 18));

		expect(cells).toHaveLength(42);
		expect(cells[0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false });
		expect(cells[41]).toEqual({ date: '2026-11-08', day: 8, inMonth: false });
		expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
		expect(cells.find((cell) => cell.inMonth)?.date).toBe('2026-10-01');
	});

	it('no desplaza la primera celda cuando el mes empieza en lunes', () => {
		const cells = monthGrid(new Date(2027, 1, 10));

		expect(cells[0]).toEqual({ date: '2027-02-01', day: 1, inMonth: true });
		expect(cells.filter((cell) => cell.inMonth)).toHaveLength(28);
	});

	it('atraviesa el cambio de año sin desfase', () => {
		const cells = monthGrid(new Date(2025, 11, 15));

		expect(cells[0].date).toBe('2025-12-01');
		expect(cells[41].date).toBe('2026-01-11');
	});
});

describe('periodRange', () => {
	it('devuelve el mes con su periodo anterior equivalente', () => {
		const range = periodRange('month', new Date(2026, 9, 18));
		// La ventana anterior tiene la misma duración: 31 días (31 Ago – 30 Sep).
		expect(range).toMatchObject({
			from: '2026-10-01',
			to: '2026-10-31',
			label: 'Oct 2026',
			prevFrom: '2026-08-31',
			prevTo: '2026-09-30',
			previousLabel: 'Ago 2026'
		});
	});

	it('usa 28 días para febrero en año no bisiesto', () => {
		expect(monthRange('2026-02').to).toBe('2026-02-28');
	});

	it('devuelve la semana de lunes a domingo', () => {
		const range = periodRange('week', new Date(2026, 9, 14));
		expect(range.from).toBe('2026-10-12');
		expect(range.to).toBe('2026-10-18');
		expect(range.label).toBe('Oct 12 – 18');
		expect(range.prevTo).toBe('2026-10-11');
	});

	it('devuelve trimestre y año con su etiqueta', () => {
		const quarter = periodRange('quarter', new Date(2026, 9, 18));
		expect(quarter).toMatchObject({
			from: '2026-10-01',
			to: '2026-12-31',
			label: '4º trimestre 2026',
			prevFrom: '2026-07-01',
			prevTo: '2026-09-30',
			previousLabel: '3º trimestre 2026'
		});

		const year = periodRange('year', new Date(2026, 9, 18));
		expect(year).toMatchObject({
			from: '2026-01-01',
			to: '2026-12-31',
			label: '2026',
			prevFrom: '2025-01-01',
			prevTo: '2025-12-31',
			previousLabel: '2025'
		});
	});

	it('desplaza la referencia según el preset', () => {
		const reference = new Date(2026, 9, 18);
		expect(toISODate(shiftPeriodReference(reference, 'week', -1))).toBe('2026-10-11');
		expect(toISODate(shiftPeriodReference(reference, 'month', 1))).toBe('2026-11-18');
		expect(toISODate(shiftPeriodReference(reference, 'quarter', -1))).toBe('2026-07-18');
		expect(toISODate(shiftPeriodReference(reference, 'year', 1))).toBe('2027-10-18');
	});
});

describe('etiquetas de fecha', () => {
	it('formatea día, fecha completa y fecha larga', () => {
		expect(formatDayMonth('2026-10-24')).toBe('24 Oct');
		expect(formatFullDate('2026-10-24')).toBe('24 Oct 2026');
		expect(formatLongDate('2026-11-15')).toBe('15 de noviembre de 2026');
		expect(formatMonthName('2026-10-01')).toBe('Octubre');
		expect(formatMonthName('2026-10-01', true)).toBe('Octubre 2026');
	});

	it('describe el día relativo a una referencia', () => {
		const now = new Date(2026, 9, 18);
		expect(formatRelativeDay(new Date(2026, 9, 18), now)).toBe('Hoy, 18 Oct');
		expect(formatRelativeDay(new Date(2026, 9, 17), now)).toBe('Ayer');
		expect(formatRelativeDay(new Date(2026, 9, 19), now)).toBe('Mañana, 19 Oct');
		expect(formatRelativeDay(new Date(2026, 9, 25), now)).toBe('25 Oct');
	});

	it('cuenta los días restantes', () => {
		const from = new Date(2026, 9, 18);
		expect(daysUntil('2026-10-25', from)).toBe(7);
		expect(daysUntil('2026-10-18', from)).toBe(0);
		expect(daysUntil('2026-10-15', from)).toBe(-3);
		expect(formatCountdown('2026-10-18', from)).toBe('hoy');
		expect(formatCountdown('2026-10-19', from)).toBe('mañana');
		expect(formatCountdown('2026-10-25', from)).toBe('en 7 días');
		expect(formatCountdown('2026-10-15', from)).toBe('hace 3 días');
	});

	it('calcula los días restantes del mes', () => {
		expect(daysLeftInMonth(new Date(2026, 9, 18))).toBe(14);
	});

	it('cuenta meses completos con mínimo de 1', () => {
		expect(monthsBetween(new Date(2026, 0, 1), new Date(2026, 6, 1))).toBe(6);
		expect(monthsBetween(new Date(2026, 0, 1), new Date(2026, 0, 20))).toBe(1);
	});
});

describe('zona horaria', () => {
	const instant = new Date('2026-10-21T01:00:00.000Z');

	it('calcula fecha y hora locales con el offset del navegador', () => {
		expect(dateAtOffset(240, instant)).toBe('2026-10-20');
		expect(timeAtOffset(240, instant)).toBe('21:00');
		expect(dateAtOffset(0, instant)).toBe('2026-10-21');
		expect(timeAtOffset(0, instant)).toBe('01:00');
	});

	it('convierte fecha y hora locales a un instante UTC', () => {
		expect(localDateTimeToUtc('2026-10-20', '13:12', 240)).toBe('2026-10-20T17:12:00.000Z');
		expect(localDateTimeToUtc('2026-10-20', '13:12', 0)).toBe('2026-10-20T13:12:00.000Z');
	});

	it('convierte rangos locales a instantes UTC', () => {
		expect(localRangeInstants({ from: '2026-10-01', to: '2026-10-31' }, 240)).toEqual({
			fromInstant: '2026-10-01T04:00:00.000Z',
			toInstant: '2026-11-01T03:59:59.999Z'
		});
	});

	it('prioriza el ISO del cliente y usa el offset como respaldo', () => {
		expect(resolveLocalInstant('2026-10-20T17:12:00.000Z', '', '', 240)).toBe(
			'2026-10-20T17:12:00.000Z'
		);
		expect(resolveLocalInstant('', '2026-10-20', '13:12', 240)).toBe('2026-10-20T17:12:00.000Z');
	});

	it('interpreta fechas puras como locales al mostrar', () => {
		expect(formatRelativeDay('2026-10-18', new Date(2026, 9, 18))).toBe('Hoy, 18 Oct');
	});

	it('formatea timestamps con la fecha local', () => {
		const local = new Date(2026, 9, 20, 21, 0);
		expect(formatFullDate(local.toISOString())).toBe('20 Oct 2026');
	});
});
