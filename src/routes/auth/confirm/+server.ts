import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeRedirect } from '#lib/server/auth-errors';
import type { RequestHandler } from './$types';

const OTP_TYPES: EmailOtpType[] = [
	'signup',
	'invite',
	'magiclink',
	'recovery',
	'email_change',
	'email'
];

/**
 * Punto de retorno de los enlaces de correo (confirmación de cuenta y
 * recuperación de contraseña). Intercambia el código por una sesión y
 * redirige al destino solicitado.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const next = safeRedirect(url.searchParams.get('next'));
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, next);
	} else if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
		const { error } = await locals.supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: type as EmailOtpType
		});
		if (!error) redirect(303, next);
	}

	redirect(303, '/login?error=confirm');
};
