/**
 * Informe PDF con la identidad visual de FinFlow sobre `jspdf` + `autotable`.
 *
 * Primera página con banda de marca, tarjetas de resumen y tabla; las páginas
 * siguientes repiten una cabecera discreta y todas llevan pie con paginación.
 */

import type { jsPDF as JsPdfDocument, jsPDFOptions } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { displayCell, type ReportDocument } from './report';

type PdfWithTable = JsPdfDocument & {
	lastAutoTable?: { finalY: number };
};

const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const HAIRLINE: [number, number, number] = [226, 232, 240];
const PRIMARY: [number, number, number] = [0, 108, 73];
const SOFT: [number, number, number] = [248, 250, 252];

const OPTIONS: jsPDFOptions = { unit: 'pt', format: 'a4', compress: true };

/**
 * Las fuentes estándar de PDF no incluyen signos tipográficos como el menos
 * de `formatMoney`; se normalizan para que no aparezcan glifos rotos.
 */
function pdfText(value: string): string {
	return value
		.replace(/\u2212/g, '-')
		.replace(/\u2013|\u2014/g, '-')
		.replace(/\u00a0/g, ' ');
}

function formatStamp(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		dateStyle: 'long',
		timeStyle: 'short'
	}).format(date);
}

function drawFooter(doc: JsPdfDocument, report: ReportDocument, stamp: string): void {
	const pages = doc.getNumberOfPages();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 40;

	for (let page = 1; page <= pages; page += 1) {
		doc.setPage(page);

		if (page > 1) {
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(9);
			doc.setTextColor(...INK);
			doc.text('FinFlow', margin, 30);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(...MUTED);
			doc.text(`· ${pdfText(report.title)}`, margin + 40, 30);
			doc.setDrawColor(...HAIRLINE);
			doc.setLineWidth(0.6);
			doc.line(margin, 40, pageWidth - margin, 40);
		}

		doc.setDrawColor(...HAIRLINE);
		doc.setLineWidth(0.6);
		doc.line(margin, pageHeight - 46, pageWidth - margin, pageHeight - 46);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(...MUTED);
		doc.text(`FinFlow · ${stamp}`, margin, pageHeight - 30);
		doc.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 30, {
			align: 'right'
		});
	}
}

/** Genera y descarga el PDF del informe. */
export async function downloadReportPdf(
	report: ReportDocument,
	generatedAt: Date = new Date()
): Promise<void> {
	const [{ jsPDF }, autoTableModule] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable')
	]);

	const autoTable = autoTableModule.default;
	const doc = new jsPDF(OPTIONS);
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 40;
	const contentWidth = pageWidth - margin * 2;
	const stamp = formatStamp(generatedAt);
	const currency = report.currency ?? 'USD';

	// Banda de marca.
	doc.setFillColor(...PRIMARY);
	doc.rect(0, 0, pageWidth, 104, 'F');
	doc.setFillColor(78, 222, 163);
	doc.rect(0, 104, pageWidth, 3, 'F');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8.5);
	doc.setTextColor(226, 240, 234);
	doc.text('FINFLOW · INFORME FINANCIERO', margin, 28);

	doc.setFontSize(20);
	doc.setTextColor(255, 255, 255);
	doc.text(pdfText(report.title), margin, 58, { maxWidth: contentWidth - 150 });

	if (report.subtitle) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(10.5);
		doc.setTextColor(226, 240, 234);
		doc.text(pdfText(report.subtitle), margin, 80);
	}

	doc.setFontSize(9);
	doc.setTextColor(226, 240, 234);
	if (report.profileName) {
		doc.setFont('helvetica', 'bold');
		doc.text(pdfText(report.profileName), pageWidth - margin, 28, { align: 'right' });
	}
	doc.setFont('helvetica', 'normal');
	doc.text(stamp, pageWidth - margin, 44, { align: 'right' });

	// Tarjetas de resumen.
	let y = 126;
	if (report.summary?.length) {
		const columns = report.summary.length === 1 ? 1 : 2;
		const gap = 10;
		const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
		const cardHeight = 48;
		const rows = Math.ceil(report.summary.length / columns);

		report.summary.forEach(([label, value], index) => {
			const column = index % columns;
			const row = Math.floor(index / columns);
			const x = margin + column * (cardWidth + gap);
			const cardY = y + row * (cardHeight + gap);

			doc.setFillColor(...SOFT);
			doc.setDrawColor(...HAIRLINE);
			doc.setLineWidth(0.8);
			doc.roundedRect(x, cardY, cardWidth, cardHeight, 8, 8, 'FD');

			doc.setFont('helvetica', 'normal');
			doc.setFontSize(7.5);
			doc.setTextColor(...MUTED);
			doc.text(pdfText(label.toUpperCase()), x + 12, cardY + 17);

			doc.setFont('helvetica', 'bold');
			doc.setFontSize(13);
			doc.setTextColor(...INK);
			doc.text(pdfText(value), x + 12, cardY + 36, { maxWidth: cardWidth - 24 });
		});

		y += rows * cardHeight + (rows - 1) * gap + 22;
	}

	// Tablas.
	for (const section of report.sections) {
		if (y > pageHeight - 120) {
			doc.addPage();
			y = 60;
		}

		if (section.heading) {
			doc.setFillColor(...PRIMARY);
			doc.rect(margin, y - 9, 3, 12, 'F');
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(12);
			doc.setTextColor(...INK);
			doc.text(pdfText(section.heading), margin + 10, y);
			y += 14;
		}

		if (section.rows.length === 0) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9.5);
			doc.setTextColor(...MUTED);
			doc.text('Sin registros para este periodo.', margin, y + 8);
			y += 24;
			continue;
		}

		const columnStyles: UserOptions['columnStyles'] = {};
		section.columns.forEach((column, index) => {
			columnStyles[index] = { halign: column.align ?? 'left' };
		});

		const options: UserOptions = {
			head: [section.columns.map((column) => pdfText(column.label))],
			body: section.rows.map((row) =>
				section.columns.map((_, index) => pdfText(displayCell(row[index], currency)))
			),
			startY: y,
			margin: { top: 56, right: margin, bottom: 58, left: margin },
			theme: 'grid',
			styles: {
				font: 'helvetica',
				fontSize: 8.5,
				cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
				textColor: INK,
				lineColor: HAIRLINE,
				lineWidth: 0.5,
				overflow: 'linebreak',
				valign: 'middle'
			},
			headStyles: {
				fillColor: PRIMARY,
				textColor: [255, 255, 255],
				fontStyle: 'bold',
				fontSize: 8,
				cellPadding: { top: 6, right: 6, bottom: 6, left: 6 }
			},
			alternateRowStyles: { fillColor: SOFT },
			columnStyles,
			rowPageBreak: 'avoid',
			showHead: 'everyPage'
		};

		autoTable(doc, options);
		y = ((doc as PdfWithTable).lastAutoTable?.finalY ?? y) + 22;
	}

	if (report.note) {
		if (y > pageHeight - 80) {
			doc.addPage();
			y = 60;
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(...MUTED);
		doc.text(pdfText(report.note), margin, y, { maxWidth: contentWidth });
	}

	drawFooter(doc, report, stamp);
	doc.save(`${report.fileName.replace(/\.pdf$/i, '')}.pdf`);
}
