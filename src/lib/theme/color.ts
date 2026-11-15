/**
 * Utilidades de color para el sistema de temas.
 *
 * Todo se resuelve en OKLCH para que las paletas conserven el tono al cambiar
 * de luminosidad, y se valida en sRGB porque el producto final es CSS. No se
 * usa ninguna dependencia externa: las conversiones son las oficiales de
 * Björn Ottosson para OKLab.
 */

export interface Oklch {
	/** Luminosidad perceptual 0–1. */
	l: number;
	/** Croma 0–~0.37. */
	c: number;
	/** Tono en grados 0–360. */
	h: number;
}

const WHITE = '#ffffff';
/** Tinta oscura de referencia para superficies claras. */
const DARK_INK = '#0f172a';

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

/** Acepta `#abc` o `#aabbcc` (con o sin `#`) y devuelve `#aabbcc` en minúsculas. */
export function normalizeHex(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (!match) return null;
	const digits = match[1].toLowerCase();
	const full =
		digits.length === 3
			? digits
					.split('')
					.map((digit) => digit + digit)
					.join('')
			: digits;
	return `#${full}`;
}

interface Rgb {
	r: number;
	g: number;
	b: number;
}

function hexToRgb(hex: string): Rgb {
	const value = normalizeHex(hex) ?? WHITE;
	return {
		r: Number.parseInt(value.slice(1, 3), 16) / 255,
		g: Number.parseInt(value.slice(3, 5), 16) / 255,
		b: Number.parseInt(value.slice(5, 7), 16) / 255
	};
}

function rgbToHex(rgb: Rgb): string {
	const channel = (value: number): string =>
		Math.round(clamp01(value) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function toLinear(value: number): number {
	return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function fromLinear(value: number): number {
	return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function rgbToOklab(rgb: Rgb): { L: number; a: number; b: number } {
	const r = toLinear(rgb.r);
	const g = toLinear(rgb.g);
	const b = toLinear(rgb.b);

	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

	return {
		L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	};
}

function oklabToLinearRgb(L: number, a: number, b: number): Rgb {
	const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
	const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
	const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);

	return {
		r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	};
}

/** Convierte un hex a OKLCH (tono en grados, croma sin límite de gamut). */
export function hexToOklch(hex: string): Oklch {
	const { L, a, b } = rgbToOklab(hexToRgb(hex));
	const chroma = Math.sqrt(a * a + b * b);
	const hue = (Math.atan2(b, a) * 180) / Math.PI;
	return { l: L, c: chroma, h: (hue + 360) % 360 };
}

/**
 * Convierte OKLCH a hex. Si el color cae fuera de sRGB se reduce el croma hasta
 * que entre, que es la corrección de gamut recomendada para mantener el tono.
 */
export function oklchToHex(color: Oklch): string {
	const l = clamp01(color.l);
	const hue = ((color.h % 360) + 360) % 360;
	let chroma = Math.max(0, color.c);

	for (let attempt = 0; attempt < 28; attempt += 1) {
		const rgb = oklabToLinearRgb(
			l,
			chroma * Math.cos((hue * Math.PI) / 180),
			chroma * Math.sin((hue * Math.PI) / 180)
		);
		const inGamut =
			rgb.r >= -0.0005 &&
			rgb.r <= 1.0005 &&
			rgb.g >= -0.0005 &&
			rgb.g <= 1.0005 &&
			rgb.b >= -0.0005 &&
			rgb.b <= 1.0005;
		if (inGamut) {
			return rgbToHex({
				r: fromLinear(clamp01(rgb.r)),
				g: fromLinear(clamp01(rgb.g)),
				b: fromLinear(clamp01(rgb.b))
			});
		}
		chroma *= 0.92;
	}

	return rgbToHex({
		r: fromLinear(clamp01(oklabToLinearRgb(l, 0, 0).r)),
		g: fromLinear(clamp01(oklabToLinearRgb(l, 0, 0).g)),
		b: fromLinear(clamp01(oklabToLinearRgb(l, 0, 0).b))
	});
}

/** Atajo: construye un hex a partir de coordenadas OKLCH. */
export function oklch(l: number, c: number, h: number): string {
	return oklchToHex({ l, c, h });
}

/** Luminancia relativa WCAG 2.2. */
export function relativeLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Ratio de contraste WCAG entre dos colores (1–21). */
export function contrastRatio(a: string, b: string): number {
	const first = relativeLuminance(a);
	const second = relativeLuminance(b);
	const lighter = Math.max(first, second);
	const darker = Math.min(first, second);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Mezcla dos colores en OKLab (perceptual, sin bordes sucios). */
export function mixColors(from: string, to: string, amount: number): string {
	const a = hexToOklch(from);
	const b = hexToOklch(to);
	const t = clamp01(amount);
	// Interpolación de tono por el arco corto.
	let delta = ((b.h - a.h + 540) % 360) - 180;
	if (Math.abs(delta) === 180) delta = 0;
	return oklchToHex({
		l: a.l + (b.l - a.l) * t,
		c: a.c + (b.c - a.c) * t,
		h: a.h + delta * t
	});
}

/** `rgb(r g b / a)` para usar como color con transparencia. */
export function withAlpha(hex: string, alpha: number): string {
	const { r, g, b } = hexToRgb(hex);
	const value = Math.round(clamp01(alpha) * 1000) / 1000;
	return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${value})`;
}

/** Blanco o tinta oscura, el que mejor contraste tenga sobre `background`. */
export function bestOn(background: string): string {
	return contrastRatio(background, WHITE) >= contrastRatio(background, DARK_INK) ? WHITE : DARK_INK;
}

/**
 * Mueve la luminosidad (sin tocar tono ni croma) hasta que el color alcance el
 * contraste pedido contra `background`. Devuelve el mismo color si ya cumple.
 */
export function ensureContrast(color: Oklch, background: string, target: number): Oklch {
	if (contrastRatio(oklchToHex(color), background) >= target) return color;

	const backgroundLightness = hexToOklch(background).l;
	const step = backgroundLightness > 0.5 ? -0.012 : 0.012;

	for (let index = 1; index <= 90; index += 1) {
		const candidate = { ...color, l: clamp01(color.l + step * index) };
		if (contrastRatio(oklchToHex(candidate), background) >= target) return candidate;
	}

	// Sin margen en el tono: se resuelve con el extremo opuesto del eje.
	return { l: backgroundLightness > 0.5 ? 0 : 1, c: 0, h: color.h };
}

/** Aclara u oscurece conservando el tono. */
export function lighten(hex: string, amount: number): string {
	const color = hexToOklch(hex);
	return oklch(clamp01(color.l + amount), color.c, color.h);
}

/** Verifica si un color es seguro como texto sobre otro (AA, texto normal). */
export function isReadable(foreground: string, background: string, target = 4.5): boolean {
	return contrastRatio(foreground, background) >= target;
}
