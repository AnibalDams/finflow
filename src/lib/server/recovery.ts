/**
 * Marca de recuperación de contraseña.
 *
 * El enlace mágico demuestra posesión del correo; esta cookie impide que una
 * sesión normal (robada o de un equipo desatendido) fije una contraseña nueva
 * sin pasar por ese enlace. El token es un valor firmado con HMAC que caduca a
 * los 10 minutos y está ligado al `user.id`.
 *
 * El módulo es puro (no lee variables de entorno) para poder probarlo: quien lo
 * consume deriva la clave con `recoveryKey()`.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const RECOVERY_COOKIE = 'finflow_recovery';
export const RECOVERY_COOKIE_MAX_AGE = 600;
export const RECOVERY_TTL_MS = RECOVERY_COOKIE_MAX_AGE * 1000;

const VERSION = 'v1';
const PARTS = 4;

/** Clave estable por proceso cuando no hay secreto configurado (falla cerrado). */
let fallbackKey: Buffer | null = null;

function fallback(): Buffer {
	fallbackKey ??= randomBytes(32);
	return fallbackKey;
}

/**
 * Deriva la clave de firma a partir del secreto disponible. La etiqueta evita
 * reutilizar el material original y mantiene separación de dominios.
 */
export function recoveryKey(material: string): Buffer {
	if (!material) return fallback();
	return createHmac('sha256', material).update('finflow:recovery:v1').digest();
}

function sign(key: Buffer, payload: string): Buffer {
	return createHmac('sha256', key).update(payload).digest();
}

export function createRecoveryToken(key: Buffer, userId: string, now = Date.now()): string {
	const expires = String(now + RECOVERY_TTL_MS);
	const payload = `${VERSION}.${userId}.${expires}`;
	return `${payload}.${sign(key, payload).toString('base64url')}`;
}

export function verifyRecoveryToken(
	key: Buffer,
	token: string | null | undefined,
	userId: string,
	now = Date.now()
): boolean {
	if (!token) return false;

	const parts = token.split('.');
	if (parts.length !== PARTS || parts[0] !== VERSION || parts[1] !== userId) return false;

	const expires = Number(parts[2]);
	if (!Number.isFinite(expires) || expires <= now) return false;

	const expected = sign(key, `${VERSION}.${userId}.${parts[2]}`);
	const provided = Buffer.from(parts[3] ?? '', 'base64url');
	if (provided.length !== expected.length) return false;

	return timingSafeEqual(provided, expected);
}
