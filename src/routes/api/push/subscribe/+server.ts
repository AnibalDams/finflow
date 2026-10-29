import { checkRateLimit } from '#lib/server/rate-limit';
import { requireAuth } from '#lib/server/results';
import { pushSubscriptionSchema } from '#lib/utils/validation';
import type { RequestHandler } from './$types';

/** Guarda (o reasigna) la suscripción de este dispositivo. */
export const POST: RequestHandler = async ({ request, locals, setHeaders }) => {
	const user = requireAuth(locals.user);

	// Un usuario legítimo registra uno o dos dispositivos; el tope evita que se
	// llene la tabla con endpoints inventados.
	const rate = checkRateLimit(`push-subscribe:${user.id}`, 20, 60 * 60_000);
	if (!rate.allowed) {
		setHeaders({ 'retry-after': String(rate.retryAfter) });
		return Response.json({ message: 'Demasiadas solicitudes.' }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ message: 'Datos inválidos' }, { status: 400 });
	}

	const parsed = pushSubscriptionSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ message: 'Suscripción inválida' }, { status: 400 });
	}

	const { error } = await locals.supabase.rpc('register_push_subscription', {
		p_endpoint: parsed.data.endpoint,
		p_p256dh: parsed.data.keys.p256dh,
		p_auth: parsed.data.keys.auth,
		p_user_agent: request.headers.get('user-agent') ?? ''
	});

	if (error) {
		console.error('[finflow] register_push_subscription:', error.message);
		return Response.json({ message: 'No pudimos guardar la suscripción.' }, { status: 500 });
	}

	return Response.json({ ok: true });
};

/** Elimina la suscripción de este dispositivo (RLS limita a las propias). */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ message: 'Datos inválidos' }, { status: 400 });
	}

	const endpoint =
		typeof body === 'object' && body !== null && 'endpoint' in body
			? (body as { endpoint: unknown }).endpoint
			: null;

	if (typeof endpoint !== 'string' || endpoint.length < 10 || endpoint.length > 1200) {
		return Response.json({ message: 'Suscripción inválida' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('push_subscriptions')
		.delete()
		.eq('user_id', user.id)
		.eq('endpoint', endpoint);

	if (error) {
		console.error('[finflow] delete push subscription:', error.message);
		return Response.json({ message: 'No pudimos quitar la suscripción.' }, { status: 500 });
	}

	return Response.json({ ok: true });
};
