/**
 * Generador mínimo de libros `.xlsx` (Office Open XML) sin dependencias.
 *
 * Escribe un ZIP sin compresión con las partes obligatorias del formato y una
 * sola hoja: texto en línea, montos numéricos con formato y cabecera fija.
 */

import { displayCell, isReportNumber, type ReportCell, type ReportDocument } from './report';

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index += 1) {
		let value = index;
		for (let bit = 0; bit < 8; bit += 1) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		table[index] = value >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function utf8(value: string): Uint8Array {
	return new TextEncoder().encode(value);
}

/** ZIP con método «store» (sin compresión). */
function zip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = utf8(entry.name);
		const crc = crc32(entry.data);

		const local = new Uint8Array(30 + name.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true);
		localView.setUint16(6, 0x0800, true);
		localView.setUint16(8, 0, true);
		localView.setUint16(10, 0, true);
		localView.setUint16(12, 0x0021, true);
		localView.setUint32(14, crc, true);
		localView.setUint32(18, entry.data.length, true);
		localView.setUint32(22, entry.data.length, true);
		localView.setUint16(26, name.length, true);
		localView.setUint16(28, 0, true);
		local.set(name, 30);

		const header = new Uint8Array(46 + name.length);
		const centralView = new DataView(header.buffer);
		centralView.setUint32(0, 0x02014b50, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, 0x0800, true);
		centralView.setUint16(10, 0, true);
		centralView.setUint16(12, 0, true);
		centralView.setUint16(14, 0x0021, true);
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, entry.data.length, true);
		centralView.setUint32(24, entry.data.length, true);
		centralView.setUint16(28, name.length, true);
		centralView.setUint16(30, 0, true);
		centralView.setUint16(32, 0, true);
		centralView.setUint16(34, 0, true);
		centralView.setUint16(36, 0, true);
		centralView.setUint32(38, 0, true);
		centralView.setUint32(42, offset, true);
		header.set(name, 46);

		chunks.push(local, entry.data);
		central.push(header);
		offset += local.length + entry.data.length;
	}

	const centralSize = central.reduce((size, part) => size + part.length, 0);
	const end = new Uint8Array(22);
	const endView = new DataView(end.buffer);
	endView.setUint32(0, 0x06054b50, true);
	endView.setUint16(4, 0, true);
	endView.setUint16(6, 0, true);
	endView.setUint16(8, entries.length, true);
	endView.setUint16(10, entries.length, true);
	endView.setUint32(12, centralSize, true);
	endView.setUint32(16, offset, true);
	endView.setUint16(20, 0, true);

	const parts = [...chunks, ...central, end];
	const total = parts.reduce((size, part) => size + part.length, 0);
	const output = new Uint8Array(total);
	let position = 0;
	for (const part of parts) {
		output.set(part, position);
		position += part.length;
	}
	return output;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function columnName(index: number): string {
	let name = '';
	let current = index + 1;
	while (current > 0) {
		const remainder = (current - 1) % 26;
		name = String.fromCharCode(65 + remainder) + name;
		current = Math.floor((current - 1) / 26);
	}
	return name;
}

interface SheetCell {
	text: string;
	number?: number;
	style: number;
}

type SheetRow = SheetCell[];

function textCell(text: string, style: number): SheetCell {
	return { text, style };
}

function valueCell(cell: ReportCell, currency: string, body: boolean): SheetCell {
	if (cell === null || cell === undefined) return textCell('', body ? 8 : 0);

	if (!isReportNumber(cell)) return textCell(String(cell), body ? 8 : 0);

	const style =
		cell.format === 'money'
			? body
				? 9
				: 2
			: cell.format === 'percent'
				? body
					? 10
					: 3
				: body
					? 11
					: 0;

	return { text: displayCell(cell, currency), number: cell.value, style };
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Informe" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="#,##0.00"/>
<numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>
<numFmt numFmtId="166" formatCode="#,##0.##"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF006C49"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="5" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Construye el libro y devuelve sus bytes. */
export function buildReportXlsx(report: ReportDocument): Uint8Array {
	const currency = report.currency ?? 'USD';
	const rows: SheetRow[] = [];
	let columnCount = 1;
	let firstHeaderRow = -1;

	const push = (row: SheetRow): void => {
		rows.push(row);
		columnCount = Math.max(columnCount, row.length);
	};

	push([textCell(report.title, 4)]);
	if (report.subtitle) push([textCell(report.subtitle, 5)]);
	push([]);

	if (report.summary?.length) {
		for (const [label, value] of report.summary) {
			push([textCell(label, 7), textCell(value, 12)]);
		}
		push([]);
	}

	for (const section of report.sections) {
		if (section.heading) push([textCell(section.heading, 6)]);
		if (firstHeaderRow < 0) firstHeaderRow = rows.length;
		push(section.columns.map((column) => textCell(column.label, 1)));
		for (const row of section.rows) {
			push(section.columns.map((_, index) => valueCell(row[index], currency, true)));
		}
		push([]);
	}

	const sheetRows = rows
		.map((row, rowIndex) => {
			const cells = row
				.map((cell, columnIndex) => {
					const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
					if (cell.number !== undefined) {
						return `<c r="${ref}" s="${cell.style}"><v>${cell.number}</v></c>`;
					}
					return `<c r="${ref}" t="inlineStr" s="${cell.style}"><is><t xml:space="preserve">${escapeXml(cell.text)}</t></is></c>`;
				})
				.join('');
			return `<row r="${rowIndex + 1}">${cells}</row>`;
		})
		.join('');

	const widths: number[] = [];
	for (let column = 0; column < columnCount; column += 1) {
		let longest = 10;
		for (const row of rows) {
			const cell = row[column];
			if (cell) longest = Math.max(longest, cell.text.length);
		}
		widths.push(Math.min(48, longest + 2));
	}

	const cols = widths
		.map(
			(width, index) =>
				`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
		)
		.join('');

	const merge =
		columnCount > 1
			? `<mergeCells count="1"><mergeCell ref="A1:${columnName(columnCount - 1)}1"/></mergeCells>`
			: '';

	// Congela también la fila de cabecera (índice 0-based → fila 1-based).
	const freeze =
		firstHeaderRow >= 0
			? `<pane ySplit="${firstHeaderRow + 1}" topLeftCell="A${firstHeaderRow + 2}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${firstHeaderRow + 2}" sqref="A${firstHeaderRow + 2}"/>`
			: '';

	const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${columnName(columnCount - 1)}${rows.length}"/>
<sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews>
<cols>${cols}</cols>
<sheetData>${sheetRows}</sheetData>
${merge}
</worksheet>`;

	return zip([
		{ name: '[Content_Types].xml', data: utf8(CONTENT_TYPES) },
		{ name: '_rels/.rels', data: utf8(ROOT_RELS) },
		{ name: 'xl/workbook.xml', data: utf8(WORKBOOK) },
		{ name: 'xl/_rels/workbook.xml.rels', data: utf8(WORKBOOK_RELS) },
		{ name: 'xl/styles.xml', data: utf8(STYLES) },
		{ name: 'xl/worksheets/sheet1.xml', data: utf8(sheet) }
	]);
}
