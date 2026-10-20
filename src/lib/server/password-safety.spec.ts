import { describe, expect, it } from 'vitest';
import { sha1Hex } from './password-safety';

describe('sha1Hex', () => {
	it('genera el hash usado por la API k-anonymity de HIBP', async () => {
		expect(await sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
	});
});
