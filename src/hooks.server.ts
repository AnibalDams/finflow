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

/** Lee la zona del usuario (cookie del cliente) y la expone en `locals`. */
const timezoneHandle: Handle = async ({ event, resolve }) => {
	const raw = event.cookies.get('tz_offset');
	const parsed = raw ? Number.parseInt(raw, 10) : 0;

	event.locals.tzOffset = Number.isInteger(parsed) && Math.abs(parsed) <= 840 ? parsed : 0;

	return resolve(event);
};

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
						event.cookies.set(name, value, {
							...options,
							path: options?.path ?? '/',
							// La app nunca lee la sesión desde el navegador: todas las
							// llamadas a Supabase ocurren en el servidor. La cookie debe
							// ser inaccesible para JavaScript.
							httpOnly: true,
							secure: !dev,
							sameSite: 'lax'
						});
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
	// El cron de notificaciones no tiene sesión: su ruta valida `CRON_SECRET`.
	if (event.url.pathname === '/api/cron/notifications') return resolve(event);

	const { user } = await event.locals.safeGetSession();
	event.locals.user = user;
	event.locals.profile = null;

	if (!user) {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ message: 'Sesión no válida' }), {
				status: 401,
				headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
			});
		}

		if (!isPublicRoute(event.url.pathname)) {
			const target = `${event.url.pathname}${event.url.search}`;
			redirect(303, target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`);
		}
		return resolve(event);
	}

	const { data } = await event.locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.maybeSingle();

	// El offset lo escribe el navegador en la cookie; se persiste para que el
	// cron pueda calcular la hora local del usuario sin sesión.
	if (data && data.tz_offset !== event.locals.tzOffset) {
		const { error } = await event.locals.supabase
			.from('profiles')
			.update({ tz_offset: event.locals.tzOffset })
			.eq('id', user.id);

		if (error) console.error('[finflow] tz_offset:', error.message);
		else data.tz_offset = event.locals.tzOffset;
	}

	event.locals.profile = data ? mapProfile(data) : null;

	// Solo navegaciones de lectura: las rutas `/auth/salir` y `/auth/confirm`
	// reciben POST y deben ejecutarse incluso con sesión activa.
	if (
		event.request.method === 'GET' &&
		isPublicRoute(event.url.pathname) &&
		event.url.pathname !== '/restablecer'
	) {
		redirect(303, '/');
	}

	return resolve(event);
};

/**
 * Cabeceras de seguridad y política de caché para respuestas autenticadas.
 * La CSP se genera en `vite.config.ts` (nonces/hashes de SvelteKit).
 */
const securityHeadersHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	// Nunca permitir que un proxy o el navegador cachee HTML con datos privados.
	if (event.locals.user) {
		response.headers.set('Cache-Control', 'private, no-store');
	}

	return response;
};

export const handle = sequence(timezoneHandle, securityHeadersHandle, supabaseHandle, authHandle);

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
