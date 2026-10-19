<script lang="ts">
	import { page } from '$app/state';
	import DonutChart from '#lib/components/charts/DonutChart.svelte';
	import LineChart from '#lib/components/charts/LineChart.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import SegmentedLinks from '#lib/components/ui/SegmentedLinks.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';
	import { cn } from '#lib/utils/cn';
	import { formatDayMonth, formatMonthName } from '#lib/utils/dates';
	import { csvNumber, downloadCsv, downloadPdf } from '#lib/utils/export';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { AnalyticsInsight } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const analytics = $derived(data.analytics);
	const currency = $derived(data.currency);
	const delta = $derived(analytics.deltaPercent);

	const periodLabel = $derived(
		data.preset === 'month'
			? formatMonthName(data.range.from, true)
			: data.preset === 'year'
				? String(new Date(data.range.from).getFullYear())
				: `${formatDayMonth(data.range.from)} – ${formatDayMonth(data.range.to)}`
	);

	const categories = $derived(analytics.categories.filter((category) => category.amount > 0));

	const savings = $derived(analytics.previousTotal - analytics.total);

	const insight = $derived.by(() => {
		if (analytics.previousTotal <= 0) {
			return analytics.total > 0
				? `Este periodo registraste ${formatMoney(analytics.total, currency)} en gastos.`
				: 'Aún no hay gastos en este periodo.';
		}
		if (savings > 0) {
			return `¡Excelente control! Has gastado ${formatMoney(savings, currency)} menos que el periodo previo (${formatMoney(analytics.previousTotal, currency)}).`;
		}
		if (savings < 0) {
			return `Tus gastos subieron ${formatMoney(Math.abs(savings), currency)} respecto al periodo previo (${formatMoney(analytics.previousTotal, currency)}).`;
		}
		return 'Tus gastos se mantienen igual que en el periodo previo.';
	});

	const lineSeries = $derived([
		{
			label: `${data.range.label} (${formatMoney(analytics.total, currency)})`,
			color: 'var(--color-primary)',
			values: analytics.series.map((point) => point.current)
		},
		{
			label: `${data.range.previousLabel} (${formatMoney(analytics.previousTotal, currency)})`,
			color: 'var(--color-outline-variant)',
			values: analytics.series.map((point) => point.previous),
			dashed: true
		}
	]);

	const axisLabels = $derived.by(() => {
		const points = analytics.series;
		const last = points.length - 1;
		const step = Math.max(1, Math.ceil(points.length / 5));
		const labeled = new Set<number>();

		for (let index = 0; index <= last; index += step) labeled.add(index);

		const previousLabel = Math.max(...labeled);
		if (last - previousLabel >= step / 2) labeled.add(last);

		return points.map((point, index) => (labeled.has(index) ? formatDayMonth(point.date) : ''));
	});

	const donutSegments = $derived(
		categories.map((category) => ({
			id: category.id,
			label: category.name,
			value: category.amount,
			color: category.color
		}))
	);

	function budgetShare(categoryId: string): number | null {
		const row = analytics.budgets.find((budget) => budget.id === categoryId);
		return row ? row.share : null;
	}

	function decreasePercent(insight: AnalyticsInsight | null): number {
		if (!insight || insight.amount >= 0) return 0;
		const previous = insight.currentAmount + Math.abs(insight.amount);
		return previous > 0 ? (Math.abs(insight.amount) / previous) * 100 : 0;
	}

	const monthShort = $derived(
		formatMonthName(data.range.from).slice(0, 3).replace(/^./, (letter) => letter.toUpperCase())
	);

	function withParams(periodo: string): string {
		const params = new URLSearchParams(page.url.searchParams.toString());
		params.set('periodo', periodo);
		return `/metricas?${params.toString()}`;
	}

	const csvRows = $derived<Array<Array<string | number>>>([
		['Categoría', 'Monto', 'Periodo anterior', 'Variación', '% del total'],
		...categories.map((category) => [
			category.name,
			csvNumber(category.amount),
			csvNumber(category.previousAmount),
			csvNumber(category.delta),
			csvNumber(category.share)
		])
	]);

	function exportCsv(): void {
		try {
			downloadCsv(`finflow-informe-${data.range.from}.csv`, csvRows);
			notifySuccess('Informe CSV descargado');
		} catch (error) {
			console.error('[finflow] csv export:', error);
			notifyError('No pudimos generar el CSV.');
		}
	}

	async function exportPdf(): Promise<void> {
		try {
			await downloadPdf({
				title: 'Informe financiero',
				subtitle: periodLabel,
				summary: [
					['Gasto total', formatMoney(analytics.total, currency)],
					['Ingresos', formatMoney(analytics.incomeTotal, currency)],
					['Periodo anterior', formatMoney(analytics.previousTotal, currency)],
					['Variación', formatPercent(delta, 1)]
				],
				head: ['Categoría', 'Monto', 'Anterior', 'Variación', '% total'],
				body: categories.map((category) => [
					category.name,
					formatMoney(category.amount, currency),
					formatMoney(category.previousAmount, currency),
					formatMoney(category.delta, currency),
					`${category.share.toFixed(1)}%`
				]),
				fileName: `finflow-informe-${data.range.from}.pdf`
			});
			notifySuccess('Informe PDF descargado');
		} catch (error) {
			console.error('[finflow] pdf export:', error);
			notifyError('No pudimos generar el PDF.');
		}
	}
</script>

<div class="space-y-4 px-4 pt-4 pb-2">
	<SegmentedLinks
		value={data.preset}
		options={[
			{ value: 'week', label: 'Semana', href: withParams('week') },
			{
				value: 'month',
				label: `Mes (${monthShort})`,
				href: withParams('month')
			},
			{ value: 'quarter', label: 'Trimestre', href: withParams('quarter') },
			{ value: 'year', label: 'Año', href: withParams('year') }
		]}
	/>

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<header class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-body text-muted">Gasto total acumulado</p>
				<p class="mt-1 flex items-baseline gap-1.5">
					<span class="tnum text-amount font-bold text-ink">{formatMoney(analytics.total)}</span>
					<span class="text-body-sm font-medium text-muted">{currency}</span>
				</p>
			</div>

			<span
				class={cn(
					'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold',
					delta <= 0 ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
				)}
			>
				<Icon name={delta <= 0 ? 'trending_down' : 'trending_up'} size={15} />
				{formatPercent(Math.abs(delta), 1)}
			</span>
		</header>

		<p class="mt-3 flex gap-2 rounded-xl bg-primary/8 px-3 py-2.5 text-body-sm text-on-surface-variant">
			<Icon name="auto_awesome" size={18} class="mt-0.5 shrink-0 text-primary" />
			<span>{insight}</span>
		</p>

		<div class="mt-3 -mx-1">
			<LineChart series={lineSeries} labels={axisLabels} {currency} height={165} />
		</div>
	</section>

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<header class="flex items-center justify-between gap-2">
			<h2 class="text-title-sm text-ink">Distribución de Gastos</h2>
			<span class="rounded-full bg-level-1 px-2.5 py-1 text-label-sm font-medium text-on-surface-variant">
				{categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
			</span>
		</header>

		<div class="mt-4">
			<DonutChart
				segments={donutSegments}
				centerLabel="Categoría top"
				centerValue={analytics.topCategory ? formatPercent(analytics.topCategory.share, 0) : '—'}
				centerCaption={analytics.topCategory?.name}
				{currency}
			/>
		</div>
	</section>

	<section class="space-y-3">
		<header class="flex items-center gap-2">
			<h2 class="text-title-md text-ink">Análisis: dónde gastas más y menos</h2>
		</header>

		{#if analytics.topIncrease}
			<div class="rounded-2xl bg-tertiary/8 p-3.5">
				<div class="flex items-start gap-3">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-white">
						<Icon name="trending_up" size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-label-sm font-semibold tracking-wide text-tertiary uppercase">
							Mayor gasto registrado
						</p>
						<p class="text-title-sm text-ink">{analytics.topIncrease.name}</p>
						<p class="mt-0.5 text-body-sm text-on-surface-variant">
							Gastaste {formatMoney(analytics.topIncrease.currentAmount, currency)} este periodo:
							{formatMoney(analytics.topIncrease.amount, currency)} más que en el periodo anterior.
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if analytics.topDecrease}
			<div class="rounded-2xl bg-primary/8 p-3.5">
				<div class="flex items-start gap-3">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
						<Icon name="savings" size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<p class="text-label-sm font-semibold tracking-wide text-primary uppercase">
								Mayor reducción
							</p>
							<span class="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-label-sm font-semibold text-primary">
								{#if decreasePercent(analytics.topDecrease) > 0}
									−{formatPercent(decreasePercent(analytics.topDecrease), 0)}
								{:else}
									Nuevo
								{/if}
							</span>
						</div>
						<p class="text-title-sm text-ink">{analytics.topDecrease.name}</p>
						<p class="mt-0.5 text-body-sm text-on-surface-variant">
							Ahorraste {formatMoney(Math.abs(analytics.topDecrease.amount), currency)} frente al periodo
							anterior en esta categoría.
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if !analytics.topIncrease && !analytics.topDecrease}
			<div class="rounded-2xl border border-dashed border-outline-variant p-4 text-center text-body-sm text-muted">
				Registra gastos en dos periodos seguidos para ver comparativas.
			</div>
		{/if}
	</section>

	<section class="space-y-2.5">
		<header class="flex items-end justify-between gap-2">
			<h2 class="text-title-md text-ink">Desglose comparativo</h2>
			<span class="text-label-sm font-semibold tracking-wide text-muted uppercase">
				vs {data.range.previousLabel}
			</span>
		</header>

		<div class="divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
			{#each categories as category (category.id)}
				{@const share = budgetShare(category.id)}
				<div class="py-3">
					<div class="flex items-center gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full"
							style="background-color:color-mix(in srgb, {category.color} 14%, transparent);color:{category.color}"
						>
							<Icon name={category.icon} size={18} />
						</span>

						<div class="min-w-0 flex-1">
							<p class="truncate text-label font-semibold text-ink">{category.name}</p>
							<p class="text-body-sm text-muted">
								{share !== null
									? `${share.toFixed(0)}% de tu presupuesto`
									: `${category.share.toFixed(0)}% del total gastado`}
							</p>
						</div>

						<div class="shrink-0 text-right">
							<p class="tnum text-label font-semibold text-ink">
								{formatMoney(category.amount, currency)}
							</p>
							<p
								class="flex items-center justify-end gap-0.5 text-label-sm font-medium"
								class:text-tertiary={category.delta > 0}
								class:text-primary={category.delta < 0}
								class:text-muted={category.delta === 0}
							>
								{#if category.delta > 0}
									<Icon name="arrow_upward" size={13} />
								{:else if category.delta < 0}
									<Icon name="arrow_downward" size={13} />
								{:else}
									<Icon name="remove" size={13} />
								{/if}
								{formatMoney(Math.abs(category.delta), currency)}
							</p>
						</div>
					</div>

					<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-level-1" aria-hidden="true">
						<div
							class="h-full rounded-full"
							style="width:{Math.min(100, share ?? category.share)}%;background-color:{category.color}"
						></div>
					</div>
				</div>
			{:else}
				<p class="py-6 text-center text-body-sm text-muted">Sin gastos registrados en este periodo.</p>
			{/each}
		</div>
	</section>

	<section class="rounded-2xl bg-secondary/8 p-4">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
				<Icon name="download" size={20} />
			</span>
			<div class="min-w-0">
				<p class="text-title-sm text-ink">Descargar informe</p>
				<p class="text-body-sm text-muted">
					Resumen contable listo para tus registros o declaraciones.
				</p>
			</div>
		</div>

		<div class="mt-3 grid grid-cols-2 gap-2">
			<button type="button" class={buttonClass('outline', 'md', true)} onclick={exportPdf}>
				<Icon name="picture_as_pdf" size={18} class="text-tertiary" />
				Informe PDF
			</button>
			<button type="button" class={buttonClass('outline', 'md', true)} onclick={exportCsv}>
				<Icon name="table_view" size={18} class="text-primary" />
				Datos CSV
			</button>
		</div>
	</section>
</div>
