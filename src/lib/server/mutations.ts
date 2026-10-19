import type { Db } from './queries';
import { MAX_RECEIPT_BYTES, ALLOWED_RECEIPT_TYPES, receiptPath } from './queries';

export interface UploadedFile {
	path: string;
	name: string;
}

/** Traduce mensajes de PostgreSQL a avisos legibles para el usuario. */
export function mutationMessage(message: string, fallback: string): string {
	if (/duplicate key|already exists|unique/i.test(message)) {
		return 'Ya existe un registro con esos datos.';
	}
	if (/violates check constraint|violates foreign key/i.test(message)) {
		return 'Alguno de los datos no es válido. Revisa el formulario.';
	}
	if (/permission denied|row-level security|not authorized/i.test(message)) {
		return 'No tienes permiso para realizar esta acción.';
	}
	return fallback;
}

/** Valida un comprobante antes de subirlo. Devuelve el error o `null`. */
export function validateReceipt(file: File): string | null {
	if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
		return 'El comprobante debe ser PNG, JPG, WEBP o PDF.';
	}
	if (file.size > MAX_RECEIPT_BYTES) {
		return 'El comprobante no puede superar los 10 MB.';
	}
	return null;
}

/** Valida una imagen de plan antes de subirla. Devuelve el error o `null`. */
export function validateImage(file: File): string | null {
	if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
		return 'La imagen debe ser PNG, JPG o WEBP.';
	}
	if (file.size > 5 * 1024 * 1024) {
		return 'La imagen no puede superar los 5 MB.';
	}
	return null;
}

/**
 * Sube un comprobante al bucket privado `receipts`. La ruta se genera con un
 * identificador aleatorio para poder subir el archivo antes de crear el
 * movimiento y mantener la operación en un solo paso.
 */
export async function uploadReceipt(db: Db, userId: string, file: File): Promise<UploadedFile> {
	const path = receiptPath(userId, crypto.randomUUID(), file.name);
	const { error } = await db.storage
		.from('receipts')
		.upload(path, file, { contentType: file.type, upsert: false });

	if (error) throw new Error('No pudimos subir el comprobante.');
	return { path, name: file.name };
}

export async function uploadGoalImage(db: Db, userId: string, goalId: string, file: File): Promise<UploadedFile> {
	const path = `${userId}/${goalId}/${crypto.randomUUID()}.${(file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'png'}`;
	const { error } = await db.storage
		.from('goal-images')
		.upload(path, file, { contentType: file.type, upsert: false });

	if (error) throw new Error('No pudimos subir la imagen.');
	return { path, name: file.name };
}

/** Enlace temporal para ver un archivo privado. */
export async function signedUrl(
	db: Db,
	bucket: 'receipts' | 'goal-images',
	path: string,
	expiresIn = 600
): Promise<string | null> {
	const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
	if (error || !data) {
		console.error('[finflow] signed url:', error?.message);
		return null;
	}
	return data.signedUrl;
}

export async function removeFile(
	db: Db,
	bucket: 'receipts' | 'goal-images',
	path: string
): Promise<void> {
	const { error } = await db.storage.from(bucket).remove([path]);
	if (error) console.error('[finflow] remove file:', error.message);
}

/** Reemplaza por completo las etiquetas de un movimiento. */
export async function replaceTransactionTags(
	db: Db,
	userId: string,
	transactionId: string,
	names: string[]
): Promise<void> {
	const { error } = await db.from('transaction_tags').delete().eq('transaction_id', transactionId);
	if (error) {
		console.error('[finflow] tags clear:', error.message);
		return;
	}
	await syncTransactionTags(db, userId, transactionId, names);
}

/**
 * Crea (si hace falta) las etiquetas indicadas y las asocia al movimiento.
 * Es una operación accesoria: si falla no bloquea el registro del movimiento.
 */
export async function syncTransactionTags(
	db: Db,
	userId: string,
	transactionId: string,
	names: string[]
): Promise<void> {
	const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 8);
	if (unique.length === 0) return;

	const { data: existing, error: readError } = await db
		.from('tags')
		.select('id, name')
		.in('name', unique);

	if (readError) {
		console.error('[finflow] tags read:', readError.message);
		return;
	}

	const byName = new Map((existing ?? []).map((tag) => [tag.name, tag.id]));
	const missing = unique.filter((name) => !byName.has(name));

	if (missing.length > 0) {
		const { data: created, error: createError } = await db
			.from('tags')
			.insert(missing.map((name) => ({ user_id: userId, name })))
			.select('id, name');

		if (createError) {
			console.error('[finflow] tags create:', createError.message);
			return;
		}
		for (const tag of created ?? []) byName.set(tag.name, tag.id);
	}

	const rows = unique
		.map((name) => byName.get(name))
		.filter((tagId): tagId is string => Boolean(tagId))
		.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId, user_id: userId }));

	if (rows.length === 0) return;

	const { error: linkError } = await db.from('transaction_tags').insert(rows);
	if (linkError) console.error('[finflow] tags link:', linkError.message);
}
