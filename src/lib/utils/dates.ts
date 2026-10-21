/**
 * Utilidades de fecha.
 *
 * Las fechas `date` de PostgreSQL llegan como `YYYY-MM-DD` y se interpretan
 * siempre como fecha local para evitar desplazamientos por zona horaria.
 */

export type PeriodPreset = 'week' | 'month' | 'quarter' | 'year';

const DAY_MS = 86_400_000;

const MONTHS_SHORT = [
	'Ene',
	'Feb',
	'Mar',
	'Abr',
	'May',
	'Jun',
	'Jul',
	'Ago',
	'Sep',
	'Oct',
	'Nov',
	'Dic'
];

const MONTHS_LONG = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre'
];

/** `YYYY-MM-DD` en hora local. */
export function toISODate(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Interpreta `YYYY-MM-DD` como fecha local. */
export function parseISODate(value: string): Date {
	const [year, month, day] = value.slice(0, 10).split('-').map(Number);
	return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/** Desplaza un instante para que sus getters UTC representen la hora local. */
function shiftToLocal(date: Date, offsetMinutes: number): Date {
	return new Date(date.getTime() - offsetMinutes * 60_000);
}

/**
 * Fecha local (`YYYY-MM-DD`) de un instante para el offset indicado.
 * `getTimezoneOffset()` devuelve minutos por detrás de UTC (UTC-4 → 240).
 */
export function dateAtOffset(offsetMinutes: number, reference: Date = new Date()): string {
	const local = shiftToLocal(reference, offsetMinutes);
	return `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;
}

/** Hora local (`HH:mm`) de un instante para el offset indicado. */
export function timeAtOffset(offsetMinutes: number, reference: Date = new Date()): string {
	const local = shiftToLocal(reference, offsetMinutes);
	return `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;
}

/** Fecha local de referencia, lista para `periodRange`/`monthKey`. */
export function referenceAtOffset(offsetMinutes: number, reference: Date = new Date()): Date {
	return parseISODate(dateAtOffset(offsetMinutes, reference));
}

/** Convierte una fecha y hora locales a un instante UTC ISO. */
export function localDateTimeToUtc(date: string, time: string, offsetMinutes: number): string {
	const [year, month, day] = date.slice(0, 10).split('-').map(Number);
	const [hours, minutes] = (time || '12:00').split(':').map(Number);

	return new Date(
		Date.UTC(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0) + offsetMinutes * 60_000
	).toISOString();
}

/**
 * Resuelve el instante enviado por el formulario. Prioriza el ISO del cliente
 * (conoce su zona y DST); si no viene, compone fecha/hora con el offset.
 */
export function resolveLocalInstant(
	rawInstant: string,
	rawDate: string,
	rawTime: string,
	offsetMinutes: number
): string {
	const instant = rawInstant.trim();
	if (instant) {
		const parsed = new Date(instant);
		return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
	}

	const date = rawDate.trim();
	const time = rawTime.trim() || '12:00';

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return '';
	return localDateTimeToUtc(date, time, offsetMinutes);
}

/** Inicio del día local como instante UTC ISO. */
export function localDayStartUtc(date: string, offsetMinutes: number): string {
	const [year, month, day] = date.slice(0, 10).split('-').map(Number);
	return new Date(
		Date.UTC(year, (month ?? 1) - 1, day ?? 1) + offsetMinutes * 60_000
	).toISOString();
}

/** Fin del día local como instante UTC ISO. */
export function localDayEndUtc(date: string, offsetMinutes: number): string {
	const [year, month, day] = date.slice(0, 10).split('-').map(Number);
	return new Date(
		Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + 1) + offsetMinutes * 60_000 - 1
	).toISOString();
}

/** Límites UTC ISO para un rango de fechas locales. */
export function localRangeInstants(
	range: { from: string; to: string },
	offsetMinutes: number
): { fromInstant: string; toInstant: string } {
	return {
		fromInstant: localDayStartUtc(range.from, offsetMinutes),
		toInstant: localDayEndUtc(range.to, offsetMinutes)
	};
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliza fechas puras (local) y timestamps (instante local) para mostrar. */
function asDisplayDate(value: string | Date): Date {
	if (value instanceof Date) return value;
	return DATE_ONLY.test(value) ? parseISODate(value) : new Date(value);
}

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
}

export function addDays(date: Date, amount: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + amount);
	return next;
}

export function diffInDays(from: Date, to: Date): number {
	return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function diffInMonths(from: Date, to: Date): number {
	return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Primer día del mes como `YYYY-MM-DD` (clave de periodo). */
export function monthKey(date: Date = new Date()): string {
	return toISODate(startOfMonth(date));
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: Date): Date {
	const day = date.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	return startOfDay(addDays(date, diff));
}

export function startOfQuarter(date: Date): Date {
	const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
	return new Date(date.getFullYear(), quarterStartMonth, 1);
}

export interface PeriodRange {
	from: string;
	to: string;
	label: string;
	prevFrom: string;
	prevTo: string;
	previousLabel: string;
}

function rangeFor(preset: PeriodPreset, reference: Date): { from: Date; to: Date } {
	switch (preset) {
		case 'week': {
			const from = startOfWeek(reference);
			return { from, to: addDays(from, 6) };
		}
		case 'quarter': {
			const from = startOfQuarter(reference);
			return { from, to: endOfMonth(addMonths(from, 2)) };
		}
		case 'year': {
			const from = new Date(reference.getFullYear(), 0, 1);
			return { from, to: new Date(reference.getFullYear(), 11, 31) };
		}
		default: {
			const from = startOfMonth(reference);
			return { from, to: endOfMonth(reference) };
		}
	}
}

function shortRangeLabel(from: Date, to: Date): string {
	if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
		return `${MONTHS_SHORT[from.getMonth()]} ${from.getDate()} – ${to.getDate()}`;
	}
	return `${MONTHS_SHORT[from.getMonth()]} ${from.getDate()} – ${MONTHS_SHORT[to.getMonth()]} ${to.getDate()}`;
}

/** Rango del periodo seleccionado junto con el periodo anterior equivalente. */
export function periodRange(preset: PeriodPreset, reference: Date = new Date()): PeriodRange {
	const { from, to } = rangeFor(preset, reference);
	const days = diffInDays(from, to) + 1;
	const prevTo = addDays(from, -1);
	const prevFrom = addDays(prevTo, -(days - 1));

	let label: string;
	let previousLabel: string;

	switch (preset) {
		case 'week':
			label = shortRangeLabel(from, to);
			previousLabel = shortRangeLabel(prevFrom, prevTo);
			break;
		case 'quarter':
			label = `${Math.floor(from.getMonth() / 3) + 1}º trimestre ${from.getFullYear()}`;
			previousLabel = `${Math.floor(prevFrom.getMonth() / 3) + 1}º trimestre ${prevFrom.getFullYear()}`;
			break;
		case 'year':
			label = `${from.getFullYear()}`;
			previousLabel = `${prevFrom.getFullYear()}`;
			break;
		default:
			label = `${MONTHS_SHORT[from.getMonth()]} ${from.getFullYear()}`;
			previousLabel = `${MONTHS_SHORT[prevFrom.getMonth()]} ${prevFrom.getFullYear()}`;
	}

	return {
		from: toISODate(from),
		to: toISODate(to),
		label,
		prevFrom: toISODate(prevFrom),
		prevTo: toISODate(prevTo),
		previousLabel
	};
}

/** Rango de un mes concreto a partir de su clave `YYYY-MM`. */
export function monthRange(key: string): PeriodRange {
	const [year, month] = key.split('-').map(Number);
	const base = new Date(year, (month || 1) - 1, 1);
	return periodRange('month', base);
}

/** `24 Oct` */
export function formatDayMonth(value: string | Date): string {
	const date = asDisplayDate(value);
	return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** `24 Oct 2026` */
export function formatFullDate(value: string | Date): string {
	const date = asDisplayDate(value);
	return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** `15 de noviembre de 2026` */
export function formatLongDate(value: string | Date): string {
	const date = asDisplayDate(value);
	return `${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`;
}

/** `Octubre` / `Septiembre 2026` */
export function formatMonthName(value: string | Date, withYear = false): string {
	const date = asDisplayDate(value);
	const name = MONTHS_LONG[date.getMonth()];
	const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
	return withYear ? `${capitalized} ${date.getFullYear()}` : capitalized;
}

/** `Hoy, 24 Oct` · `Ayer` · `23 Oct` */
export function formatRelativeDay(value: string | Date, now: Date = new Date()): string {
	const date = asDisplayDate(value);
	const days = diffInDays(now, date);
	if (days === 0) return `Hoy, ${formatDayMonth(date)}`;
	if (days === -1) return 'Ayer';
	if (days === 1) return `Mañana, ${formatDayMonth(date)}`;
	if (days > 1 && days < 7) return formatDayMonth(date);
	return formatDayMonth(date);
}

/** `Hoy, 09:30 AM` */
export function formatDateTime(value: string | Date, now: Date = new Date()): string {
	const date = asDisplayDate(value);
	const time = new Intl.DateTimeFormat('es-MX', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	})
		.format(date)
		.replace('\u00a0', ' ');
	return `${formatRelativeDay(date, now)}, ${time}`;
}

/** `14:35 hrs` */
export function formatTime(value: string | Date): string {
	const date = asDisplayDate(value);
	const hours = `${date.getHours()}`.padStart(2, '0');
	const minutes = `${date.getMinutes()}`.padStart(2, '0');
	return `${hours}:${minutes} hrs`;
}

export function formatInputTime(value: string | Date): string {
	const date = asDisplayDate(value);
	return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export function formatInputDate(value: string | Date): string {
	return toISODate(asDisplayDate(value));
}

/** Días restantes del mes en curso (incluyendo hoy). */
export function daysLeftInMonth(reference: Date = new Date()): number {
	return endOfMonth(reference).getDate() - reference.getDate() + 1;
}

/** Días que faltan para una fecha concreta. */
export function daysUntil(value: string | Date, from: Date = new Date()): number {
	const date = typeof value === 'string' ? parseISODate(value) : value;
	return diffInDays(from, date);
}

/** `en 7 días` · `hoy` · `hace 3 días` */
export function formatCountdown(value: string | Date, from: Date = new Date()): string {
	const days = daysUntil(value, from);
	if (days === 0) return 'hoy';
	if (days === 1) return 'mañana';
	if (days > 1) return `en ${days} días`;
	if (days === -1) return 'ayer';
	return `hace ${Math.abs(days)} días`;
}

/** Meses completos hacia adelante entre dos fechas (mínimo 1). */
export function monthsBetween(from: Date, to: Date): number {
	return Math.max(1, diffInMonths(from, to));
}
