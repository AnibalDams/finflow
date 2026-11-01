import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, peekRateLimit, resetRateLimit, resetRateLimits } from './rate-limit';

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));
		resetRateLimits();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRateLimits();
	});

	it('permite hasta el límite y luego bloquea con retryAfter', () => {
		expect(checkRateLimit('login:1.2.3.4', 2, 60_000)).toEqual({
			allowed: true,
			retryAfter: 0
		});
		expect(checkRateLimit('login:1.2.3.4', 2, 60_000).allowed).toBe(true);

		const blocked = checkRateLimit('login:1.2.3.4', 2, 60_000);
		expect(blocked.allowed).toBe(false);
		expect(blocked.retryAfter).toBe(60);
	});

	it('usa claves independientes y reinicia al vencer la ventana', () => {
		expect(checkRateLimit('login:a', 1, 1_000).allowed).toBe(true);
		expect(checkRateLimit('login:a', 1, 1_000).allowed).toBe(false);
		expect(checkRateLimit('login:b', 1, 1_000).allowed).toBe(true);

		vi.advanceTimersByTime(1_001);
		expect(checkRateLimit('login:a', 1, 1_000).allowed).toBe(true);
	});

	it('peekRateLimit consulta el estado sin consumir intentos', () => {
		checkRateLimit('login-account:a', 2, 60_000);
		expect(peekRateLimit('login-account:a', 2).allowed).toBe(true);
		expect(peekRateLimit('login-account:a', 2).allowed).toBe(true);

		checkRateLimit('login-account:a', 2, 60_000);
		expect(peekRateLimit('login-account:a', 2)).toEqual({ allowed: false, retryAfter: 60 });

		vi.advanceTimersByTime(60_001);
		expect(peekRateLimit('login-account:a', 2).allowed).toBe(true);
	});

	it('resetRateLimit libera la clave tras un acceso correcto', () => {
		checkRateLimit('login-account:b', 1, 60_000);
		expect(peekRateLimit('login-account:b', 1).allowed).toBe(false);

		resetRateLimit('login-account:b');
		expect(peekRateLimit('login-account:b', 1).allowed).toBe(true);
	});
});
