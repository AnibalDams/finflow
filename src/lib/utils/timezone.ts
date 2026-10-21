/** Cookie con los minutos por detrás de UTC de la zona del usuario. */

export const TIMEZONE_COOKIE = 'tz_offset';

/** Offset actual del navegador (`getTimezoneOffset`). */
export function currentTimezoneOffset(): number {
	return new Date().getTimezoneOffset();
}

/** Escribe la cookie en el cliente; se refresca en cada carga por el DST. */
export function setTimezoneCookie(offset: number = currentTimezoneOffset()): void {
	if (typeof document === 'undefined') return;

	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${TIMEZONE_COOKIE}=${offset}; path=/; max-age=31536000; SameSite=Lax${secure}`;
}
