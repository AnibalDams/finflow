<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import SegmentedLinks from '#lib/components/ui/SegmentedLinks.svelte';
	import Sparkline from '#lib/components/charts/Sparkline.svelte';
	import TransactionRow from '#lib/components/domain/TransactionRow.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import OptionSheet from '#lib/components/ui/OptionSheet.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { formatMonthName } from '#lib/utils/dates';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const firstName = $derived(data.profile.fullName.trim().split(/\s+/)[0] ?? '');
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
		goto(`/?${search.toString()}`, { reset: false });
	}

	const quickActions = [
		{ label: 'Ingreso', icon: 'add_circle', href: '/movimientos/nuevo?tipo=income', tone: 'primary' },
		{ label: 'Gasto', icon: 'remove_circle', href: '/movimientos/nuevo?tipo=expense', tone: 'tertiary' },
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

	const budgetTone = $derived(
		data.budget.used >= 100 ? 'tertiary' : data.budget.used >= 85 ? 'warning' : 'secondary'
	);
</script>

<div class="space-y-5 px-4 pt-4">
	<header class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h1 class="text-title-lg whitespace-nowrap text-ink">
				Hola, {firstName} <span aria-hidden="true">👋</span>
			</h1>
			<p class="mt-0.5 text-body text-muted">
				{data.delta === null
					? `Resumen de ${formatMonthName(data.monthStart, true)}`
					: data.delta >= 0
						? 'Tu salud financiera va en verde'
						: 'Tus gastos crecieron este mes'}
			</p>
		</div>

		<button
			type="button"
			bind:this={accountTrigger}
			class="pressable relative flex shrink-0 items-center gap-1.5 rounded-full bg-level-1 py-2 pr-2 pl-3 transition hover:bg-surface-container"
			aria-haspopup="listbox"
			aria-expanded={accountSheetOpen}
			aria-label="Seleccionar cuenta"
			onclick={() => (accountSheetOpen = true)}
		>
			<Icon name={selectedAccount?.icon ?? 'account_balance_wallet'} size={17} class="text-primary" />
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

	<section class="overflow-hidden rounded-3xl bg-inverse-surface p-5 shadow-hero">
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

		<p class="tnum mt-1.5 flex items-baseline gap-1.5 text-title-xl text-inverse-on-surface">
			{formatMoney(data.balance, data.currency)}
			<span class="text-body font-medium text-inverse-on-surface/50">{data.currency}</span>
		</p>

		<div class="-mx-1 mt-1">
			<Sparkline values={data.series} height={72} />
		</div>

		<div class="mt-3 grid grid-cols-2 gap-3">
			<div class="rounded-2xl bg-white/8 p-3">
				<div class="flex items-center gap-2">
					<span class="flex size-7 items-center justify-center rounded-full bg-primary/25 text-primary-fixed">
						<Icon name="arrow_downward_alt" size={16} />
					</span>
					<span class="text-label-sm text-inverse-on-surface/60">Ingresos (mes)</span>
				</div>
				<p class="tnum mt-1.5 text-title-sm text-primary-fixed">
					+{formatMoney(data.income, data.currency)}
				</p>
			</div>

			<div class="rounded-2xl bg-white/8 p-3">
				<div class="flex items-center gap-2">
					<span class="flex size-7 items-center justify-center rounded-full bg-tertiary/25 text-tertiary-fixed">
						<Icon name="arrow_upward_alt" size={16} />
					</span>
					<span class="text-label-sm text-inverse-on-surface/60">Gastos (mes)</span>
				</div>
				<p class="tnum mt-1.5 text-title-sm text-tertiary-fixed">
					−{formatMoney(data.expense, data.currency)}
				</p>
			</div>
		</div>
	</section>

	<nav class="grid grid-cols-4 gap-2" aria-label="Acciones rápidas">
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

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<header class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<span class="flex size-9 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="pie_chart" size={19} filled />
				</span>
				<h2 class="text-title-sm text-ink">Presupuesto Mensual</h2>
			</div>
			<span class="text-label-sm font-semibold text-secondary">
				{formatPercent(data.budget.used)} usado
			</span>
		</header>

		<ProgressBar
			value={data.budget.used}
			tone={budgetTone}
			size="md"
			class="mt-3"
			label="Uso del presupuesto mensual"
		/>

		<div class="mt-3 flex items-center justify-between gap-2 text-body-sm">
			<span class="text-muted">
				Límite: <span class="tnum font-semibold text-ink"
					>{formatMoney(data.budget.limit, data.currency)}</span
				>
			</span>
			<span class="flex items-center gap-1 text-muted">
				<Icon name="schedule" size={15} />
				Quedan <span class="tnum font-semibold text-ink"
					>{formatMoney(data.budget.remaining, data.currency)}</span
				>
				({data.budget.daysLeft} {data.budget.daysLeft === 1 ? 'día' : 'días'})
			</span>
		</div>
	</section>

	<section class="space-y-3">
		<header class="flex items-end justify-between gap-3">
			<h2 class="text-title-md text-ink">Movimientos Recientes</h2>
			<span class="text-label-sm font-semibold tracking-[0.12em] text-muted uppercase">
				{formatMonthName(data.monthStart)}
			</span>
		</header>

		<SegmentedLinks
			value={data.filter}
			options={[
				{ value: 'all', label: 'Todos', href: withParams({ tipo: null }) },
				{ value: 'income', label: 'Ingresos', href: withParams({ tipo: 'income' }) },
				{ value: 'expense', label: 'Gastos', href: withParams({ tipo: 'expense' }) }
			]}
		/>

		<div class="rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4 shadow-card">
			{#if data.recent.length === 0}
				<EmptyState
					icon="receipt_long"
					title="Sin movimientos todavía"
					description="Registra tu primer ingreso o gasto para ver el resumen aquí."
				/>
			{:else}
				<ul>
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
			{/if}
		</div>

		<a href="/movimientos" class={buttonClass('tonal', 'lg', true)}>
			Ver todos los movimientos
			<Icon name="arrow_forward" size={18} />
		</a>
	</section>
</div>
