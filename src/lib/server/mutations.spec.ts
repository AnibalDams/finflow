import { describe, expect, it } from 'vitest';
import { validateImage, validateReceipt } from './mutations';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const pdf = new TextEncoder().encode('%PDF-1.7\nresto del documento');
const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');

function file(bytes: Uint8Array, name: string, type: string): File {
	const copy = new Uint8Array(bytes);
	return new File([copy.buffer as ArrayBuffer], name, { type });
}

describe('validateReceipt', () => {
	it('acepta imágenes y PDF con firma correcta', async () => {
		expect(await validateReceipt(file(png, 'ticket.png', 'image/png'))).toBeNull();
		expect(await validateReceipt(file(jpeg, 'ticket.jpg', 'image/jpeg'))).toBeNull();
		expect(await validateReceipt(file(pdf, 'ticket.pdf', 'application/pdf'))).toBeNull();
	});

	it('rechaza contenido que no coincide con el MIME declarado', async () => {
		expect(await validateReceipt(file(html, 'ticket.png', 'image/png'))).toBe(
			'El contenido del comprobante no coincide con su tipo de archivo.'
		);
		expect(await validateReceipt(file(png, 'ticket.svg', 'image/svg+xml'))).toBe(
			'El comprobante debe ser PNG, JPG, WEBP o PDF.'
		);
	});
});

describe('validateImage', () => {
	it('acepta PNG/JPEG y rechaza HTML disfrazado', async () => {
		expect(await validateImage(file(png, 'plan.png', 'image/png'))).toBeNull();
		expect(await validateImage(file(jpeg, 'plan.jpg', 'image/jpeg'))).toBeNull();
		expect(await validateImage(file(html, 'plan.png', 'image/png'))).toBe(
			'El contenido de la imagen no coincide con su tipo de archivo.'
		);
	});
});
