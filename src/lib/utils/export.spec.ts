import { describe, expect, it } from 'vitest';
import { buildReportHtml } from './export-html';
import { buildReportXlsx } from './export-xlsx';
import { csvNumber, reportToCsv, toCsv } from './export';
import { displayCell, type ReportDocument } from './report';

const REPORT: ReportDocument = {
	title: 'Movimientos <octubre>',
	subtitle: 'Octubre 2026',
	profileName: 'Sofía Ramírez',
	currency: 'USD',
	summary: [['Movimientos', '42']],
	sections: [
		{
			heading: 'Detalle',
			columns: [{ label: 'Concepto' }, { label: 'Monto', align: 'right' }],
			rows: [
				['Café & pan', { value: 1234.5, format: 'money' }],
				['Ahorro', { value: 12.5, format: 'percent' }]
			]
		}
	],
	fileName: 'finflow-movimientos-2026-10-01'
};

describe('csvNumber', () => {
	it('usa coma decimal para hojas de cálculo en español', () => {
		expect(csvNumber(1234.5)).toBe('1234,50');
		expect(csvNumber(-10)).toBe('-10,00');
	});
});

describe('toCsv', () => {
	it('une celdas con punto y coma y filas con CRLF', () => {
		expect(
			toCsv([
				['Categoría', 'Monto'],
				['Alimentos', 600]
			])
		).toBe('Categoría;Monto\r\nAlimentos;600');
	});

	it('escapa separadores, comillas y saltos de línea', () => {
		expect(toCsv([['Casa; jardín', 'Dice "hola"', 'a\nb']])).toBe(
			'"Casa; jardín";"Dice ""hola""";"a\nb"'
		);
	});

	it('representa valores vacíos como celdas vacías', () => {
		expect(toCsv([[null, undefined, '', 0]])).toBe(';;;0');
	});

	it('neutraliza fórmulas sin romper números negativos', () => {
		expect(toCsv([['=1+1', '+SUM(A1)', '-2+3', '@cmd', -10]])).toBe(
			"'=1+1;'+SUM(A1);'-2+3;'@cmd;-10"
		);
	});
});

describe('reportToCsv', () => {
	it('incluye metadatos, resumen y celdas numéricas con coma decimal', () => {
		const rows = reportToCsv(REPORT);
		expect(rows[0]).toEqual(['Movimientos <octubre>']);
		expect(rows).toContainEqual(['Concepto', 'Monto']);
		expect(rows).toContainEqual(['Café & pan', '1234,50']);
		expect(rows).toContainEqual(['Ahorro', '12,50']);
	});
});

describe('displayCell', () => {
	it('formatea dinero y porcentajes', () => {
		expect(displayCell({ value: 1234.5, format: 'money' }, 'USD')).toBe('$1,234.50');
		expect(displayCell({ value: 12.5, format: 'percent' }, 'USD')).toBe('12.5%');
		expect(displayCell(null, 'USD')).toBe('');
	});
});

describe('buildReportHtml', () => {
	it('escapa contenido y conserva las tarjetas de resumen', () => {
		const html = buildReportHtml(REPORT, new Date('2026-10-25T12:00:00.000Z'));

		expect(html).toContain('&lt;octubre&gt;');
		expect(html).not.toContain('<octubre>');
		expect(html).toContain('Café &amp; pan');
		expect(html).toContain('$1,234.50');
		expect(html).toContain('Movimientos');
		expect(html).toContain('<table>');
	});
});

describe('buildReportXlsx', () => {
	it('genera un ZIP válido con una hoja y celdas numéricas', () => {
		const bytes = buildReportXlsx(REPORT);
		expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('PK\u0003\u0004');

		const files = unzip(bytes);
		expect([...files.keys()]).toContain('xl/worksheets/sheet1.xml');
		expect(files.get('xl/workbook.xml')).toContain('r:id="rId1"');
		expect(files.get('xl/worksheets/sheet1.xml')).toContain('Café &amp; pan');
		expect(files.get('xl/worksheets/sheet1.xml')).toContain('<v>1234.5</v>');
		expect(files.get('xl/worksheets/sheet1.xml')).toContain('ySplit="7"');
		expect(files.get('xl/styles.xml')).toContain('numFmtId="164"');
	});
});

/** Lee un ZIP con método store (el que produce el exportador). */
function unzip(bytes: Uint8Array): Map<string, string> {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const files = new Map<string, string>();
	const decoder = new TextDecoder();
	let offset = 0;

	while (view.getUint32(offset, true) === 0x04034b50) {
		const method = view.getUint16(offset + 8, true);
		const size = view.getUint32(offset + 18, true);
		const nameLength = view.getUint16(offset + 26, true);
		const extraLength = view.getUint16(offset + 28, true);
		const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
		const start = offset + 30 + nameLength + extraLength;

		expect(method).toBe(0);
		files.set(name, decoder.decode(bytes.subarray(start, start + size)));
		offset = start + size;
	}

	expect(view.getUint32(offset, true)).toBe(0x02014b50);
	return files;
}
