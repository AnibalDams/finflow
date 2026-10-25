<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import { cn } from '#lib/utils/cn';
	import { budgetTone } from '#lib/utils/finance';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { AnalyticsBudgetRow } from '#lib/types/domain';

	interface Props {
		limit: number;
		spent: number;
		used: number;
		remaining: number;
		daysLeft: number;
		currency: string;
		categories?: AnalyticsBudgetRow[];
		detailed?: boolean;
		class?: string;
	}

	let {
		limit,
		spent,
		used,
		remaining,
		daysLeft,
		currency,
		categories = [],
		detailed = false,
		class: className = ''
	}: Props = $props();

	const tone = $derived(budgetTone(used));

	function barTone(): 'primary' | 'warning' | 'tertiary' {
		if (tone === 'danger') return 'tertiary';
		if (tone === 'warning') return 'warning';
		return 'primary';
	}

	const activeCategories = $derived(categories.filter((category) => category.budget > 0));
</script>

<section
	class={cn(
		'rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card',
		detailed && 'p-5',
		className
	)}
	aria-label="Presupuesto mensual"
>
	<header class="flex items-start justify-between gap-3">
		<div class="flex items-center gap-2.5">
			<span
				class="flex size-9 items-center justify-center rounded-full bg-secondary/12 text-secondary"
			>
				<Icon name="pie_chart" size={19} filled />
			</span>
			<div>
				<h2 class="text-title-sm whitespace-nowrap text-ink">Presupuesto mensual</h2>
				<p class="text-body-sm text-muted">Consumo del ciclo actual</p>
			</div>
		</div>
		{#if detailed}
			<span
				class="shrink-0 rounded-full bg-level-1 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant"
			>
				{daysLeft} días
			</span>
		{:else}
			<span class="text-label-sm font-semibold text-secondary">
				{formatPercent(used)} usado
			</span>
		{/if}
	</header>

	{#if limit > 0}
		{#if detailed}
			<div class="mt-4">
				<div class="flex items-end justify-between gap-3">
					<div>
						<p class="text-label-sm text-muted">Gastado</p>
						<p class="tnum text-title-md font-bold text-ink">{formatMoney(spent, currency)}</p>
					</div>
					<div class="text-right">
						<p class="text-label-sm text-muted">Límite</p>
						<p class="tnum text-label font-semibold text-on-surface">
							{formatMoney(limit, currency)}
						</p>
					</div>
				</div>

				<ProgressBar
					value={used}
					tone={barTone()}
					size="md"
					class="mt-3"
					label="Uso del presupuesto mensual"
				/>

				<div class="mt-2 flex items-center justify-between gap-2 text-body-sm">
					<span class={cn('font-semibold', used >= 100 ? 'text-tertiary' : 'text-primary')}>
						{formatPercent(used)} consumido
					</span>
					<span class="text-muted">
						Disponible
						<span class="tnum font-semibold text-ink">{formatMoney(remaining, currency)}</span>
					</span>
				</div>
			</div>

			{#if activeCategories.length > 0}
				<div class="mt-4 space-y-2.5 border-t border-hairline pt-4">
					{#each activeCategories as category (category.id)}
						<div>
							<div class="flex items-center justify-between gap-3 text-body-sm">
								<span class="flex min-w-0 items-center gap-2">
									<span
										class="size-2.5 shrink-0 rounded-full"
										style="background-color:{category.color}"
										aria-hidden="true"
									></span>
									<span class="truncate text-on-surface">{category.name}</span>
								</span>
								<span class="shrink-0 tnum text-label font-semibold text-ink">
									{formatMoney(category.spent, currency)}
									<span class="font-normal text-muted"
										>/ {formatMoney(category.budget, currency)}</span
									>
								</span>
							</div>
							<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-level-1" aria-hidden="true">
								<div
									class="h-full rounded-full"
									style="width:{Math.min(100, category.share)}%;background-color:{category.color}"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mt-4 border-t border-hairline pt-4 text-body-sm text-muted">
					Aún no asignas límites por categoría.
				</p>
			{/if}

			<a
				href="/cuentas?tab=presupuestos"
				class="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-level-1 text-label font-semibold text-ink transition hover:bg-surface-container"
			>
				<Icon name="tune" size={17} />
				Ajustar límites de categoría
			</a>
		{:else}
			<ProgressBar
				value={used}
				tone={barTone()}
				size="md"
				class="mt-3"
				label="Uso del presupuesto mensual"
			/>

			<div
				class="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3 text-body-sm"
			>
				<span class="text-muted">
					Límite: <span class="tnum font-semibold text-ink">{formatMoney(limit, currency)}</span>
				</span>
				<span class="flex items-center gap-1 text-muted">
					<Icon name="schedule" size={15} />
					Quedan
					<span class="tnum font-semibold text-ink">{formatMoney(remaining, currency)}</span>
					({daysLeft}
					{daysLeft === 1 ? 'día' : 'días'})
				</span>
			</div>
		{/if}
	{:else}
		<div class="mt-4 rounded-xl bg-level-1/70 p-3 text-body-sm text-on-surface-variant">
			Define un presupuesto mensual global en
			<a href="/ajustes" class="font-semibold text-secondary underline">Ajustes</a>
			para ver tu avance aquí.
		</div>
	{/if}
</section>
