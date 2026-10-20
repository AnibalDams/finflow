/**
 * Genera los iconos de la PWA a partir del logo del navbar:
 * cuadrado verde (#006c49) con el glifo blanco `account_balance_wallet`
 * (Material Symbols, relleno) y esquinas redondeadas.
 *
 * Uso: npm run icons
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PRIMARY = '#006c49';
const ON_PRIMARY = '#ffffff';

// Glifo `account_balance_wallet` relleno (Material Symbols, viewBox 0 -960 960 960).
// Su caja real ocupa x: 120..840 e y: -840..-120 (720 × 720).
const WALLET_PATH =
	'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760H520q-71 0-115.5 44.5T360-600v240q0 71 44.5 115.5T520-200h320q0 33-23.5 56.5T760-120H200Zm320-160q-33 0-56.5-23.5T440-360v-240q0-33 23.5-56.5T520-680h280q33 0 56.5 23.5T880-600v240q0 33-23.5 56.5T800-280H520Zm163-157q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Z';

/** SVG del icono. `radius: 0` deja el fondo a sangre para maskable/Apple. */
function iconSvg({ size, radius, glyph }) {
	const scale = glyph / 720;
	const offset = (size - glyph) / 2;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<rect width="${size}" height="${size}" rx="${radius}" fill="${PRIMARY}"/>
	<g transform="translate(${offset} ${offset}) scale(${scale}) translate(-120 840)">
		<path fill="${ON_PRIMARY}" d="${WALLET_PATH}"/>
	</g>
</svg>`;
}

const ICONS = [
	{ file: 'static/icons/icon-192.png', size: 192, radius: 42, glyph: 108, transparent: true },
	{ file: 'static/icons/icon-512.png', size: 512, radius: 112, glyph: 288, transparent: true },
	{
		file: 'static/icons/icon-maskable-512.png',
		size: 512,
		radius: 0,
		glyph: 240,
		transparent: false
	},
	{
		file: 'static/icons/apple-touch-icon.png',
		size: 180,
		radius: 0,
		glyph: 100,
		transparent: false
	},
	{ file: 'static/favicon-32.png', size: 32, radius: 7, glyph: 18, transparent: true }
];

const browser = await chromium.launch();

for (const icon of ICONS) {
	const page = await browser.newPage({
		viewport: { width: icon.size, height: icon.size },
		deviceScaleFactor: 1
	});

	await page.setContent(`<!doctype html>
		<html><head><style>
			html, body { margin: 0; padding: 0; background: transparent; }
			svg { display: block; width: 100%; height: 100%; }
		</style></head><body>${iconSvg(icon)}</body></html>`);

	await mkdir(join('static', 'icons'), { recursive: true });
	await page.screenshot({ path: icon.file, omitBackground: icon.transparent });
	await page.close();
	console.log(`✓ ${icon.file}`);
}

// Fuente vectorial para favicon y futuras variantes.
await writeFile('static/favicon.svg', iconSvg({ size: 512, radius: 112, glyph: 288 }), 'utf8');
console.log('✓ static/favicon.svg');

await browser.close();
