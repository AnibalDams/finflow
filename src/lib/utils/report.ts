/**
 * Modelo de un informe exportable. Un mismo documento se puede renderizar a
 * PDF, Excel, CSV o HTML sin duplicar columnas ni cálculos.
 */

import { formatMoney, formatPercent } from '#lib/utils/money';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'html';

export type ReportAlign = 'left' | 'right' | 'center';

/** Celda numérica con formato de presentación. */
export interface ReportNumber {
	value: number;
	format: 'money' | 'number' | 'percent';
	/** Moneda de la fila; si se omite se usa la del documento. */
	currency?: string;
}

export type ReportCell = string | number | null | undefined | ReportNumber;

export interface ReportColumn {
	label: string;
	align?: ReportAlign;
}

export interface ReportSection {
	heading?: string;
	columns: ReportColumn[];
	rows: ReportCell[][];
}

export interface ReportDocument {
	title: string;
	subtitle?: string;
	/** Nombre del usuario o empresa; aparece en la cabecera del PDF/HTML. */
	profileName?: string;
	/** Moneda por defecto para las celdas monetarias. */
	currency?: string;
	/** Pares etiqueta → valor mostrados como tarjetas de resumen. */
	summary?: Array<[string, string]>;
	sections: ReportSection[];
	/** Nombre del archivo sin extensión. */
	fileName: string;
	note?: string;
}

export function isReportNumber(cell: ReportCell): cell is ReportNumber {
	return typeof cell === 'object' && cell !== null;
}

/** Texto legible para PDF y HTML. */
export function displayCell(cell: ReportCell, currency = 'USD'): string {
	if (cell === null || cell === undefined) return '';
	if (!isReportNumber(cell)) return String(cell);

	switch (cell.format) {
		case 'money':
			return formatMoney(cell.value, cell.currency ?? currency);
		case 'percent':
			return formatPercent(cell.value, 1);
		default:
			return cell.value.toLocaleString('en-US', { maximumFractionDigits: 2 });
	}
}
