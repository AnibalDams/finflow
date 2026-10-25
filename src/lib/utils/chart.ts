/**
 * Geometría pura para los gráficos SVG de la app.
 *
 * Vive fuera de los componentes para poder probarla con Vitest: ninguna de
 * estas funciones toca el DOM ni conoce el framework.
 */

export interface ChartPoint {
	x: number;
	y: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Limita `value` al rango cerrado [min, max]. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Redondea `value` hacia arriba a un máximo legible para el eje Y.
 *
 * Divide el eje en `intervals` tramos con pasos de 1, 1.5, 2, 2.5, 3, 4, 5
 * o 10 por década, de modo que las etiquetas del eje no muestren cifras
 * arbitrarias.
 */
export function niceCeiling(value: number, intervals = 4): number {
	if (!Number.isFinite(value) || value <= 0) return 1;

	const rough = value / intervals;
	const magnitude = 10 ** Math.floor(Math.log10(rough));
	const normalized = rough / magnitude;
	const step =
		normalized <= 1
			? 1
			: normalized <= 1.5
				? 1.5
				: normalized <= 2
					? 2
					: normalized <= 2.5
						? 2.5
						: normalized <= 3
							? 3
							: normalized <= 4
								? 4
								: normalized <= 5
									? 5
									: 10;

	return step * magnitude * intervals;
}

/**
 * Índice del punto más cercano a `x` dentro de un eje con `count` puntos
 * distribuidos entre `startX` y `endX`.
 */
export function nearestIndex(x: number, startX: number, endX: number, count: number): number {
	if (count <= 1) return 0;

	const span = endX - startX;
	if (!Number.isFinite(span) || span <= 0) return 0;

	const ratio = clamp((x - startX) / span, 0, 1);
	return Math.round(ratio * (count - 1));
}

/**
 * Curva bezier monótona (Fritsch–Carlson) que pasa por todos los puntos sin
 * sobrepasar los valores reales de la serie.
 */
export function monotonePath(points: ChartPoint[]): string {
	if (points.length === 0) return '';

	const first = points[0];
	if (points.length === 1) return `M ${round(first.x)} ${round(first.y)}`;

	const slopes: number[] = [];
	for (let index = 0; index < points.length - 1; index += 1) {
		const current = points[index];
		const next = points[index + 1];
		const dx = next.x - current.x;
		slopes.push(dx === 0 ? 0 : (next.y - current.y) / dx);
	}

	const tangents: number[] = new Array<number>(points.length);
	tangents[0] = slopes[0];
	tangents[points.length - 1] = slopes[slopes.length - 1];

	for (let index = 1; index < points.length - 1; index += 1) {
		const previous = slopes[index - 1];
		const next = slopes[index];
		// Un cambio de signo indica un extremo local: la tangente se aplana
		// para no generar sobreoscilación.
		tangents[index] = previous * next <= 0 ? 0 : (previous + next) / 2;
	}

	for (let index = 0; index < slopes.length; index += 1) {
		const slope = slopes[index];
		if (slope === 0) {
			tangents[index] = 0;
			tangents[index + 1] = 0;
			continue;
		}

		const alpha = tangents[index] / slope;
		const beta = tangents[index + 1] / slope;
		const magnitude = Math.hypot(alpha, beta);
		if (magnitude > 3) {
			tangents[index] = (3 * alpha * slope) / magnitude;
			tangents[index + 1] = (3 * beta * slope) / magnitude;
		}
	}

	let path = `M ${round(first.x)} ${round(first.y)}`;
	for (let index = 0; index < points.length - 1; index += 1) {
		const current = points[index];
		const next = points[index + 1];
		const dx = (next.x - current.x) / 3;
		path +=
			` C ${round(current.x + dx)} ${round(current.y + tangents[index] * dx)},` +
			` ${round(next.x - dx)} ${round(next.y - tangents[index + 1] * dx)},` +
			` ${round(next.x)} ${round(next.y)}`;
	}

	return path;
}

/** Cierra una línea con una base plana para rellenarla como área. */
export function areaPath(points: ChartPoint[], line: string, baseline: number): string {
	if (points.length < 2 || line === '') return '';

	const first = points[0];
	const last = points[points.length - 1];
	return `${line} L ${round(last.x)} ${round(baseline)} L ${round(first.x)} ${round(baseline)} Z`;
}
