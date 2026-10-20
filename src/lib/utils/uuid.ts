/**
 * Validación defensiva de UUIDs que llegan desde la URL o desde formularios.
 * Evita interpolar valores arbitrarios en filtros de PostgREST.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_REGEX.test(value);
}

export function parseUuid(value: string | null | undefined): string | undefined {
	return isUuid(value) ? value : undefined;
}
