import { json } from '@sveltejs/kit';
import { listAllTransactions } from '#lib/server/queries';
import { readMonth, readTransactionType } from '#lib/server/transaction-filters';
import {
	formatMonthName,
	localRangeInstants,
	monthRange,
	referenceAtOffset
} from '#lib/utils/dates';
import { parseUuid } from '#lib/utils/uuid';
import type { RequestHandler } from './$types';

/** Tope de filas por descarga; el cliente avisa cuando se alcanza. */
const MAX_ROWS = 5000;

/**
 * Movimientos del mes y filtros visibles en la pestaña, sin paginar.
 * La exportación se genera en el navegador a partir de esta respuesta.
 */
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		return json({ message: 'Sesión no válida' }, { status: 401 });
	}

	const reference = referenceAtOffset(locals.tzOffset);
	const month = readMonth(url.searchParams.get('mes'), reference);
	const range = month ? monthRange(month) : null;
	const bounds = range ? localRangeInstants(range, locals.tzOffset) : null;

	const { items, total, truncated } = await listAllTransactions(
		locals.supabase,
		{
			fromInstant: bounds?.fromInstant,
			toInstant: bounds?.toInstant,
			type: readTransactionType(url.searchParams.get('tipo')),
			accountId: parseUuid(url.searchParams.get('cuenta')),
			categoryId: parseUuid(url.searchParams.get('categoria')),
			search: url.searchParams.get('q')?.trim() || undefined
		},
		MAX_ROWS
	);

	setHeaders({ 'cache-control': 'private, no-store' });

	return json({
		items,
		total,
		truncated,
		month,
		label: range ? formatMonthName(range.from, true) : 'Todo el historial'
	});
};
