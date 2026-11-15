/**
 * Catálogo de paletas.
 *
 * Cada preset es **data**: semillas de marca, planes y gastos, la temperatura
 * del neutro y la superficie del hero. El motor (`derive.ts`) se encarga de
 * derivar el resto de tokens y de garantizar contraste AA en claro y oscuro.
 *
 * Los `primary` son colores legibles como texto sobre el fondo (contraste
 * ≥ 4.5:1). Las marcas cuyo color de marca no cumple esa función por sí solo
 * —Wise, por ejemplo— usan una variante legible y reservan el tono puro para
 * contenedores y estados.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type NeutralTemperature = 'cool' | 'neutral' | 'warm';

export interface PaletteSeeds {
	/** Marca e ingresos (acción principal). */
	primary: string;
	/** Planes y metas. */
	secondary: string;
	/** Gastos y deudas. */
	tertiary: string;
	/** Tono OKLCH del neutro de superficies (0–360). */
	neutralHue: number;
	/** Croma del neutro (0–0.02). Cuanto más bajo, más gris. */
	neutralChroma: number;
	/** Superficie del hero de saldo en modo claro. */
	heroLight: string;
	/** Superficie del hero de saldo en modo oscuro. */
	heroDark: string;
}

export interface PaletteDefinition {
	id: string;
	name: string;
	description: string;
	/** Ficha de `design-styles` que inspira la paleta. */
	reference: string;
	seeds: PaletteSeeds;
}

export const DEFAULT_PALETTE_ID = 'esmeralda';

export const PALETTES: PaletteDefinition[] = [
	{
		id: 'esmeralda',
		name: 'Esmeralda',
		description:
			'El equilibrio original: verde para ingresos, índigo para planes y rosa para gastos.',
		reference: 'finflow',
		seeds: {
			primary: '#006c49',
			secondary: '#4648d4',
			tertiary: '#bc0b3b',
			neutralHue: 278,
			neutralChroma: 0.008,
			heroLight: '#283044',
			heroDark: '#1b2233'
		}
	},
	{
		id: 'mercurio',
		name: 'Mercurio',
		description: 'Banca privada serena: índigo helado, superficies limpias y hero nocturno.',
		reference: 'mercury',
		seeds: {
			primary: '#5266eb',
			secondary: '#7c8ce8',
			tertiary: '#b8334f',
			neutralHue: 285,
			neutralChroma: 0.011,
			heroLight: '#171721',
			heroDark: '#121219'
		}
	},
	{
		id: 'nubank',
		name: 'Nubank',
		description: 'Banca móvil sin fricción: morado profundo sobre tarjetas blancas.',
		reference: 'nubank',
		seeds: {
			primary: '#820ad1',
			secondary: '#4d3df0',
			tertiary: '#d02b4a',
			neutralHue: 305,
			neutralChroma: 0.005,
			heroLight: '#1a1a1a',
			heroDark: '#141414'
		}
	},
	{
		id: 'wise',
		name: 'Wise Lima',
		description: 'Verde legible con acentos lima y neutros sage: cercano y directo.',
		reference: 'wise',
		seeds: {
			primary: '#1f7a3f',
			secondary: '#0f766e',
			tertiary: '#d03238',
			neutralHue: 130,
			neutralChroma: 0.007,
			heroLight: '#0e0f0c',
			heroDark: '#111310'
		}
	},
	{
		id: 'revolut',
		name: 'Revolut',
		description: 'Alto contraste: cobalto eléctrico y hero negro absoluto.',
		reference: 'revolut',
		seeds: {
			primary: '#494fdf',
			secondary: '#2bb3a3',
			tertiary: '#e0556b',
			neutralHue: 255,
			neutralChroma: 0.006,
			heroLight: '#000000',
			heroDark: '#0b0b0d'
		}
	},
	{
		id: 'cobalto',
		name: 'Cobalto',
		description: 'Confianza transaccional: azul institucional con acentos claros.',
		reference: 'paypal',
		seeds: {
			primary: '#003087',
			secondary: '#0f6cbd',
			tertiary: '#ba1a1a',
			neutralHue: 258,
			neutralChroma: 0.008,
			heroLight: '#001a4d',
			heroDark: '#0b1526'
		}
	},
	{
		id: 'grafito',
		name: 'Grafito',
		description: 'Herramienta de trabajo: neutros puros, una sola acción y bordes finos.',
		reference: 'linear-app',
		seeds: {
			primary: '#1f2937',
			secondary: '#4f46e5',
			tertiary: '#b42318',
			neutralHue: 260,
			neutralChroma: 0.003,
			heroLight: '#0b1220',
			heroDark: '#0d1117'
		}
	},
	{
		id: 'terracota',
		name: 'Terracota',
		description: 'Cálido y humano: teal sereno, neutros de papel y hero de madera.',
		reference: 'hospitality-warm',
		seeds: {
			primary: '#0f766e',
			secondary: '#a16207',
			tertiary: '#b91c1c',
			neutralHue: 70,
			neutralChroma: 0.009,
			heroLight: '#2b1d16',
			heroDark: '#1d1512'
		}
	}
];

export function findPalette(id: string): PaletteDefinition | null {
	return PALETTES.find((palette) => palette.id === id) ?? null;
}

export function paletteIds(): string[] {
	return PALETTES.map((palette) => palette.id);
}

/** Temperatura del neutro que elige el usuario en una paleta personalizada. */
export const NEUTRAL_TEMPERATURES: Record<NeutralTemperature, { hue: number; chroma: number }> = {
	cool: { hue: 265, chroma: 0.01 },
	neutral: { hue: 0, chroma: 0.002 },
	warm: { hue: 70, chroma: 0.01 }
};
