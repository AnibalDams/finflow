import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { sequence, type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import type { Database } from '#lib/types/database.types';
import { mapProfile } from '#lib/utils/mappers';

/** Rutas accesibles sin sesión. */
const PUBLIC_ROUTES = ['/login', '/registro', '/recuperar', '/restablecer', '/auth'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Crea el cliente de Supabase ligado a las cookies de la petición y expone un
 * `safeGetSession` que valida el usuario contra el servidor de Auth (nunca
 * confía en el contenido de la cookie).
 */
const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: options?.path ?? '/' });
					}
				}
			}
		}
	);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

/** Carga perfil y usuario, y protege las rutas privadas. */
const authHandle: Handle = async ({ event, resolve }) => {
	const { user } = await event.locals.safeGetSession();
	event.locals.user = user;
	event.locals.profile = null;

	if (!user) {
		if (!isPublicRoute(event.url.pathname)) {
			const target = `${event.url.pathname}${event.url.search}`;
			redirect(303, target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`);
		}
		return resolve(event);
	}

	const { data } = await event.locals.supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
	event.locals.profile = data ? mapProfile(data) : null;

	if (isPublicRoute(event.url.pathname) && event.url.pathname !== '/restablecer') {
		redirect(303, '/');
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandle, authHandle);

export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (dev) console.error(`[finflow] ${event.url.pathname}:`, error);

	if (kind === 'framework') {
		return {
			status: error.status,
			message: error.status === 404 ? 'No encontramos esa página.' : error.message,
			code: `${error.status}`
		};
	}

	if (kind === 'app') {
		return { status: error.status, message: error.message, code: `${error.status}` };
	}

	if (kind === 'validation') {
		return {
			status: error.status,
			message: error.message || 'Revisa los datos ingresados.',
			code: `${error.status}`
		};
	}

	return { message: 'Ocurrió un error inesperado. Inténtalo de nuevo.', code: '500' };
};

