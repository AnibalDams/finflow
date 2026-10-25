<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BudgetWidget from '#lib/components/dashboard/BudgetWidget.svelte';
	import LineChart from '#lib/components/charts/LineChart.svelte';
	import Sparkline from '#lib/components/charts/Sparkline.svelte';
	import TransactionsTable from '#lib/components/domain/TransactionsTable.svelte';
	import TransactionRow from '#lib/components/domain/TransactionRow.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import OptionSheet from '#lib/components/ui/OptionSheet.svelte';
	import SegmentedLinks from '#lib/components/ui/SegmentedLinks.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import {
		addDays,
		formatCountdown,
		formatDayMonth,
		formatMonthName,
		parseISODate
	} from '#lib/utils/dates';
	import { cn } from '#lib/utils/cn';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const profile = $derived(data.profile);
	const firstName = $derived(profile.fullName.trim().split(/\s+/)[0] ?? '');
	const selectedAccount = $derived(
		data.selectedAccountId === 'all'
			? null
			: (data.accounts.find((account) => account.id === data.selectedAccountId) ?? null)
	);

	const accountLabel = $derived(selectedAccount ? selectedAccount.name : 'Todas las cuentas');

	let accountSheetOpen = $state(false);
	let accountTrigger = $state<HTMLButtonElement | null>(null);

	const accountOptions = $derived([
		...data.accounts.map((account) => ({
			value: account.id,
			label: account.name,
			description: formatMoney(account.balance, account.currency),
			icon: account.icon
		})),
		{
			value: 'all',
			label: 'Todas las cuentas',
			description: 'Resumen consolidado',
			icon: 'apps'
		}
	]);

	function withParams(changes: Record<string, string | null>): string {
		const search = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(changes)) {
			if (value === null || value === 'all') search.delete(key);
			else search.set(key, value);
		}
		const query = search.toString();
		return `/${query ? `?${query}` : ''}`;
	}

	function selectAccount(value: string): void {
		// `all` es un valor válido del filtro (resumen consolidado): se conserva.
		const search = new URLSearchParams(page.url.searchParams.toString());
		search.set('cuenta', value);
		void goto(`/?${search.toString()}`, { reset: false });
	}

	const quickActions = [
		{
			label: 'Ingreso',
			icon: 'add_circle',
			href: '/movimientos/nuevo?tipo=income',
			tone: 'primary'
		},
		{
			label: 'Gasto',
			icon: 'remove_circle',
			href: '/movimientos/nuevo?tipo=expense',
			tone: 'tertiary'
		},
		{
			label: 'Transferir',
			icon: 'sync_alt',
			href: '/movimientos/nuevo?tipo=transfer',
			tone: 'secondary'
		},
		{
			label: 'Comprobante',
			icon: 'document_scanner',
			href: '/movimientos/nuevo?tipo=expense&comprobante=1',
			tone: 'ink'
		}
	] as const;

	const TONE_CLASS: Record<string, string> = {
		primary: 'text-primary',
		tertiary: 'text-tertiary',
		secondary: 'text-secondary',
		ink: 'text-ink'
	};

	const expenseShare = $derived(
		data.budget.limit > 0 ? (data.expense / data.budget.limit) * 100 : 0
	);

	const kpis = $derived([
		{
			label: 'Patrimonio neto',
			value: formatMoney(data.balance, data.currency),
			meta:
				data.delta === null
					? formatMonthName(data.monthStart)
					: `${data.delta >= 0 ? '+' : ''}${formatPercent(data.delta, 1)} vs mes anterior`,
			icon: 'account_balance',
			tone: 'primary' as const,
			progress: null
		},
		{
			label: 'Ingresos del mes',
			value: `+${formatMoney(data.income, data.currency)}`,
			meta: formatMonthName(data.monthStart, true),
			icon: 'south_west',
			tone: 'primary' as const,
			progress: null
		},
		{
			label: 'Gastos del mes',
			value: `−${formatMoney(data.expense, data.currency)}`,
			meta: `${formatPercent(expenseShare, 1)} del presupuesto`,
			icon: 'north_east',
			tone: 'tertiary' as const,
			progress: Math.min(100, expenseShare)
		},
		{
			label: 'Tasa de ahorro',
			value: formatPercent(data.savingsRate, 1),
			meta: `${formatMoney(data.net, data.currency)} netos este ciclo`,
			icon: 'savings',
			tone: 'secondary' as const,
			progress: data.savingsRate
		}
	]);

	const KPI_TONES = {
		primary: 'bg-primary/10 text-primary',
		tertiary: 'bg-tertiary/10 text-tertiary',
		secondary: 'bg-secondary/10 text-secondary'
	} as const;

	const cashflowSeries = $derived([
		{
			label: 'Ingresos',
			color: 'var(--color-primary)',
			values: data.cashflow.income
		},
		{
			label: 'Gastos',
			color: 'var(--color-tertiary)',
			values: data.cashflow.expense
		}
	]);

	const cashflowLabels = $derived.by(() => {
		const points = data.cashflow.income.length;
		const step = Math.max(1, Math.ceil(points / 6));
		const start = parseISODate(data.monthStart);
		return Array.from({ length: points }, (_, index) =>
			index % step === 0 || index === points - 1 ? formatDayMonth(addDays(start, index)) : ''
		);
	});

	/** Fechas completas punto a punto: alimentan el tooltip del gráfico. */
	const cashflowDates = $derived.by(() => {
		const start = parseISODate(data.monthStart);
		return Array.from({ length: data.cashflow.income.length }, (_, index) =>
			formatDayMonth(addDays(start, index))
		);
	});

	const goal = $derived(data.goalHighlight);
</script>

<div
	class="space-y-5 px-4 pt-4 lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-12 lg:gap-6 lg:space-y-0 lg:px-8 lg:pt-8 lg:pb-10"
>
	<header
		class="flex items-start justify-between gap-3 lg:col-span-12 lg:items-center lg:rounded-2xl lg:border lg:border-hairline/70 lg:bg-gradient-to-r lg:from-surface-container-high lg:via-surface-container lg:to-surface-container-low lg:p-6"
	>
		<div class="min-w-0">
			<h1 class="text-title-lg whitespace-nowrap text-ink lg:text-title-xl">
				Hola, {firstName} <span aria-hidden="true">👋</span>
			</h1>
			<p class="mt-0.5 text-body text-muted">
				{data.delta === null
					? `Resumen de ${formatMonthName(data.monthStart, true)}`
					: data.delta >= 0
						? 'Tu salud financiera va en verde'
						: 'Tus gastos crecieron este mes'}
			</p>
			<div class="mt-3 hidden flex-wrap items-center gap-2 lg:flex">
				<span
					class="rounded-full bg-primary-fixed/50 px-3 py-1 text-label-sm font-semibold tracking-wide text-on-primary-fixed-variant uppercase"
				>
					{formatMonthName(data.monthStart, true)}
				</span>
				<span
					class="flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-3 py-1 text-label-sm text-on-surface shadow-sm"
				>
					<span class="size-2 rounded-full bg-primary-container" aria-hidden="true"></span>
					{data.accounts.length}
					{data.accounts.length === 1 ? 'cuenta conectada' : 'cuentas conectadas'}
				</span>
				{#if data.budget.limit > 0}
					<span
						class="rounded-full bg-surface-container-lowest px-3 py-1 text-label-sm text-on-surface shadow-sm"
					>
						Presupuesto: <strong class="font-semibold">{formatPercent(data.budget.used)}</strong>
					</span>
				{/if}
			</div>
		</div>

		<button
			type="button"
			bind:this={accountTrigger}
			class="pressable relative flex shrink-0 items-center gap-1.5 rounded-full bg-level-1 py-2 pr-2 pl-3 transition hover:bg-surface-container lg:hidden"
			aria-haspopup="listbox"
			aria-expanded={accountSheetOpen}
			aria-label="Seleccionar cuenta"
			onclick={() => (accountSheetOpen = true)}
		>
			<Icon
				name={selectedAccount?.icon ?? 'account_balance_wallet'}
				size={17}
				class="text-primary"
			/>
			<span class="max-w-24 truncate text-label-sm font-semibold text-ink">{accountLabel}</span>
			<Icon name="expand_more" size={16} class="text-muted" />
		</button>
	</header>

	<OptionSheet
		bind:open={accountSheetOpen}
		title="Seleccionar cuenta"
		value={data.selectedAccountId}
		options={accountOptions}
		tone="primary"
		returnFocus={accountTrigger}
		onchange={selectAccount}
	/>

	<!-- Resumen móvil -->
	<section class="overflow-hidden rounded-3xl bg-inverse-surface p-5 shadow-hero lg:hidden">
		<div class="flex items-start justify-between gap-3">
			<p class="text-label-sm font-medium tracking-[0.14em] text-inverse-on-surface/60 uppercase">
				Balance disponible
			</p>

			{#if data.delta !== null}
				<span
					class="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-label-sm font-semibold text-primary-fixed"
				>
					<Icon name={data.delta >= 0 ? 'trending_up' : 'trending_down'} size={14} />
					{data.delta >= 0 ? '+' : ''}{formatPercent(data.delta, 1)}
				</span>
			{:else}
				<span class="rounded-full bg-white/8 px-2.5 py-1 text-label-sm text-inverse-on-surface/70">
					{formatMonthName(data.monthStart)}
				</span>
			{/if}
		</div>

		<p class="mt-1.5 flex items-baseline gap-1.5 tnum text-title-xl text-inverse-on-surface">
			{formatMoney(data.balance, data.currency)}
			<span class="text-body font-medium text-inverse-on-surface/50">{data.currency}</span>
		</p>

		<div class="-mx-1 mt-1">
			<Sparkline values={data.series} height={72} />
		</div>

		<div class="mt-3 grid grid-cols-2 gap-3">
			<div class="rounded-2xl bg-white/8 p-3">
				<div class="flex items-center gap-2">
					<span
						class="flex size-7 items-center justify-center rounded-full bg-primary/25 text-primary-fixed"
					>
						<Icon name="arrow_downward_alt" size={16} />
					</span>
					<span class="text-label-sm text-inverse-on-surface/60">Ingresos (mes)</span>
				</div>
				<p class="mt-1.5 tnum text-title-sm text-primary-fixed">
					+{formatMoney(data.income, data.currency)}
				</p>
			</div>

			<div class="rounded-2xl bg-white/8 p-3">
				<div class="flex items-center gap-2">
					<span
						class="flex size-7 items-center justify-center rounded-full bg-tertiary/25 text-tertiary-fixed"
					>
						<Icon name="arrow_upward_alt" size={16} />
					</span>
					<span class="text-label-sm text-inverse-on-surface/60">Gastos (mes)</span>
				</div>
				<p class="mt-1.5 tnum text-title-sm text-tertiary-fixed">
					−{formatMoney(data.expense, data.currency)}
				</p>
			</div>
		</div>
	</section>

	<!-- KPIs de escritorio -->
	<section
		class="hidden lg:col-span-12 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-4"
		aria-label="Indicadores del mes"
	>
		{#each kpis as kpi (kpi.label)}
			<article
				class="flex flex-col justify-between rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card"
			>
				<div class="flex items-center justify-between gap-2">
					<p class="text-label font-medium text-on-surface-variant">{kpi.label}</p>
					<span class="flex size-9 items-center justify-center rounded-xl {KPI_TONES[kpi.tone]}">
						<Icon name={kpi.icon} size={19} />
					</span>
				</div>
				<div class="mt-4">
					<p class="tnum text-title-lg font-bold tracking-tight text-ink">{kpi.value}</p>
					<p class="mt-1 text-body-sm text-muted">{kpi.meta}</p>
				</div>
				{#if kpi.progress !== null}
					<div class="mt-4 h-1.5 overflow-hidden rounded-full bg-level-1" aria-hidden="true">
						<div
							class={cn(
								'h-full rounded-full',
								kpi.tone === 'tertiary'
									? 'bg-tertiary'
									: kpi.tone === 'secondary'
										? 'bg-secondary'
										: 'bg-primary'
							)}
							style="width:{kpi.progress}%"
						></div>
					</div>
				{:else}
					<div class="mt-4 h-1.5" aria-hidden="true"></div>
				{/if}
			</article>
		{/each}
	</section>

	<nav class="grid grid-cols-4 gap-2 lg:hidden" aria-label="Acciones rápidas">
		{#each quickActions as action (action.label)}
			<a
				href={action.href}
				class="flex flex-col items-center gap-2 rounded-2xl py-1 transition active:scale-95"
			>
				<span
					class="flex size-12 items-center justify-center rounded-full border border-hairline bg-surface-container-lowest shadow-card {TONE_CLASS[
						action.tone
					]}"
				>
					<Icon name={action.icon} size={22} />
				</span>
				<span class="text-label-sm font-medium text-on-surface-variant">{action.label}</span>
			</a>
		{/each}
	</nav>

	<div class="lg:hidden">
		<BudgetWidget
			limit={data.budget.limit}
			spent={data.expense}
			used={data.budget.used}
			remaining={data.budget.remaining}
			daysLeft={data.budget.daysLeft}
			currency={data.profile.currency}
			categories={data.budgetCategories}
		/>
	</div>

	<div
		class="lg:col-span-12 lg:block lg:space-y-6 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6 xl:space-y-0"
	>
		<div class="min-w-0 space-y-5 xl:col-span-8 xl:space-y-6">
			<section
				class="hidden rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card lg:block"
			>
				<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-title-sm text-ink">Flujo de caja del mes</h2>
							<span
								class="material-symbols-outlined text-[16px] text-muted"
								aria-hidden="true"
								title="Ingresos y gastos acumulados del mes en curso">info</span
							>
						</div>
						<p class="text-body-sm text-muted">
							{formatMonthName(data.monthStart, true)} · Acumulado día a día
						</p>
					</div>
					<div class="flex items-center gap-3 rounded-lg bg-level-1/70 px-3 py-1.5">
						<span class="flex items-center gap-1.5 text-label-sm text-on-surface">
							<span class="size-2.5 rounded-full bg-primary-container"></span>
							Ingresos
						</span>
						<span class="flex items-center gap-1.5 text-label-sm text-on-surface">
							<span class="size-2.5 rounded-full bg-tertiary"></span>
							Gastos
						</span>
					</div>
				</header>

				<div class="mt-4">
					<LineChart
						series={cashflowSeries}
						labels={cashflowLabels}
						pointLabels={cashflowDates}
						currency={data.currency}
						height={260}
						differenceLabel="Flujo neto"
					/>
				</div>

				<div class="mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
					<div>
						<p class="text-label-sm text-muted">Ingresos</p>
						<p class="tnum text-label font-bold text-primary">
							+{formatMoney(data.income, data.currency)}
						</p>
					</div>
					<div>
						<p class="text-label-sm text-muted">Gastos</p>
						<p class="tnum text-label font-bold text-tertiary">
							−{formatMoney(data.expense, data.currency)}
						</p>
					</div>
					<div>
						<p class="text-label-sm text-muted">Flujo neto</p>
						<p class="tnum text-label font-bold text-ink">
							{formatMoney(data.net, data.currency)}
						</p>
					</div>
				</div>
			</section>

			<section class="space-y-3">
				<header class="flex items-end justify-between gap-3">
					<div>
						<h2 class="text-title-md text-ink">Movimientos recientes</h2>
						<p class="mt-0.5 hidden text-body-sm text-muted lg:block">
							Últimos registros de {formatMonthName(data.monthStart, true)}
						</p>
					</div>
					<div class="flex items-center gap-3">
						<span
							class="text-label-sm font-semibold tracking-[0.12em] text-muted uppercase lg:hidden"
						>
							{formatMonthName(data.monthStart)}
						</span>
						<a
							href="/movimientos"
							class="hidden items-center gap-1 text-label-sm font-semibold text-primary hover:underline lg:inline-flex"
						>
							Ver todos
							<Icon name="arrow_forward" size={16} />
						</a>
					</div>
				</header>

				<SegmentedLinks
					value={data.filter}
					options={[
						{ value: 'all', label: 'Todos', href: withParams({ tipo: null }) },
						{ value: 'income', label: 'Ingresos', href: withParams({ tipo: 'income' }) },
						{ value: 'expense', label: 'Gastos', href: withParams({ tipo: 'expense' }) }
					]}
					class="lg:max-w-xs"
				/>

				<div class="rounded-2xl border border-hairline/70 bg-surface-container-lowest shadow-card">
					{#if data.recent.length === 0}
						<EmptyState
							icon="receipt_long"
							title="Sin movimientos todavía"
							description="Registra tu primer ingreso o gasto para ver el resumen aquí."
						/>
					{:else}
						<ul class="px-4 lg:hidden">
							{#each data.recent as transaction, index (transaction.id)}
								<li
									class="animate-stagger {index > 0 ? 'border-t border-hairline/70' : ''}"
									style="animation-delay:{index * 35}ms"
								>
									<TransactionRow
										{transaction}
										currency={data.currency}
										href={`/movimientos/${transaction.id}`}
										showAccount
									/>
								</li>
							{/each}
						</ul>
						<div class="hidden px-3 lg:block">
							<TransactionsTable items={data.recent} currency={data.currency} showAccount={false} />
						</div>
					{/if}
				</div>

				<a href="/movimientos" class={buttonClass('tonal', 'lg', true, 'lg:hidden')}>
					Ver todos los movimientos
					<Icon name="arrow_forward" size={18} />
				</a>
			</section>
		</div>

		<aside class="hidden min-w-0 flex-col gap-6 lg:flex xl:col-span-4">
			<BudgetWidget
				limit={data.budget.limit}
				spent={data.expense}
				used={data.budget.used}
				remaining={data.budget.remaining}
				daysLeft={data.budget.daysLeft}
				currency={data.profile.currency}
				categories={data.budgetCategories}
				detailed
			/>

			<section
				class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card"
				aria-label="Próximo pago"
			>
				<header class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<Icon name="notification_important" size={19} class="text-tertiary" />
						<h2 class="text-title-sm text-ink">Próximo pago</h2>
					</div>
					<a href="/deudas" class="text-label-sm font-semibold text-primary hover:underline">
						Ver deudas
					</a>
				</header>

				{#if data.nextDue}
					<div class="mt-4 rounded-xl bg-level-1/70 p-3.5">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2.5">
								<span
									class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary"
								>
									<Icon name={data.nextDue.icon} size={18} />
								</span>
								<div class="min-w-0">
									<p class="truncate text-label font-semibold text-ink">{data.nextDue.name}</p>
									<p class="truncate text-body-sm text-muted">
										{data.nextDue.creditor ?? 'Cuota programada'}
									</p>
								</div>
							</div>
							<p class="shrink-0 tnum text-title-sm font-bold text-ink">
								{formatMoney(data.nextDue.installmentAmount, data.currency)}
							</p>
						</div>
						<div class="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3">
							<span class="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
								<span class="size-1.5 rounded-full bg-tertiary" aria-hidden="true"></span>
								Vence {formatCountdown(data.nextDue.nextDueDate)}
								· {formatDayMonth(data.nextDue.nextDueDate)}
							</span>
							<a
								href={`/deudas/${data.nextDue.id}`}
								class="rounded-full bg-primary px-3 py-1 text-label-sm font-semibold text-on-primary transition hover:bg-primary/90"
							>
								Pagar
							</a>
						</div>
					</div>
				{:else}
					<div class="mt-4 rounded-xl bg-level-1/70 p-4 text-body-sm text-on-surface-variant">
						No tienes cuotas pendientes.
						<a href="/deudas/nueva" class="font-semibold text-primary">Registrar deuda</a>
					</div>
				{/if}
			</section>

			<section
				class="relative overflow-hidden rounded-2xl border border-hairline/70 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-fixed/20 p-5 shadow-card"
				aria-label="Meta destacada"
			>
				<header class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<Icon name="rocket_launch" size={21} class="text-secondary" />
						<h2 class="text-title-sm text-ink">Meta destacada</h2>
					</div>
					{#if goal}
						<span class="text-label-sm font-bold text-secondary">
							{formatPercent(goal.progressPercent, 0)} alcanzado
						</span>
					{/if}
				</header>

				{#if goal}
					<p class="mt-3 truncate text-label font-semibold text-ink">{goal.name}</p>
					<div class="mt-2 flex items-baseline justify-between gap-2">
						<p class="tnum text-title-md font-bold text-ink">
							{formatMoney(goal.savedAmount, data.currency)}
						</p>
						<p class="text-body-sm text-muted">
							Objetivo: {formatMoney(goal.targetAmount, data.currency)}
						</p>
					</div>
					<div class="mt-2 h-2 overflow-hidden rounded-full bg-level-1" aria-hidden="true">
						<div
							class="h-full rounded-full bg-secondary"
							style="width:{Math.min(100, goal.progressPercent)}%"
						></div>
					</div>
					<p class="mt-2 text-body-sm text-muted">
						Faltan
						<strong class="font-semibold text-ink"
							>{formatMoney(goal.targetAmount - goal.savedAmount, data.currency)}</strong
						>
						{#if goal.targetDate}
							para {formatMonthName(goal.targetDate, true)}
						{/if}
					</p>
					<a
						href={`/planes/${goal.id}`}
						class="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-label font-semibold text-on-secondary transition hover:bg-secondary/90"
					>
						<Icon name="savings" size={17} />
						Ver plan y aportar
					</a>
				{:else}
					<p class="mt-3 text-body-sm text-on-surface-variant">
						Aún no tienes una meta activa. Crea tu primer plan de ahorro.
					</p>
					<a
						href="/planes/nuevo"
						class="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary text-label font-semibold text-on-secondary"
					>
						<Icon name="add" size={17} />
						Planificar nuevo gasto
					</a>
				{/if}
			</section>
		</aside>
	</div>
</div>
