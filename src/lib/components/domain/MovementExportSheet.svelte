<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';
	import { formatFullDate, formatMonthName, toISODate } from '#lib/utils/dates';
	import { downloadReport } from '#lib/utils/export';
	import { TRANSACTION_TYPE_LABELS } from '#lib/utils/labels';
	import { formatMoney, formatPercent, sumAmounts } from '#lib/utils/money';
	import type { ReportChart, ReportDocument, ReportFormat } from '#lib/utils/report';
	import type { TransactionItem } from '#lib/types/domain';

	interface Props {
		open?: boolean;
		/** Clave `YYYY-MM` o `null` para todo el historial. */
		month: string | null;
		label: string;
		total: number;
		currency: string;
		profileName: string;
		/** Parámetros de la vista (mes y filtros activos). */
		scopeQuery: string;
		hasFilters: boolean;
	}

	let {
		open = $bindable(false),
		month,
		label,
		total,
		currency,
		profileName,
		scopeQuery,
		hasFilters
	}: Props = $props();

	interface ExportPayload {
		items: TransactionItem[];
		total: number;
		truncated: boolean;
	}

	const FORMATS: Array<{
		value: ReportFormat;
		label: string;
		description: string;
		icon: string;
		tone: string;
	}> = [
		{
			value: 'pdf',
			label: 'PDF',
			description: 'Informe con resumen y tabla, listo para imprimir.',
			icon: 'picture_as_pdf',
			tone: 'bg-tertiary/10 text-tertiary'
		},
		{
			value: 'xlsx',
			label: 'Excel',
			description: 'Libro .xlsx con montos numéricos y formato.',
			icon: 'table_view',
			tone: 'bg-primary/10 text-primary'
		},
		{
			value: 'csv',
			label: 'CSV',
			description: 'Datos planos compatibles con cualquier hoja de cálculo.',
			icon: 'grid_on',
			tone: 'bg-secondary/10 text-secondary'
		},
		{
			value: 'html',
			label: 'HTML estilizado',
			description: 'Página autocontenida con el diseño de FinFlow.',
			icon: 'code',
			tone: 'bg-amber-500/12 text-amber-700'
		}
	];

	/** Debe coincidir con el tope del endpoint de exportación. */
	const MAX_ROWS = 5000;

	let busy = $state<ReportFormat | null>(null);
	let error = $state('');

	$effect(() => {
		if (!open) {
			busy = null;
			error = '';
		}
	});

	function isExportPayload(value: unknown): value is ExportPayload {
		if (typeof value !== 'object' || value === null) return false;
		const data = value as Record<string, unknown>;
		return (
			Array.isArray(data.items) &&
			typeof data.total === 'number' &&
			typeof data.truncated === 'boolean'
		);
	}

	async function loadItems(): Promise<ExportPayload> {
		const response = await fetch(`/movimientos/exportar?${scopeQuery}`, {
			headers: { accept: 'application/json' }
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const payload: unknown = await response.json();
		if (!isExportPayload(payload)) throw new Error('Respuesta inválida');
		return payload;
	}

	const CHART_COLORS = [
		'#006c49',
		'#4648d4',
		'#bc0b3b',
		'#b45309',
		'#0e7490',
		'#7c3aed',
		'#64748b'
	];

	/** Gráficos del informe con lo que realmente se exporta. */
	function buildCharts(items: TransactionItem[], income: number, expense: number): ReportChart[] {
		if (income === 0 && expense === 0) return [];

		const balance = income - expense;
		const balanceShare = income > 0 ? (balance / income) * 100 : null;
		const balanceNote =
			balanceShare === null
				? `Balance del periodo: ${formatMoney(balance, currency)}`
				: `Balance del periodo: ${formatMoney(balance, currency)} · ${formatPercent(balanceShare, 0)} de los ingresos`;

		const charts: ReportChart[] = [
			{
				kind: 'bars',
				title: 'Ingresos y gastos',
				subtitle: 'Comparativa del periodo',
				currency,
				items: [
					{ label: 'Ingresos', value: income, color: '#006c49' },
					{ label: 'Gastos', value: expense, color: '#bc0b3b' }
				],
				note: balanceNote
			}
		];

		const byCategory = new Map<string, { value: number; color?: string }>();
		for (const item of items) {
			if (item.type !== 'expense') continue;
			const name = item.categoryName ?? 'Sin categoría';
			const current = byCategory.get(name) ?? { value: 0, color: item.categoryColor ?? undefined };
			current.value += item.amount;
			byCategory.set(name, current);
		}

		const categories = [...byCategory.entries()].sort((a, b) => b[1].value - a[1].value);
		if (categories.length > 0) {
			const top = categories.slice(0, 6);
			const rest = categories.slice(6);
			const donutItems = top.map(([name, entry], index) => ({
				label: name,
				value: entry.value,
				color: entry.color ?? CHART_COLORS[index % CHART_COLORS.length]
			}));

			if (rest.length > 0) {
				donutItems.push({
					label: rest.length === 1 ? rest[0][0] : 'Otras categorías',
					value: rest.reduce((sum, [, entry]) => sum + entry.value, 0),
					color: rest.length === 1 ? (rest[0][1].color ?? '#94a3b8') : '#94a3b8'
				});
			}

			charts.push({
				kind: 'donut',
				title: 'Gastos por categoría',
				subtitle: 'Distribución del periodo',
				currency,
				items: donutItems,
				centerLabel: 'Gastos'
			});
		}

		if (month) {
			const [year, monthNumber] = month.split('-').map(Number);
			const days = new Date(year, monthNumber, 0).getDate();
			const dailyIncome = Array<number>(days).fill(0);
			const dailyExpense = Array<number>(days).fill(0);

			for (const item of items) {
				const day = new Date(item.occurredAt).getDate();
				if (day < 1 || day > days) continue;
				if (item.type === 'income') dailyIncome[day - 1] += item.amount;
				else if (item.type === 'expense') dailyExpense[day - 1] += item.amount;
			}

			charts.push({
				kind: 'line',
				title: 'Evolución diaria',
				subtitle: 'Ingresos y gastos por día',
				currency,
				labels: Array.from({ length: days }, (_, index) => String(index + 1)),
				series: [
					{ label: 'Ingresos', values: dailyIncome, color: '#006c49' },
					{ label: 'Gastos', values: dailyExpense, color: '#bc0b3b' }
				]
			});
		} else {
			const byMonth = new Map<string, { income: number; expense: number }>();
			for (const item of items) {
				const key = toISODate(new Date(item.occurredAt)).slice(0, 7);
				const bucket = byMonth.get(key) ?? { income: 0, expense: 0 };
				if (item.type === 'income') bucket.income += item.amount;
				else if (item.type === 'expense') bucket.expense += item.amount;
				byMonth.set(key, bucket);
			}

			const keys = [...byMonth.keys()].sort().slice(-12);
			if (keys.length > 1) {
				charts.push({
					kind: 'line',
					title: 'Evolución mensual',
					subtitle: 'Últimos periodos con actividad',
					currency,
					labels: keys.map(
						(key) => `${formatMonthName(`${key}-01`).slice(0, 3)} ${key.slice(2, 4)}`
					),
					series: [
						{
							label: 'Ingresos',
							values: keys.map((key) => byMonth.get(key)?.income ?? 0),
							color: '#006c49'
						},
						{
							label: 'Gastos',
							values: keys.map((key) => byMonth.get(key)?.expense ?? 0),
							color: '#bc0b3b'
						}
					]
				});
			}
		}

		return charts;
	}

	function buildReport(items: TransactionItem[]): ReportDocument {
		const income = sumAmounts(
			items.filter((item) => item.type === 'income').map((item) => item.amount)
		);
		const expense = sumAmounts(
			items.filter((item) => item.type === 'expense').map((item) => item.amount)
		);
		const notes = hasFilters
			? 'Exportación filtrada según los criterios de la pestaña Movimientos.'
			: 'Incluye todos los movimientos del periodo seleccionado.';

		return {
			title: 'Movimientos',
			subtitle: label,
			profileName,
			currency,
			summary: [
				['Movimientos', String(items.length)],
				['Ingresos', formatMoney(income, currency)],
				['Gastos', formatMoney(expense, currency)],
				['Balance', formatMoney(income - expense, currency)]
			],
			charts: buildCharts(items, income, expense),
			sections: [
				{
					heading: 'Detalle de movimientos',
					columns: [
						{ label: 'Fecha', kind: 'date' },
						{ label: 'Concepto' },
						{ label: 'Cuenta' },
						{ label: 'Categoría', kind: 'category' },
						{ label: 'Tipo', kind: 'type' },
						{ label: 'Monto', align: 'right' },
						{ label: 'Moneda', align: 'center' }
					],
					rows: items.map((item) => [
						formatFullDate(item.occurredAt),
						item.concept,
						item.accountName,
						item.categoryName ?? 'Sin categoría',
						TRANSACTION_TYPE_LABELS[item.type],
						{ value: item.amount, format: 'money', currency: item.currency },
						item.currency
					])
				}
			],
			fileName: `finflow-movimientos-${month ?? 'historial'}`,
			note: `${notes} Documento generado por FinFlow.`
		};
	}

	async function exportAs(format: ReportFormat): Promise<void> {
		if (busy || total === 0) return;

		busy = format;
		error = '';

		try {
			const payload = await loadItems();

			if (payload.items.length === 0) {
				error = 'No hay movimientos que coincidan con los filtros.';
				return;
			}

			await downloadReport(format, buildReport(payload.items));
			notifySuccess(
				`${format === 'xlsx' ? 'Excel' : format.toUpperCase()} descargado (${payload.items.length} movimientos)`
			);
			open = false;
		} catch (cause) {
			console.error('[finflow] export movements:', cause);
			error = 'No pudimos generar la exportación. Inténtalo de nuevo.';
			notifyError('No pudimos generar la exportación.');
		} finally {
			busy = null;
		}
	}
</script>

<Sheet title="Exportar movimientos" subtitle={label} bind:open>
	<div class="space-y-4 pb-2">
		<div class="rounded-2xl bg-level-1/70 p-3">
			<p class="text-label font-semibold text-ink">
				{total}
				{total === 1 ? 'movimiento' : 'movimientos'}
			</p>
			<p class="mt-0.5 text-body-sm text-muted">
				{hasFilters
					? 'Se aplican los filtros activos de la pestaña.'
					: 'Todos los movimientos del periodo seleccionado.'}
			</p>
			{#if total > MAX_ROWS}
				<p class="mt-2 flex items-start gap-1.5 text-body-sm text-amber-700">
					<Icon name="info" size={16} class="mt-0.5 shrink-0" />
					Se exportarán los primeros {MAX_ROWS} de {total} movimientos.
				</p>
			{/if}
			{#if error}
				<p class="mt-2 flex items-start gap-1.5 text-body-sm text-tertiary" role="alert">
					<Icon name="error" size={16} class="mt-0.5 shrink-0" />
					{error}
				</p>
			{/if}
		</div>

		<div class="grid gap-2">
			{#each FORMATS as option (option.value)}
				<button
					type="button"
					class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-3 py-3 text-left transition hover:bg-level-1/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={busy !== null || total === 0}
					aria-busy={busy === option.value}
					onclick={() => exportAs(option.value)}
				>
					<span class="flex size-10 shrink-0 items-center justify-center rounded-xl {option.tone}">
						{#if busy === option.value}
							<Icon name="progress_activity" size={20} class="animate-spin" />
						{:else}
							<Icon name={option.icon} size={20} />
						{/if}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-label font-semibold text-ink">{option.label}</span>
						<span class="block text-body-sm text-muted">{option.description}</span>
					</span>
					<Icon name="chevron_right" size={18} class="shrink-0 text-muted-soft" />
				</button>
			{/each}
		</div>

		{#if total === 0}
			<p class="text-center text-body-sm text-muted">
				No hay movimientos para exportar en este periodo.
			</p>
		{/if}
	</div>
</Sheet>
