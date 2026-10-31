/**
 * Envío de notificaciones push (Web Push + VAPID).
 *
 * El cron no tiene sesión de usuario, así que este módulo es el único lugar de
 * la app que usa la clave `service_role`. No expone consultas libres: la
 * selección de avisos vive en `claim_due_notifications()` (security definer) y
 * solo se tocan las suscripciones necesarias para enviar.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type * as WebPush from 'web-push';
import webpush from 'web-push';
import { PUBLIC_SUPABASE_URL, PUBLIC_VAPID_PUBLIC_KEY } from '$app/env/public';
import {
	CRON_SECRET,
	SUPABASE_SERVICE_ROLE_KEY,
	VAPID_PRIVATE_KEY,
	VAPID_SUBJECT
} from '$app/env/private';
import { mapClaimedNotification } from '#lib/utils/mappers';
import { buildPushPayload } from '#lib/utils/notifications';
import type { Database } from '#lib/types/database.types';
import type { ClaimedNotification } from '#lib/types/domain';

type Db = SupabaseClient<Database>;

interface StoredSubscription {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
}

export interface DeliveryResult {
	/** Dispositivos a los que se entregó. */
	sent: number;
	/** Dispositivos con un fallo temporal (se reintenta el próximo día). */
	failed: number;
	/** Suscripciones eliminadas porque el navegador las revocó. */
	removed: number;
	/** Cuántos avisos se procesaron. */
	notifications: number;
}

/** Las tres claves deben existir; si falta alguna el push queda desactivado. */
export function pushConfigured(): boolean {
	return Boolean(PUBLIC_VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

/** Compara en tiempo constante para no filtrar el secreto por el tiempo de respuesta. */
export function verifyCronSecret(header: string | null): boolean {
	if (!CRON_SECRET || !header) return false;
	const digest = (value: string) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(header), digest(CRON_SECRET));
}

/**
 * `web-push` es CommonJS: sin exports nombrados y, con un `import * as`, el
 * objeto queda vacío al empaquetar. El import por defecto entrega el módulo
 * real y lo mantiene rastreado en el despliegue.
 */
const push = webpush as typeof WebPush;

let admin: Db | null = null;

function adminClient(): Db {
	if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('push_not_configured');
	admin ??= createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	return admin;
}

let vapidReady = false;

function ensureVapid(): void {
	if (vapidReady) return;
	push.setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
	vapidReady = true;
}

/**
 * Código HTTP del servicio de push. No se usa `instanceof WebPushError` porque
 * el módulo CJS no siempre interopera al empaquetar; el `statusCode` basta.
 */
function statusCodeOf(error: unknown): number {
	if (typeof error === 'object' && error !== null && 'statusCode' in error) {
		const status = Number((error as { statusCode?: unknown }).statusCode);
		return Number.isFinite(status) ? status : 0;
	}
	return 0;
}

/**
 * Reserva en la base de datos los avisos que corresponden a la hora local de
 * cada usuario. Ejecutarlo dos veces el mismo día devuelve lista vacía.
 */
export async function claimDueNotifications(): Promise<ClaimedNotification[]> {
	const { data, error } = await adminClient().rpc('claim_due_notifications');

	if (error) {
		console.error('[finflow] claim_due_notifications:', error.message);
		throw new Error('claim_failed');
	}

	return (data ?? []).map(mapClaimedNotification);
}

/** Envía cada aviso a todos los dispositivos del usuario. */
export async function deliverNotifications(items: ClaimedNotification[]): Promise<DeliveryResult> {
	const result: DeliveryResult = { sent: 0, failed: 0, removed: 0, notifications: items.length };
	if (items.length === 0) return result;

	ensureVapid();
	const db = adminClient();
	const userIds = [...new Set(items.map((item) => item.userId))];

	const { data, error } = await db
		.from('push_subscriptions')
		.select('id, user_id, endpoint, p256dh, auth')
		.in('user_id', userIds);

	if (error) {
		console.error('[finflow] push_subscriptions:', error.message);
		throw new Error('subscriptions_failed');
	}

	const subscriptions = (data ?? []) as StoredSubscription[];
	if (subscriptions.length === 0) return result;

	const byUser = new Map<string, StoredSubscription[]>();
	for (const subscription of subscriptions) {
		const list = byUser.get(subscription.user_id) ?? [];
		list.push(subscription);
		byUser.set(subscription.user_id, list);
	}

	const delivered: string[] = [];
	const revoked: string[] = [];
	const retry: string[] = [];

	for (const item of items) {
		const targets = byUser.get(item.userId) ?? [];
		if (targets.length === 0) continue;

		const payload = JSON.stringify(buildPushPayload(item));

		await Promise.all(
			targets.map(async (subscription) => {
				try {
					await push.sendNotification(
						{
							endpoint: subscription.endpoint,
							keys: { p256dh: subscription.p256dh, auth: subscription.auth }
						},
						payload,
						{ TTL: 3600, urgency: 'normal' }
					);
					delivered.push(subscription.id);
				} catch (sendError) {
					const status = statusCodeOf(sendError);

					// 404/410: el navegador revocó la suscripción, no volverá a servir.
					if (status === 404 || status === 410) {
						revoked.push(subscription.id);
						return;
					}

					console.error(`[finflow] push ${status || 'error'}:`, (sendError as Error).message);
					retry.push(subscription.id);
				}
			})
		);
	}

	const unique = (values: string[]) => [...new Set(values)];

	if (delivered.length > 0) {
		const { error: touchError } = await db
			.from('push_subscriptions')
			.update({ last_used_at: new Date().toISOString(), failure_count: 0 })
			.in('id', unique(delivered));

		if (touchError) console.error('[finflow] push touch:', touchError.message);
	}

	if (revoked.length > 0) {
		const { error: deleteError } = await db
			.from('push_subscriptions')
			.delete()
			.in('id', unique(revoked));

		if (deleteError) console.error('[finflow] push cleanup:', deleteError.message);
	}

	for (const id of unique(retry)) {
		await bumpFailure(db, id);
	}

	result.sent = unique(delivered).length;
	result.failed = unique(retry).length;
	result.removed = unique(revoked).length;
	return result;
}

/** Un dispositivo que falla cinco veces seguidas deja de intentarse. */
async function bumpFailure(db: Db, id: string): Promise<void> {
	const { data } = await db
		.from('push_subscriptions')
		.select('failure_count')
		.eq('id', id)
		.maybeSingle();

	const failures = (data?.failure_count ?? 0) + 1;

	if (failures >= 5) {
		await db.from('push_subscriptions').delete().eq('id', id);
		return;
	}

	await db.from('push_subscriptions').update({ failure_count: failures }).eq('id', id);
}

/** Envía una notificación de prueba a los dispositivos de un usuario. */
export async function sendTestToUser(userId: string): Promise<{ sent: number; failed: number }> {
	if (!pushConfigured()) return { sent: 0, failed: 0 };

	ensureVapid();
	const db = adminClient();
	const { data, error } = await db
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth')
		.eq('user_id', userId);

	if (error) throw new Error('subscriptions_failed');

	const payload = JSON.stringify({
		title: 'FinFlow · prueba de notificación',
		body: 'Todo listo: te avisaremos cuando una cuota esté por vencer.',
		url: '/deudas',
		tag: 'finflow-test'
	});

	let sent = 0;
	let failed = 0;

	await Promise.all(
		((data ?? []) as StoredSubscription[]).map(async (subscription) => {
			try {
				await push.sendNotification(
					{
						endpoint: subscription.endpoint,
						keys: { p256dh: subscription.p256dh, auth: subscription.auth }
					},
					payload,
					{ TTL: 300, urgency: 'high' }
				);
				sent += 1;
			} catch (sendError) {
				const status = statusCodeOf(sendError);
				if (status === 404 || status === 410) {
					await db.from('push_subscriptions').delete().eq('id', subscription.id);
				}
				failed += 1;
			}
		})
	);

	return { sent, failed };
}
