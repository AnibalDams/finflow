import { describe, expect, it } from 'vitest';
import { formValues, readFile, readString } from './forms';

function formData(entries: Record<string, string>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) form.set(key, value);
	return form;
}

describe('readString', () => {
	it('devuelve el valor del campo', () => {
		expect(readString(formData({ name: 'Efectivo' }), 'name')).toBe('Efectivo');
	});

	it('devuelve cadena vacía cuando el campo no existe', () => {
		expect(readString(formData({}), 'name')).toBe('');
	});

	it('ignora valores que no son texto (por ejemplo archivos)', () => {
		const form = new FormData();
		form.set('file', new File([new Uint8Array([1, 2])], 'comprobante.png'));
		expect(readString(form, 'file')).toBe('');
	});
});

describe('readFile', () => {
	it('devuelve el archivo cuando tiene contenido', () => {
		const form = new FormData();
		const file = new File([new Uint8Array([1, 2])], 'comprobante.png', { type: 'image/png' });
		form.set('file', file);
		expect(readFile(form, 'file')?.name).toBe('comprobante.png');
	});

	it('devuelve null cuando el archivo está vacío o no existe', () => {
		const form = new FormData();
		form.set('empty', new File([], 'vacio.png'));
		expect(readFile(form, 'empty')).toBeNull();
		expect(readFile(form, 'missing')).toBeNull();
	});
});

describe('formValues', () => {
	it('conserva únicamente las claves indicadas', () => {
		const values = formValues(formData({ name: 'Efectivo', kind: 'cash', other: 'x' }), ['name', 'kind']);
		expect(values).toEqual({ name: 'Efectivo', kind: 'cash' });
	});
});
