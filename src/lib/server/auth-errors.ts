/**
 * Traducción de los mensajes de error de Supabase Auth al español.
 * Nunca se muestran los mensajes crudos del proveedor al usuario final.
 */

const MESSAGES: Array<{ match: RegExp; message: string }> = [
	{ match: /invalid login credentials/i, message: 'Correo o contraseña incorrectos.' },
	{ match: /email not confirmed/i, message: 'Confirma tu correo antes de iniciar sesión.' },
	{ match: /user already registered/i, message: 'Ese correo ya tiene una cuenta registrada.' },
	{ match: /password should be at least/i, message: 'La contraseña es demasiado corta.' },
	{ match: /rate limit|too many requests/i, message: 'Demasiados intentos. Espera un momento.' },
	{ match: /unable to validate email/i, message: 'El correo no es válido.' },
	{ match: /different from the old password/i, message: 'La nueva contraseña debe ser diferente.' },
	{ match: /for security purposes/i, message: 'Espera unos segundos antes de reintentar.' },
	{ match: /auth session missing/i, message: 'Tu sesión expiró. Vuelve a iniciar sesión.' },
	{ match: /signups not allowed|signup is disabled/i, message: 'El registro está deshabilitado.' }
];

export function translateAuthError(message: string | undefined): string {
	if (!message) return 'No pudimos completar la operación. Inténtalo de nuevo.';
	for (const entry of MESSAGES) {
		if (entry.match.test(message)) return entry.message;
	}
	return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

function hasControlCharacters(value: string): boolean {
	for (const char of value) {
		const code = char.charCodeAt(0);
		if (code < 32 || code === 127) return true;
	}
	return false;
}

/** Solo se permiten rutas internas: evita redirecciones abiertas. */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
	if (!target) return fallback;
	const value = target.trim();
	if (
		!value.startsWith('/') ||
		value.startsWith('//') ||
		value.includes('\\') ||
		/%5c/i.test(value) ||
		hasControlCharacters(value)
	) {
		return fallback;
	}
	return value;
}
