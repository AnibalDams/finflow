import { describe, expect, test } from 'vitest';
import {
	SPRITES,
	spriteDimensions,
	spriteFrameCount,
	spriteSheet,
	type SpriteName
} from './sprites';

const NAMES = Object.keys(SPRITES) as SpriteName[];

describe('pixel art', () => {
	for (const name of NAMES) {
		test(`${name} tiene filas parejas y solo colores de su paleta`, () => {
			const sprite = SPRITES[name];
			const palette = sprite.palette as Record<string, string>;
			const { width, height } = spriteDimensions(name);

			expect(width).toBeGreaterThan(0);
			expect(height).toBeGreaterThan(0);
			expect(sprite.frames.length).toBeGreaterThan(0);

			for (const frame of sprite.frames) {
				expect(frame).toHaveLength(height);
				for (const row of frame) {
					expect(row).toHaveLength(width);
					for (const key of row) {
						if (key === '.') continue;
						expect(palette[key], `color «${key}» en ${name}`).toBeTruthy();
					}
				}
			}
		});
	}
});

describe('spriteSheet', () => {
	test('genera un data URI SVG con todos los fotogramas', () => {
		const uri = spriteSheet('tree');
		expect(uri.startsWith('data:image/svg+xml,')).toBe(true);

		const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
		expect(svg).toContain('<svg');
		expect(svg).toContain('shape-rendering="crispEdges"');

		const { width } = spriteDimensions('tree');
		expect(spriteFrameCount('tree')).toBe(2);
		expect(svg).toContain(`viewBox="0 0 ${width * 2} ${spriteDimensions('tree').height}"`);
	});

	test('memoriza el resultado', () => {
		expect(spriteSheet('santa')).toBe(spriteSheet('santa'));
	});
});
