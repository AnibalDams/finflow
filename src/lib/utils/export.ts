/**
 * Exportaciones generadas en el navegador: CSV, Excel (`.xlsx`), HTML y PDF.
 *
 * Todas parten del mismo `ReportDocument`, de modo que los cuatro formatos
 * muestran las mismas columnas, resúmenes y totales.
 */

import { buildReportHtml } from './export-html';
import { downloadReportPdf } from './export-pdf';
import { buildReportXlsx } from './export-xlsx';
import { isReportNumber, type ReportCell, type ReportDocument, type ReportFormat } from './report';

export type CsvCell = string | number | null | undefined;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvCell(value: CsvCell): string {
	const raw = value === null || value === undefined ? '' : String(value);
	// Neutraliza fórmulas sin alterar los valores numéricos (incluidos negativos).
	const text = typeof value === 'string' && FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
	return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
	return rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

/** Número con coma decimal para hojas de cálculo en español. */
export function csvNumber(amount: number): string {
	return amount.toFixed(2).replace('.', ',');
}

export function downloadFile(fileName: string, content: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Libera la URL en el siguiente ciclo para no cortar la descarga.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBinary(fileName: string, content: Uint8Array, mimeType: string): void {
	const bytes = new Uint8Array(content);
	const blob = new Blob([bytes.buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reportCellToCsv(cell: ReportCell): CsvCell {
	if (cell === null || cell === undefined) return '';
	if (!isReportNumber(cell)) return cell;
	return csvNumber(cell.value);
}

/** Matriz CSV del informe: metadatos, resumen y una sección por bloque. */
export function reportToCsv(report: ReportDocument): CsvCell[][] {
	const rows: CsvCell[][] = [[report.title]];

	if (report.subtitle) rows.push([report.subtitle]);
	if (report.profileName) rows.push([report.profileName]);

	if (report.summary?.length) {
		rows.push([]);
		for (const [label, value] of report.summary) rows.push([label, value]);
	}

	for (const section of report.sections) {
		rows.push([]);
		if (section.heading) rows.push([section.heading]);
		rows.push(section.columns.map((column) => column.label));
		for (const row of section.rows) {
			rows.push(section.columns.map((_, index) => reportCellToCsv(row[index])));
		}
	}

	return rows;
}

/** Genera y descarga el informe en el formato pedido. */
export async function downloadReport(format: ReportFormat, report: ReportDocument): Promise<void> {
	const base = report.fileName.replace(/\.(pdf|xlsx|csv|html)$/i, '');

	switch (format) {
		case 'csv':
			downloadFile(`${base}.csv`, `\uFEFF${toCsv(reportToCsv(report))}`, 'text/csv;charset=utf-8');
			return;
		case 'html':
			downloadFile(`${base}.html`, buildReportHtml(report), 'text/html;charset=utf-8');
			return;
		case 'xlsx':
			downloadBinary(`${base}.xlsx`, buildReportXlsx(report), XLSX_MIME);
			return;
		case 'pdf':
			await downloadReportPdf(report);
			return;
	}
}
