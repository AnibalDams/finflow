/**
 * Informe HTML autocontenido: se abre en el navegador sin conexión y conserva
 * la identidad visual de FinFlow. Pensado para compartir o imprimir.
 */

import { displayCell, type ReportCell, type ReportDocument } from './report';

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function cell(value: ReportCell, currency: string, className = 'left'): string {
	return `<td class="${className}">${escapeHtml(displayCell(value, currency))}</td>`;
}

const STYLES = `
:root {
  --ink: #0f172a;
  --muted: #64748b;
  --hairline: #e2e8f0;
  --surface: #ffffff;
  --canvas: #faf8ff;
  --level-1: #f1f5f9;
  --primary: #006c49;
  --tertiary: #bc0b3b;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
.page { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
.hero {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px;
  padding: 26px 28px; border-radius: 22px; color: #ffffff;
  background: linear-gradient(120deg, #006c49 0%, #00422b 100%);
}
.brand { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; opacity: .85; }
.hero h1 { margin: 6px 0 2px; font-size: 26px; line-height: 1.2; }
.hero p { margin: 0; opacity: .9; font-size: 13px; }
.hero .stamp { text-align: right; font-size: 12px; line-height: 1.6; opacity: .9; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 20px 0; }
.card { background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; padding: 14px 16px; }
.card dt { color: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.card dd { margin: 6px 0 0; font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; }
section { margin-top: 24px; }
h2 { margin: 0 0 10px; font-size: 16px; }
.table-wrap { background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 520px; }
th, td { padding: 10px 14px; border-bottom: 1px solid var(--hairline); text-align: left; }
th { background: var(--level-1); color: var(--muted); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
tbody tr:nth-child(even) { background: #fbfcfe; }
tbody tr:last-child td { border-bottom: 0; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td.center, th.center { text-align: center; }
.note { margin-top: 22px; color: var(--muted); font-size: 12px; }
.footer { margin-top: 10px; display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 11px; }
.negative { color: var(--tertiary); }
@media print {
  body { background: #ffffff; font-size: 11px; }
  .page { max-width: none; padding: 0; }
  .hero { border-radius: 0; padding: 18px 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .table-wrap { border-radius: 0; }
  section { break-inside: avoid; }
  tr { break-inside: avoid; }
}
`;

/** Genera el documento HTML completo. */
export function buildReportHtml(report: ReportDocument, generatedAt: Date = new Date()): string {
	const currency = report.currency ?? 'USD';
	const title = escapeHtml(report.title);
	const stamp = new Intl.DateTimeFormat('es-ES', {
		dateStyle: 'long',
		timeStyle: 'short'
	}).format(generatedAt);

	const summary = report.summary?.length
		? `<dl class="cards">${report.summary
				.map(
					([label, value]) =>
						`<div class="card"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
				)
				.join('')}</dl>`
		: '';

	const sections = report.sections
		.map((section) => {
			const head = section.columns
				.map((column) => `<th class="${column.align ?? 'left'}">${escapeHtml(column.label)}</th>`)
				.join('');
			const body = section.rows
				.map(
					(row) =>
						`<tr>${section.columns
							.map((column, index) => cell(row[index], currency, column.align ?? 'left'))
							.join('')}</tr>`
				)
				.join('');

			return `<section>${
				section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''
			}<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
		})
		.join('');

	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="page">
  <header class="hero">
    <div>
      <p class="brand">FinFlow · Informe financiero</p>
      <h1>${title}</h1>
      ${report.subtitle ? `<p>${escapeHtml(report.subtitle)}</p>` : ''}
    </div>
    <div class="stamp">
      ${report.profileName ? `<div>${escapeHtml(report.profileName)}</div>` : ''}
      <div>${escapeHtml(stamp)}</div>
    </div>
  </header>
  ${summary}
  ${sections}
  <p class="note">${escapeHtml(report.note ?? 'Documento generado por FinFlow.')}</p>
  <div class="footer"><span>FinFlow</span><span>${escapeHtml(stamp)}</span></div>
</main>
</body>
</html>`;
}
