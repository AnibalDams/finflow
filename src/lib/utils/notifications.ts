/**
 * Contenido de las notificaciones push.
 *
 * La decisión de *qué* enviar vive en `claim_due_notifications()` (SQL), para que
 * la ventana de días y la hora local se comparen como fechas y no arrastren el
 * desfase entre UTC y la zona del usuario. Aquí solo se da formato al aviso y se
 * prepara lo que consume el service worker.
 */

import type { ClaimedNotification, PushPayload } from '#lib/types/domain';
import { formatDayMonth } from './dates';
import { formatMoney } from './money';

function pluralDays(days: number): string {
	const absolute = Math.abs(days);
	return absolute === 1 ? '1 día' : `${absolute} días`;
}

/** Título, cuerpo y destino del push para un aviso ya reclamado. */
export function buildPushPayload(notification: ClaimedNotification): PushPayload {
	const { kind, label, amount, currency, dueDate, daysLeft, refId, targetUrl } = notification;
	const fee = formatMoney(amount, currency);
	const day = formatDayMonth(dueDate);

	if (kind === 'debt_overdue') {
		return {
			title: `${label} está vencida`,
			body: `La cuota de ${fee} venció hace ${pluralDays(daysLeft)}. Regístrala para no generar mora.`,
			url: targetUrl,
			tag: `debt-${refId}`
		};
	}

	if (kind === 'goal_reminder') {
		return {
			title: `Aporte programado · ${label}`,
			body:
				amount > 0
					? `Toca aportar ${fee} este mes (${day}).`
					: `Recuerda registrar tu aporte mensual (${day}).`,
			url: targetUrl,
			tag: `goal-${refId}`
		};
	}

	if (daysLeft <= 0) {
		return {
			title: `${label} vence hoy`,
			body: `Programa ${fee} hoy para no generar intereses moratorios.`,
			url: targetUrl,
			tag: `debt-${refId}`
		};
	}

	if (daysLeft === 1) {
		return {
			title: `${label} vence mañana`,
			body: `Programa ${fee} antes del ${day} para no generar intereses moratorios.`,
			url: targetUrl,
			tag: `debt-${refId}`
		};
	}

	return {
		title: `${label} vence en ${daysLeft} días`,
		body: `Programa ${fee} antes del ${day} para no generar intereses moratorios.`,
		url: targetUrl,
		tag: `debt-${refId}`
	};
}

/** Convierte la clave pública VAPID (base64url) en el buffer que pide el navegador. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(normalized);
	const bytes = new Uint8Array(raw.length);
	for (let index = 0; index < raw.length; index += 1) {
		bytes[index] = raw.charCodeAt(index);
	}
	return bytes;
}
