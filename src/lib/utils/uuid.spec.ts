import { describe, expect, it } from 'vitest';
import { isUuid, parseUuid } from './uuid';

describe('isUuid', () => {
	it('acepta UUIDs válidos y rechaza valores inyectables', () => {
		expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
		expect(isUuid('11111111-1111-4111-8111-11111111111')).toBe(false);
		expect(isUuid('x,account_id.not.is.null')).toBe(false);
		expect(isUuid(null)).toBe(false);
		expect(isUuid(123)).toBe(false);
	});
});

describe('parseUuid', () => {
	it('devuelve el UUID o undefined', () => {
		expect(parseUuid('11111111-1111-4111-8111-111111111111')).toBe(
			'11111111-1111-4111-8111-111111111111'
		);
		expect(parseUuid('no-es-uuid')).toBeUndefined();
		expect(parseUuid(null)).toBeUndefined();
	});
});
