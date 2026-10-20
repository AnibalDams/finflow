/**
 * Comprobación de contraseñas filtradas contra Have I Been Pwned.
 *
 * Se usa k-anonymity: solo se envía el prefijo de 5 caracteres del SHA-1.
 * Si la API no responde a tiempo, se permite la operación (fail-open) para no
 * bloquear el registro o el restablecimiento por una dependencia externa.
 */

const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range/';
const HIBP_TIMEOUT_MS = 1_500;

export async function sha1Hex(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-1', bytes);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();
}

export async function isPasswordBreached(password: string): Promise<boolean> {
	const hash = await sha1Hex(password);
	const prefix = hash.slice(0, 5);
	const suffix = hash.slice(5);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

	try {
		const response = await fetch(`${HIBP_ENDPOINT}${prefix}`, {
			headers: { 'Add-Padding': 'true' },
			signal: controller.signal
		});

		if (!response.ok) return false;

		const body = await response.text();
		return body.split('\n').some((line) => line.split(':')[0]?.trim().toUpperCase() === suffix);
	} catch {
		// Red no disponible o timeout: no se bloquea al usuario.
		return false;
	} finally {
		clearTimeout(timer);
	}
}
