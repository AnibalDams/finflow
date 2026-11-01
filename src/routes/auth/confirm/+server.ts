import { redirect, type Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { CRON_SECRET, RECOVERY_COOKIE_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$app/env/private';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeRedirect } from '#lib/server/auth-errors';
import {
	RECOVERY_COOKIE,
	RECOVERY_COOKIE_MAX_AGE,
	createRecoveryToken,
	recoveryKey
} from '#lib/server/recovery';
import type { RequestHandler } from './$types';

const OTP_TYPES: EmailOtpType[] = [
	'signup',
	'invite',
	'magiclink',
	'recovery',
	'email_change',
	'email'
];

const RECOVERY_KEY = recoveryKey(
	RECOVERY_COOKIE_SECRET || SUPABASE_SERVICE_ROLE_KEY || CRON_SECRET
);

/** Solo un enlace de recuperación habilita el cambio de contraseña sin la actual. */
function grantRecovery(cookies: Cookies, userId: string): void {
	cookies.set(RECOVERY_COOKIE, createRecoveryToken(RECOVERY_KEY, userId), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'strict',
		maxAge: RECOVERY_COOKIE_MAX_AGE
	});
}

/**
 * Punto de retorno de los enlaces de correo (confirmación de cuenta y
 * recuperación de contraseña). Intercambia el código por una sesión y
 * redirige al destino solicitado.
 *
 * En los flujos de recuperación deja además una marca de corta vida: es la
 * prueba de que se llegó por el correo y no por una sesión cualquiera.
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const next = safeRedirect(url.searchParams.get('next'));
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	const isRecovery = next === '/restablecer' || type === 'recovery';

	if (code) {
		const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			if (isRecovery && data.user) grantRecovery(cookies, data.user.id);
			redirect(303, next);
		}
	} else if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
		const { data, error } = await locals.supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: type as EmailOtpType
		});
		if (!error) {
			if (isRecovery && data.user) grantRecovery(cookies, data.user.id);
			redirect(303, next);
		}
	}

	redirect(303, '/login?error=confirm');
};
