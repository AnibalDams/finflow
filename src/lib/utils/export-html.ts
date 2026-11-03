/**
 * Informe HTML autocontenido: se abre en el navegador sin conexión y conserva
 * la identidad visual de FinFlow. Incluye gráficos SVG y está pensado para
 * compartir o imprimir.
 */

import { formatCompactMoney, formatMoney, formatPercent } from '#lib/utils/money';
import {
	displayCell,
	isReportNumber,
	type ReportBarsChart,
	type ReportCell,
	type ReportChart,
	type ReportColumn,
	type ReportDocument,
	type ReportDonutChart,
	type ReportLineChart
} from './report';

const PALETTE = ['#006c49', '#4648d4', '#bc0b3b', '#b45309', '#0e7490', '#7c3aed', '#64748b'];

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function safeColor(value: string | undefined, fallback: string): string {
	return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

function niceMax(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const normalized = value / magnitude;
	const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return step * magnitude;
}

function formatValue(value: number, currency: string, compact = false): string {
	return compact ? formatCompactMoney(value, currency) : formatMoney(value, currency);
}

function renderCell(value: ReportCell, currency: string, column: ReportColumn): string {
	const className = [column.align ?? 'left', column.kind ?? ''].filter(Boolean).join(' ');
	const text = escapeHtml(displayCell(value, currency));

	if (column.kind === 'type') {
		const tone = text === 'Ingreso' ? 'income' : text === 'Gasto' ? 'expense' : 'transfer';
		return `<td class="${className}"><span class="pill pill-${tone}">${text}</span></td>`;
	}

	const negative = isReportNumber(value) && value.value < 0 ? ' negative' : '';
	return `<td class="${className}${negative}">${text}</td>`;
}

function legendLine(color: string, dashed = false): string {
	return `<i class="legend-line${dashed ? ' dashed' : ''}" style="--c:${safeColor(color, PALETTE[0])}"></i>`;
}

function renderLineChart(chart: ReportLineChart, index: number): string {
	const currency = chart.currency ?? 'USD';
	const width = 640;
	const height = 252;
	const pad = { top: 18, right: 24, bottom: 34, left: 68 };
	const allValues = chart.series.flatMap((series) => series.values);
	const max = niceMax(Math.max(0, ...allValues));
	const count = Math.max(
		chart.labels.length,
		...chart.series.map((series) => series.values.length),
		1
	);
	const innerWidth = width - pad.left - pad.right;
	const innerHeight = height - pad.top - pad.bottom;
	const pointX = (i: number): number =>
		pad.left + (count === 1 ? innerWidth / 2 : (i / (count - 1)) * innerWidth);
	const pointY = (value: number): number =>
		pad.top + innerHeight - (Math.max(0, value) / max) * innerHeight;

	const gridSteps = 5;
	const grid = Array.from({ length: gridSteps + 1 }, (_, step) => {
		const value = (max / gridSteps) * step;
		const y = pointY(value);
		return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="grid" /><text x="${pad.left - 10}" y="${y}" class="axis-y">${escapeHtml(formatValue(value, currency, true))}</text>`;
	}).join('');

	const labeled = new Set<number>();
	const step = Math.max(1, Math.ceil(count / 7));
	for (let i = 0; i < count; i += step) labeled.add(i);
	labeled.add(count - 1);
	const xLabels = [...labeled]
		.sort((a, b) => a - b)
		.map(
			(i) =>
				`<text x="${pointX(i)}" y="${height - 10}" class="axis-x">${escapeHtml(chart.labels[i] ?? '')}</text>`
		)
		.join('');

	const first = chart.series[0];
	const area =
		first && first.values.length > 3
			? `<path d="${first.values
					.map((value, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(value)}`)
					.join(
						' '
					)} L ${pointX(first.values.length - 1)} ${pointY(0)} L ${pointX(0)} ${pointY(0)} Z" fill="url(#area-${index})" />`
			: '';

	const lines = chart.series
		.map((series) => {
			const color = safeColor(series.color, PALETTE[0]);
			const path = series.values
				.map((value, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(value)}`)
				.join(' ');
			const dots =
				count <= 14
					? series.values
							.map(
								(value, i) =>
									`<circle cx="${pointX(i)}" cy="${pointY(value)}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5"><title>${escapeHtml(series.label)} · ${escapeHtml(formatValue(value, currency))}</title></circle>`
							)
							.join('')
					: '';

			return `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${series.dashed ? ' stroke-dasharray="5 5"' : ''} />${dots}`;
		})
		.join('');

	const desc = chart.series
		.map(
			(series) =>
				`${series.label}: ${formatValue(
					series.values.reduce((a, b) => a + b, 0),
					currency
				)}`
		)
		.join('. ');

	return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title)}" data-chart="line">
		<title>${escapeHtml(chart.title)}</title>
		<desc>${escapeHtml(desc)}</desc>
		<defs>
			<linearGradient id="area-${index}" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#006c49" stop-opacity="0.20" />
				<stop offset="100%" stop-color="#006c49" stop-opacity="0" />
			</linearGradient>
		</defs>
		${grid}
		${xLabels}
		${area}
		${lines}
	</svg>`;
}

function renderDonutChart(chart: ReportDonutChart): string {
	const currency = chart.currency ?? 'USD';
	const items = chart.items.filter((item) => item.value > 0);
	const total = items.reduce((sum, item) => sum + item.value, 0);

	if (items.length === 0 || total <= 0) {
		return '<p class="chart-empty">Sin gastos en el periodo seleccionado.</p>';
	}

	const size = 214;
	const center = size / 2;
	const radius = 76;
	const stroke = 24;
	const circumference = 2 * Math.PI * radius;
	let offset = 0;

	const segments = items
		.map((item, index) => {
			const length = (item.value / total) * circumference;
			const gap = items.length > 1 ? Math.min(3, length * 0.1) : 0;
			const dash = Math.max(0, length - gap);
			const color = safeColor(item.color, PALETTE[index % PALETTE.length]);
			const segment = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${center} ${center})"><title>${escapeHtml(item.label)} · ${escapeHtml(formatMoney(item.value, currency))}</title></circle>`;
			offset += length;
			return segment;
		})
		.join('');

	const legend = items
		.map((item, index) => {
			const color = safeColor(item.color, PALETTE[index % PALETTE.length]);
			const percent = (item.value / total) * 100;
			const percentLabel =
				percent > 0 && percent < 0.1 ? '<0.1%' : formatPercent(percent, percent >= 10 ? 0 : 1);
			return `<li>
				<span class="dot" style="background:${color}"></span>
				<span class="legend-name">${escapeHtml(item.label)}</span>
				<span class="legend-value">${escapeHtml(formatMoney(item.value, currency))}</span>
				<span class="legend-pct">${escapeHtml(percentLabel)}</span>
			</li>`;
		})
		.join('');

	return `<div class="donut-body">
		<div class="donut-wrap">
			<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(chart.title)}" data-chart="donut">
				<title>${escapeHtml(chart.title)}</title>
				${segments}
				<text x="${center}" y="${center - 2}" class="donut-total" text-anchor="middle">${escapeHtml(formatCompactMoney(total, currency))}</text>
				<text x="${center}" y="${center + 16}" class="donut-caption" text-anchor="middle">${escapeHtml(chart.centerLabel ?? 'Total')}</text>
			</svg>
		</div>
		<ul class="legend-list">${legend}</ul>
	</div>`;
}

function renderBarsChart(chart: ReportBarsChart): string {
	const currency = chart.currency ?? 'USD';
	const max = niceMax(Math.max(1, ...chart.items.map((item) => item.value)));

	const rows = chart.items
		.map((item, index) => {
			const color = safeColor(item.color, PALETTE[index % PALETTE.length]);
			const width = Math.max(0, Math.min(100, (item.value / max) * 100));

			return `<div class="bar-row">
				<div class="bar-meta">
					<span class="bar-label"><span class="dot" style="background:${color}"></span>${escapeHtml(item.label)}</span>
					<span class="bar-amount">${escapeHtml(formatMoney(item.value, currency))}</span>
				</div>
				<div class="bar-track"><span class="bar-fill" style="width:${width.toFixed(2)}%;background:${color}"></span></div>
			</div>`;
		})
		.join('');

	return `<div class="bars">${rows}</div>${
		chart.note ? `<p class="chart-note">${escapeHtml(chart.note)}</p>` : ''
	}`;
}

function renderChart(chart: ReportChart, index: number): string {
	let body = '';
	let legend = '';

	switch (chart.kind) {
		case 'bars':
			body = renderBarsChart(chart);
			break;
		case 'donut':
			body = renderDonutChart(chart);
			break;
		case 'line':
			body = renderLineChart(chart, index);
			legend = `<div class="legend">${chart.series
				.map(
					(series) =>
						`<span class="legend-item">${legendLine(series.color ?? PALETTE[0], series.dashed)}${escapeHtml(series.label)}</span>`
				)
				.join('')}</div>`;
			break;
	}

	return `<article class="chart-card${chart.kind === 'line' ? ' wide' : ''}">
		<header class="chart-head">
			<div>
				<h3>${escapeHtml(chart.title)}</h3>
				${chart.subtitle ? `<p>${escapeHtml(chart.subtitle)}</p>` : ''}
			</div>
			${legend}
		</header>
		${body}
	</article>`;
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
  --secondary: #4648d4;
  --tertiary: #bc0b3b;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background:
    radial-gradient(700px 320px at 8% -8%, rgba(0, 108, 73, .08), transparent 70%),
    radial-gradient(600px 300px at 96% 4%, rgba(70, 72, 212, .07), transparent 70%),
    var(--canvas);
  color: var(--ink);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.55;
}
.page { max-width: 1040px; margin: 0 auto; padding: 34px 22px 52px; }
.hero {
  position: relative; overflow: hidden;
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px;
  padding: 28px 30px; border-radius: 24px; color: #ffffff;
  background: linear-gradient(122deg, #006c49 0%, #00563c 46%, #003927 100%);
  box-shadow: 0 26px 60px -34px rgba(0, 66, 43, .75);
}
.hero::after {
  content: ''; position: absolute; right: -70px; bottom: -130px;
  width: 320px; height: 320px; border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 251, 190, .30), transparent 66%);
  pointer-events: none;
}
.hero-main { position: relative; z-index: 1; min-width: 0; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; opacity: .9; }
.logo {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px;
  background: rgba(255, 255, 255, .16); border: 1px solid rgba(255, 255, 255, .16);
  font-size: 16px; font-weight: 800; letter-spacing: 0; text-transform: none;
}
.hero h1 { margin: 14px 0 3px; font-size: 32px; line-height: 1.12; letter-spacing: -.02em; }
.hero .subtitle { margin: 0; opacity: .9; font-size: 14px; }
.hero .stamp { position: relative; z-index: 1; text-align: right; font-size: 12px; line-height: 1.7; opacity: .92; }
.hero .stamp .profile { margin: 0; font-weight: 700; font-size: 14px; opacity: 1; }
.hero .stamp .date { margin: 0; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 13px; margin: 20px 0 4px; }
.card {
  position: relative; overflow: hidden; background: var(--surface);
  border: 1px solid var(--hairline); border-radius: 18px; padding: 16px 18px 15px;
  box-shadow: 0 14px 30px -26px rgba(15, 23, 42, .35);
}
.card::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--primary), #4edea3); }
.card dt { color: var(--muted); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; }
.card dd { margin: 7px 0 0; font-size: 21px; font-weight: 750; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin: 28px 0 11px; }
.section-heading h2 { margin: 0; font-size: 18px; letter-spacing: -.01em; }
.section-heading p { margin: 0; color: var(--muted); font-size: 12px; }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.chart-card {
  background: var(--surface); border: 1px solid var(--hairline); border-radius: 20px;
  padding: 17px 18px 16px; min-width: 0;
  box-shadow: 0 16px 34px -28px rgba(15, 23, 42, .38);
}
.chart-card.wide { grid-column: 1 / -1; }
.chart-head { display: flex; align-items: start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.chart-head h3 { margin: 0; font-size: 14px; letter-spacing: -.01em; }
.chart-head p { margin: 2px 0 0; color: var(--muted); font-size: 11.5px; }
.chart-card svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart-empty { margin: 8px 0 4px; color: var(--muted); font-size: 12px; }
.grid { stroke: #e8edf4; stroke-width: 1; }
.axis-y { fill: #94a3b8; font-size: 10px; text-anchor: end; dominant-baseline: middle; }
.axis-x { fill: #94a3b8; font-size: 10px; text-anchor: middle; }
.chart-note { margin: 13px 0 0; padding-top: 10px; border-top: 1px solid #f1f5f9; color: var(--muted); font-size: 11px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--muted); font-size: 11px; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.legend-line { display: inline-block; width: 18px; height: 3px; border-radius: 999px; background: var(--c); }
.legend-line.dashed { background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 7px); }
.donut-body { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.donut-wrap { flex: 0 0 190px; max-width: 190px; margin: 0 auto; }
.donut-total { fill: var(--ink); font-size: 16px; font-weight: 750; font-variant-numeric: tabular-nums; }
.donut-caption { fill: var(--muted); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.legend-list { list-style: none; margin: 0; padding: 0; flex: 1 1 190px; min-width: 0; }
.legend-list li { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 11.5px; }
.legend-list li:last-child { border-bottom: 0; }
.legend-name { color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-value { color: var(--muted); font-variant-numeric: tabular-nums; }
.legend-pct { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.bars { display: grid; gap: 12px; margin-top: 4px; }
.bar-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
.bar-label { display: inline-flex; align-items: center; gap: 7px; color: var(--ink); font-size: 12px; font-weight: 600; }
.bar-amount { color: var(--ink); font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bar-track { height: 10px; border-radius: 999px; background: var(--level-1); overflow: hidden; }
.bar-fill { display: block; height: 100%; border-radius: 999px; min-width: 2px; }
.breakdown { margin-top: 26px; }
.breakdown h2 { margin: 0 0 11px; font-size: 18px; letter-spacing: -.01em; }
.table-wrap { background: var(--surface); border: 1px solid var(--hairline); border-radius: 18px; overflow-x: auto; box-shadow: 0 18px 40px -34px rgba(15, 23, 42, .4); }
table { width: 100%; border-collapse: collapse; min-width: 620px; }
th, td { padding: 11px 14px; border-bottom: 1px solid var(--hairline); text-align: left; vertical-align: middle; }
thead th { position: sticky; top: 0; background: #f8fafc; color: var(--muted); font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; z-index: 1; }
tbody tr:nth-child(even) { background: #fbfcff; }
tbody tr:last-child td { border-bottom: 0; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td.center, th.center { text-align: center; }
td.category { font-weight: 550; }
td.date { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 650; line-height: 1.4; white-space: nowrap; }
.pill-income { background: #e8f7ef; color: #006c49; }
.pill-expense { background: #fdecef; color: #bc0b3b; }
.pill-transfer { background: #eef0ff; color: #4648d4; }
.negative { color: var(--tertiary); }
.note { margin-top: 24px; color: var(--muted); font-size: 12px; }
.footer { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline); display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 11px; }
@media (max-width: 760px) {
  .page { padding: 22px 14px 40px; }
  .hero { padding: 22px 20px; border-radius: 20px; }
  .hero h1 { font-size: 26px; }
  .charts { grid-template-columns: 1fr; }
  .chart-card.wide { grid-column: auto; }
  .donut-wrap { flex-basis: 160px; max-width: 160px; }
  .table-wrap { border-radius: 14px; }
  .axis-x, .axis-y { font-size: 16px; }
  .donut-total { font-size: 22px; }
  .donut-caption { font-size: 12px; }
}
@media print {
  @page { size: A4; margin: 13mm; }
  body { background: #ffffff; font-size: 10.5px; }
  .page { max-width: none; padding: 0; }
  .hero { border-radius: 12px; padding: 18px 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hero::after { display: none; }
  .cards { gap: 8px; margin: 12px 0 0; }
  .card { box-shadow: none; padding: 10px 12px; }
  .card dd { font-size: 16px; }
  .charts { gap: 8px; }
  .chart-card { box-shadow: none; border-radius: 12px; padding: 10px 12px; break-inside: avoid; page-break-inside: avoid; }
  .breakdown { margin-top: 16px; }
  .table-wrap { border-radius: 10px; overflow: visible; box-shadow: none; }
  thead { display: table-header-group; }
  table { min-width: 0; }
  th, td { padding: 6px 8px; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .note, .footer { font-size: 9.5px; }
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

	const charts = report.charts?.length
		? `<section aria-label="Gráficos del informe">
			<div class="section-heading">
				<h2>Gráficos del informe</h2>
				<p>${escapeHtml(report.subtitle ?? '')}</p>
			</div>
			<div class="charts">${report.charts.map(renderChart).join('')}</div>
		</section>`
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
							.map((column, index) => renderCell(row[index], currency, column))
							.join('')}</tr>`
				)
				.join('');

			return `<section class="breakdown">${
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
    <div class="hero-main">
      <p class="brand"><span class="logo">F</span><span>FinFlow · Informe financiero</span></p>
      <h1>${title}</h1>
      ${report.subtitle ? `<p class="subtitle">${escapeHtml(report.subtitle)}</p>` : ''}
    </div>
    <div class="stamp">
      ${report.profileName ? `<p class="profile">${escapeHtml(report.profileName)}</p>` : ''}
      <p class="date">${escapeHtml(stamp)}</p>
    </div>
  </header>
  ${summary}
  ${charts}
  ${sections}
  <p class="note">${escapeHtml(report.note ?? 'Documento generado por FinFlow.')}</p>
  <div class="footer"><span>FinFlow · Informe financiero</span><span>${escapeHtml(stamp)}</span></div>
</main>
<script>
(function () {
  function fitCharts() {
    document.querySelectorAll('svg[data-chart]').forEach(function (svg) {
      var view = svg.viewBox.baseVal;
      if (!view || !view.width) return;
      var scale = svg.getBoundingClientRect().width / view.width;
      if (!scale) return;
      svg.querySelectorAll('text').forEach(function (text) {
        var base = text.classList.contains('donut-total') ? 18 : text.classList.contains('donut-caption') ? 10 : 12;
        text.style.fontSize = (base / scale) + 'px';
      });
      svg.querySelectorAll('circle').forEach(function (circle) {
        circle.setAttribute('r', String(3 / scale));
      });
      svg.querySelectorAll('path[stroke]').forEach(function (path) {
        path.style.strokeWidth = (2.2 / scale) + 'px';
      });
    });
  }
  fitCharts();
  window.addEventListener('resize', fitCharts);
  window.addEventListener('beforeprint', fitCharts);
})();
</script>
</body>
</html>`;
}
