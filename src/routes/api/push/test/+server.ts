import { checkRateLimit } from '#lib/server/rate-limit';
import { pushConfigured, sendTestToUser } from '#lib/server/push';
import { requireAuth } from '#lib/server/results';
import type { RequestHandler } from './$types';

/** Envía una notificación de prueba a los dispositivos de la sesión actual. */
export const POST: RequestHandler = async ({ locals, setHeaders }) => {
	const user = requireAuth(locals.user);

	if (!pushConfigured()) {
		return Response.json(
			{ message: 'Las notificaciones no están configuradas en el servidor.' },
			{ status: 503 }
		);
	}

	const rate = checkRateLimit(`push-test:${user.id}`, 3, 60_000);
	if (!rate.allowed) {
		setHeaders({ 'retry-after': String(rate.retryAfter) });
		return Response.json(
			{ message: 'Espera un momento antes de volver a probar.' },
			{ status: 429 }
		);
	}

	try {
		const result = await sendTestToUser(user.id);
		return Response.json(result);
	} catch {
		return Response.json({ message: 'No pudimos enviar la prueba.' }, { status: 500 });
	}
};
