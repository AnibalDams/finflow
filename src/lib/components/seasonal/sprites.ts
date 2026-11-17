/**
 * Pixel art de las temporadas, generado como SVG en línea.
 *
 * Cada sprite es una rejilla de caracteres con una paleta. El SVG se sirve como
 * `data:` URI (CSP permite `img-src data:`) y se pinta con `image-rendering:
 * pixelated`, así no hay coste de DOM ni descargas externas.
 *
 * Reglas al editar: todas las filas de un sprite miden lo mismo y usan solo
 * claves de su paleta. `sprites.spec.ts` lo verifica.
 */

interface SpriteDefinition {
	palette: Record<string, string>;
	frames: string[][];
}

export const SPRITES = {
	santa: {
		palette: {
			r: '#d62828',
			d: '#9d1e1e',
			w: '#f7f3ee',
			s: '#f2c7a1',
			k: '#241a15'
		},
		frames: [
			[
				'................',
				'.........www....',
				'.......wwrrrww..',
				'......wrrrrrrrw.',
				'.....wrrrrrrrrrw',
				'....wwwwwwwwwwww',
				'....ssssssssssss',
				'...sssssssssssss',
				'...sskksssskksss',
				'...sskksssskksss',
				'...sssssrrssssss',
				'...sswwwwwwwwsss',
				'..wwwwwwwwwwwwww',
				'..wwwwwwwwwwwwww',
				'...wwwwwwwwwwww.',
				'....wwwwwwwwww..'
			]
		]
	},

	tree: (() => {
		const base = [
			'.......yy.......',
			'......yyyy......',
			'.......gg.......',
			'......gggg......',
			'.....gggggg.....',
			'....gglggggg....',
			'...ggggggggg....',
			'..ggggrgggggg...',
			'.ggggggggggggg..',
			'gggggglgggggggg.',
			'..gggggggggggg..',
			'..ggggggrggggg..',
			'.gggggggggggggg.',
			'ggggglggggggggg.',
			'.gggggggggggggg.',
			'..gggggggggggg..',
			'.......bb.......',
			'.......bb.......',
			'.......bb.......',
			'......bbbb......'
		];
		return {
			palette: {
				g: '#1f7a3f',
				G: '#14532d',
				y: '#f4c95d',
				b: '#7b4a2d',
				l: '#ffd166',
				r: '#e63946'
			},
			frames: [base, base.map((row) => row.replaceAll('l', 'y').replaceAll('r', 'l'))]
		};
	})(),

	gift: {
		palette: { r: '#d62828', d: '#a4161a', y: '#f4c95d', w: '#fff5e1' },
		frames: [
			[
				'............',
				'....yyyy....',
				'...y.ww.y...',
				'..rrrrrrrr..',
				'.rrrrrrrrrr.',
				'.rrryyyyrrr.',
				'.rrryyyyrrr.',
				'.rrryyyyrrr.',
				'.rrryyyyrrr.',
				'.dddddddddd.',
				'.dddddddddd.',
				'............'
			]
		]
	},

	boot: {
		palette: { r: '#d62828', d: '#9d1e1e', w: '#f7f3ee' },
		frames: [
			[
				'......ww....',
				'.....wwww...',
				'....rrrrr...',
				'....rrrrr...',
				'....rrrrr...',
				'....rrrrr...',
				'....rrrrd...',
				'....rrrrd...',
				'....rrrrd...',
				'...rrrrrd...',
				'..rrrrrrd...',
				'.rrrrrrrrd..',
				'.rrrrrrrrd..',
				'..dddddddd..'
			]
		]
	},

	snowman: {
		palette: { w: '#f7f3ee', k: '#241a15', o: '#f28c28', g: '#1f7a3f', r: '#d62828' },
		frames: [
			[
				'.....rr.......',
				'....rrrr......',
				'.....rr.......',
				'....wwwwww....',
				'...wwwwwwww...',
				'...wwkwwkww...',
				'...wwwwwwww...',
				'....wwwoow....',
				'....gggggg....',
				'...gggggggg...',
				'....wwwwww....',
				'...wwwwwwww...',
				'..wwwwwwwwww..',
				'..wwkwwwwkww..',
				'..wwwwwwwwww..',
				'...wwwwwwww...'
			]
		]
	},

	bell: {
		palette: { y: '#f4c95d', d: '#b8860b' },
		frames: [
			[
				'....yyyy....',
				'...yyyyyy...',
				'..yyyyyyyy..',
				'..yyyyyyyy..',
				'..yyyyyyyy..',
				'.yyyyyyyyyy.',
				'.yyyyyyyyyy.',
				'.yyyyyyyyyy.',
				'.yyyyyyyyyy.',
				'..yyyyyyyy..',
				'....yyyy....',
				'.....dd.....'
			]
		]
	},

	hat: {
		palette: { r: '#d62828', w: '#f7f3ee' },
		frames: [
			[
				'.........ww.',
				'........ww..',
				'.......rr...',
				'.....rrrr...',
				'...rrrrrr...',
				'.rrrrrrrr...',
				'wwwwwwwwww..',
				'..wwwwww....',
				'............',
				'............',
				'............',
				'............'
			]
		]
	},

	star: {
		palette: { y: '#f4c95d' },
		frames: [
			[
				'.....yy.....',
				'....yyyy....',
				'....yyyy....',
				'yyyyyyyyyyyy',
				'.yyyyyyyyyy.',
				'..yyyyyyyy..',
				'...yyyyyy...',
				'...yyyyyy...',
				'..yyyyyyyy..',
				'..yy....yy..',
				'.y........y.',
				'............'
			]
		]
	},

	ornament: {
		palette: { y: '#f4c95d', r: '#d62828', w: '#fff5e1' },
		frames: [
			[
				'...yy.....',
				'...yy.....',
				'..rrrr....',
				'.rrrrrr...',
				'rrrwrrrr..',
				'rrrrrrrr..',
				'rrrrrrrr..',
				'rrrrrrrr..',
				'.rrrrrr...',
				'..rrrr....',
				'..........',
				'..........'
			]
		]
	}
} satisfies Record<string, SpriteDefinition>;

export type SpriteName = keyof typeof SPRITES;

const cache = new Map<SpriteName, string>();

/** Ancho y alto en píxeles lógicos del sprite. */
export function spriteDimensions(name: SpriteName): { width: number; height: number } {
	const frames = SPRITES[name].frames;
	return { width: frames[0][0].length, height: frames[0].length };
}

export function spriteFrameCount(name: SpriteName): number {
	return SPRITES[name].frames.length;
}

function frameToRects(rows: string[], palette: Record<string, string>, offsetX: number): string {
	let out = '';

	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const color = palette[row[x]];
			if (!color) {
				x += 1;
				continue;
			}

			let run = 1;
			while (x + run < row.length && row[x + run] === row[x]) run += 1;

			out += `<rect x="${offsetX + x}" y="${y}" width="${run}" height="1" fill="${color}"/>`;
			x += run;
		}
	});

	return out;
}

/**
 * SVG con todos los fotogramas en horizontal, como `data:` URI lista para
 * `background-image`. Se calcula una sola vez por sprite.
 */
export function spriteSheet(name: SpriteName): string {
	const cached = cache.get(name);
	if (cached) return cached;

	const sprite = SPRITES[name];
	const { width, height } = spriteDimensions(name);
	const total = width * sprite.frames.length;

	const rects = sprite.frames
		.map((rows, index) => frameToRects(rows, sprite.palette, index * width))
		.join('');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" shape-rendering="crispEdges">${rects}</svg>`;
	const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;

	cache.set(name, uri);
	return uri;
}
