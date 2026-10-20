import type { Db } from './queries';
import {
	ALLOWED_IMAGE_TYPES,
	ALLOWED_RECEIPT_TYPES,
	MAX_IMAGE_BYTES,
	MAX_RECEIPT_BYTES,
	receiptPath
} from './queries';

export interface UploadedFile {
	path: string;
	name: string;
}

export type StorageBucket = 'receipts' | 'goal-images' | 'avatars';

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

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
	return signature.every((value, index) => bytes[offset + index] === value);
}

function containsAscii(bytes: Uint8Array, text: string): boolean {
	const needle = new TextEncoder().encode(text);
	for (let index = 0; index <= bytes.length - needle.length; index += 1) {
		if (needle.every((value, offset) => bytes[index + offset] === value)) return true;
	}
	return false;
}

/**
 * Comprueba la firma real del archivo. El `type` que envía el navegador es
 * controlable por el cliente; el bucket también valida MIME, pero esta capa
 * impide subir HTML/ejecutables disfrazados de imagen o PDF.
 */
async function matchesSignature(file: File): Promise<boolean> {
	const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());

	switch (file.type) {
		case 'image/png':
			return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		case 'image/jpeg':
			return startsWith(bytes, [0xff, 0xd8, 0xff]);
		case 'image/webp':
			return (
				startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
				startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
			);
		case 'application/pdf':
			return containsAscii(bytes, '%PDF-');
		default:
			return false;
	}
}

/** Valida un comprobante antes de subirlo. Devuelve el error o `null`. */
export async function validateReceipt(file: File): Promise<string | null> {
	if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
		return 'El comprobante debe ser PNG, JPG, WEBP o PDF.';
	}
	if (file.size > MAX_RECEIPT_BYTES) {
		return 'El comprobante no puede superar los 10 MB.';
	}
	if (!(await matchesSignature(file))) {
		return 'El contenido del comprobante no coincide con su tipo de archivo.';
	}
	return null;
}

/** Valida una imagen de plan antes de subirla. Devuelve el error o `null`. */
export async function validateImage(file: File): Promise<string | null> {
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return 'La imagen debe ser PNG, JPG o WEBP.';
	}
	if (file.size > MAX_IMAGE_BYTES) {
		return 'La imagen no puede superar los 5 MB.';
	}
	if (!(await matchesSignature(file))) {
		return 'El contenido de la imagen no coincide con su tipo de archivo.';
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

export async function uploadGoalImage(
	db: Db,
	userId: string,
	goalId: string,
	file: File
): Promise<UploadedFile> {
	const path = `${userId}/${goalId}/${crypto.randomUUID()}.${
		(file.name.split('.').pop() ?? 'png')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 5) || 'png'
	}`;
	const { error } = await db.storage
		.from('goal-images')
		.upload(path, file, { contentType: file.type, upsert: false });

	if (error) throw new Error('No pudimos subir la imagen.');
	return { path, name: file.name };
}

/** Sube la foto de perfil al bucket privado `avatars`. */
export async function uploadAvatar(db: Db, userId: string, file: File): Promise<UploadedFile> {
	const path = `${userId}/${crypto.randomUUID()}.${
		(file.name.split('.').pop() ?? 'png')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 5) || 'png'
	}`;
	const { error } = await db.storage
		.from('avatars')
		.upload(path, file, { contentType: file.type, upsert: false });

	if (error) throw new Error('No pudimos subir tu foto de perfil.');
	return { path, name: file.name };
}

/** Enlace temporal para ver un archivo privado. */
export async function signedUrl(
	db: Db,
	bucket: StorageBucket,
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

export async function removeFile(db: Db, bucket: StorageBucket, path: string): Promise<void> {
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
