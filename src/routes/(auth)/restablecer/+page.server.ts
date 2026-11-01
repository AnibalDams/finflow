import { fail, redirect } from '@sveltejs/kit';
import { CRON_SECRET, RECOVERY_COOKIE_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$app/env/private';
import { translateAuthError } from '#lib/server/auth-errors';
import { isPasswordBreached } from '#lib/server/password-safety';
import { checkRateLimit } from '#lib/server/rate-limit';
import { RECOVERY_COOKIE, recoveryKey, verifyRecoveryToken } from '#lib/server/recovery';
import { readString } from '#lib/utils/forms';
import { fieldErrors, resetSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const RECOVERY_KEY = recoveryKey(
	RECOVERY_COOKIE_SECRET || SUPABASE_SERVICE_ROLE_KEY || CRON_SECRET
);

const EXPIRED = 'El enlace de recuperación expiró. Solicita uno nuevo para cambiar la contraseña.';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const { user } = await locals.safeGetSession();
	const hasRecoverySession = Boolean(
		user && verifyRecoveryToken(RECOVERY_KEY, cookies.get(RECOVERY_COOKIE), user.id)
	);

	return { hasRecoverySession };
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress, setHeaders, cookies }) => {
		const user = locals.user;

		// Una sesión activa no basta: el cambio debe venir del enlace de correo.
		if (!user || !verifyRecoveryToken(RECOVERY_KEY, cookies.get(RECOVERY_COOKIE), user.id)) {
			return fail(403, { message: EXPIRED });
		}

		const form = await request.formData();

		let address = 'unknown';
		try {
			address = getClientAddress();
		} catch {
			// Sin dirección disponible: se limita por clave global.
		}

		const rate = checkRateLimit(`reset:${address}`, 10, 15 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				message: 'Demasiados intentos. Espera unos minutos antes de reintentar.'
			});
		}

		const parsed = resetSchema.safeParse({
			password: readString(form, 'password'),
			passwordConfirm: readString(form, 'passwordConfirm')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos ingresados.',
				errors: fieldErrors(parsed.error)
			});
		}

		if (await isPasswordBreached(parsed.data.password)) {
			return fail(400, {
				message: 'Esa contraseña aparece en filtraciones públicas. Elige otra.',
				errors: { password: 'Elige una contraseña que no esté filtrada' }
			});
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			return fail(400, { message: translateAuthError(error.message) });
		}

		// La marca es de un solo uso y las demás sesiones no deben sobrevivir al cambio.
		cookies.delete(RECOVERY_COOKIE, { path: '/' });
		const { error: signOutError } = await locals.supabase.auth.signOut({ scope: 'others' });
		if (signOutError) {
			console.error('[finflow] revoke other sessions:', signOutError.message);
		}

		redirect(303, '/');
	}
};
