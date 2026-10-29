import {
	claimDueNotifications,
	deliverNotifications,
	pushConfigured,
	verifyCronSecret
} from '#lib/server/push';
import type { RequestHandler } from './$types';

/**
 * Disparador del cron (pg_cron → pg_net, o el cron del hosting).
 *
 * No usa sesión de usuario: se autentica con `CRON_SECRET`, que va en la
 * cabecera `x-cron-secret` o como `Authorization: Bearer …`. Acepta GET y POST
 * para encajar con cualquier programador.
 */
const run: RequestHandler = async ({ request, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const authorization = request.headers.get('authorization') ?? '';
	const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
	const provided = request.headers.get('x-cron-secret') ?? bearer;

	if (!verifyCronSecret(provided)) {
		return Response.json({ message: 'No autorizado' }, { status: 401 });
	}

	if (!pushConfigured()) {
		return Response.json({ message: 'Push sin configurar' }, { status: 503 });
	}

	try {
		const claimed = await claimDueNotifications();
		const delivery = await deliverNotifications(claimed);
		return Response.json(delivery);
	} catch {
		return Response.json({ message: 'No pudimos procesar los avisos.' }, { status: 500 });
	}
};

export const GET = run;
export const POST = run;
