/**
 * Exportaciones generadas en el navegador: CSV (compatible con Excel en
 * español: separador `;` y coma decimal) y PDF con `jspdf`.
 */

export type CsvCell = string | number | null | undefined;

function csvCell(value: CsvCell): string {
	const text = value === null || value === undefined ? '' : String(value);
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

export function downloadCsv(fileName: string, rows: CsvCell[][]): void {
	downloadFile(fileName, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8');
}

export interface PdfReport {
	title: string;
	subtitle?: string;
	/** Pares etiqueta → valor mostrados antes de la tabla. */
	summary?: Array<[string, string]>;
	head: string[];
	body: string[][];
	fileName: string;
	/** Nota al pie. */
	footnote?: string;
}

/** Genera y descarga un informe PDF con una tabla tabular. */
export async function downloadPdf(report: PdfReport): Promise<void> {
	const [{ jsPDF }, autoTableModule] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable')
	]);

	const autoTable = autoTableModule.default;
	const doc = new jsPDF({ unit: 'pt', format: 'a4' });
	const margin = 40;

	let y = 52;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.setTextColor(19, 27, 46);
	doc.text(report.title, margin, y);

	if (report.subtitle) {
		y += 18;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(10);
		doc.setTextColor(100, 116, 139);
		doc.text(report.subtitle, margin, y);
	}

	if (report.summary && report.summary.length > 0) {
		y += 20;
		doc.setFontSize(10);
		for (const [label, value] of report.summary) {
			doc.setTextColor(100, 116, 139);
			doc.text(label, margin, y);
			doc.setTextColor(19, 27, 46);
			doc.text(value, margin + 150, y);
			y += 15;
		}
	}

	autoTable(doc, {
		head: [report.head],
		body: report.body,
		startY: y + 12,
		margin: { left: margin, right: margin },
		styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [19, 27, 46] },
		headStyles: { fillColor: [0, 131, 88], textColor: 255, fontStyle: 'bold' },
		alternateRowStyles: { fillColor: [241, 245, 249] },
		theme: 'striped'
	});

	doc.setFontSize(8);
	doc.setTextColor(148, 163, 184);
	doc.text(
		report.footnote ?? `Generado por FinFlow · ${new Date().toLocaleString('es-ES')}`,
		margin,
		doc.internal.pageSize.getHeight() - 28
	);

	doc.save(report.fileName);
}
