<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { cn } from '#lib/utils/cn';
	import { enhanceForm } from '#lib/utils/enhance';
	import { budgetTone } from '#lib/utils/finance';
	import type { FormState } from '#lib/utils/forms';
	import { ACCOUNT_KIND_ICONS, ACCOUNT_KIND_LABELS } from '#lib/utils/labels';
	import { currencySymbol, formatMoney } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	let saving = $state(false);
	/**
	 * La pestaña vive en estado local (sembrado desde la URL) para que un envío
	 * de formulario no la pierda: `action="?/..."` reemplaza los search params.
	 */
	let tab = $state<'cuentas' | 'categorias' | 'presupuestos'>(data.tab);

	const tabs = [
		{ value: 'cuentas', label: 'Cuentas' },
		{ value: 'categorias', label: 'Categorías' },
		{ value: 'presupuestos', label: 'Presupuestos' }
	];

	const activeAccounts = $derived(data.accounts.filter((account) => !account.isArchived));
	const archivedAccounts = $derived(data.accounts.filter((account) => account.isArchived));
	const expenseCategories = $derived(data.categories.filter((category) => category.kind === 'expense'));
	const incomeCategories = $derived(data.categories.filter((category) => category.kind === 'income'));
	const budgetedTotal = $derived(
		data.expenseCategories.reduce((total, category) => total + category.budget, 0)
	);

	function budgetValue(category: { id: string; budget: number }): string {
		const stored = values[`budget-${category.id}`];
		if (stored !== undefined) return stored;
		return category.budget > 0 ? category.budget.toFixed(2) : '';
	}

	function categoryHref(kind: string, id: string): string {
		return `/categorias/${id}?volver=${encodeURIComponent(`/cuentas?tab=categorias&kind=${kind}`)}`;
	}

	function newCategoryHref(kind: string): string {
		return `/categorias/nueva?kind=${kind}&volver=${encodeURIComponent('/cuentas?tab=categorias')}`;
	}

	function spentShare(spent: number, budget: number): number {
		if (budget <= 0) return 0;
		return Math.min(100, (spent / budget) * 100);
	}

	/** `budgetTone` usa semántica de estado; aquí se traduce a los tonos de la barra. */
	function barTone(percent: number): 'primary' | 'warning' | 'tertiary' {
		const tone = budgetTone(percent);
		if (tone === 'danger') return 'tertiary';
		if (tone === 'warning') return 'warning';
		return 'primary';
	}
</script>

<div class="space-y-4 px-4 pt-4">
	<div>
		<h1 class="text-title-lg text-ink">Cuentas y categorías</h1>
		<p class="mt-1 text-body-sm text-on-surface-variant">
			Organiza dónde vive tu dinero y cómo lo clasificas.
		</p>
	</div>

	<SegmentedControl options={tabs} bind:value={tab} size="sm" />

	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	{#if tab === 'cuentas'}
		<section class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero">
			<header class="flex items-center justify-between gap-2">
				<span class="text-label-sm font-semibold tracking-wide uppercase">Patrimonio total</span>
				<span class="rounded-full bg-white/10 px-2.5 py-1 text-label-sm font-semibold">
					{activeAccounts.length}
					{activeAccounts.length === 1 ? 'cuenta' : 'cuentas'}
				</span>
			</header>
			<p class="tnum mt-3 flex items-baseline gap-1.5">
				<span class="text-[2rem] leading-none font-bold">
					{formatMoney(data.totalBalance, data.currency)}
				</span>
				<span class="text-body-sm text-inverse-on-surface/60">{data.currency}</span>
			</p>
			<div class="mt-4 flex items-center gap-2 text-label-sm text-inverse-on-surface/70">
				<Icon name="savings" size={16} class="text-primary-container" />
				El saldo se calcula con tus movimientos confirmados.
			</div>
		</section>

		<a href="/cuentas/nueva" class={buttonClass('primary', 'lg', true)}>
			<span class="flex size-6 items-center justify-center rounded-full border-2 border-white/70">
				<Icon name="add" size={16} />
			</span>
			Nueva cuenta
		</a>

		<section class="space-y-2.5">
			{#each activeAccounts as account (account.id)}
				<a
					href={`/cuentas/${account.id}`}
					class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3.5 shadow-card transition hover:border-secondary/40"
				>
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
					>
						<Icon name={account.icon} size={22} />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5">
							<p class="truncate text-body font-semibold text-ink">{account.name}</p>
							{#if account.isPrimary}
								<span
									class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary"
								>
									Principal
								</span>
							{/if}
						</div>
						<p class="truncate text-body-sm text-muted">
							{ACCOUNT_KIND_LABELS[account.kind]} · {account.currency}
						</p>
					</div>
					<div class="shrink-0 text-right">
						<p class="tnum text-body font-bold text-ink">
							{formatMoney(account.balance, account.currency)}
						</p>
						<p class="text-label-sm text-muted">
							Inicial {formatMoney(account.openingBalance, account.currency)}
						</p>
					</div>
				</a>
			{:else}
				<div class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center">
					<p class="text-body text-on-surface-variant">
						Aún no tienes cuentas registradas.
					</p>
				</div>
			{/each}
		</section>

		{#if archivedAccounts.length > 0}
			<section class="space-y-2">
				<h2 class="text-label-sm font-semibold tracking-wide text-muted uppercase">Archivadas</h2>
				{#each archivedAccounts as account (account.id)}
					<a
						href={`/cuentas/${account.id}`}
						class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-level-1/50 p-3.5 opacity-75"
					>
						<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-level-1 text-muted">
							<Icon name={account.icon} size={20} />
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-body font-medium text-on-surface-variant">{account.name}</p>
							<p class="text-label-sm text-muted">{ACCOUNT_KIND_LABELS[account.kind]}</p>
						</div>
						<span class="tnum shrink-0 text-body-sm font-semibold text-muted">
							{formatMoney(account.balance, account.currency)}
						</span>
					</a>
				{/each}
			</section>
		{/if}
	{:else if tab === 'categorias'}
		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-title-sm text-ink">Gastos</h2>
				<a href={newCategoryHref('expense')} class="flex items-center gap-1 text-label font-semibold text-primary">
					<Icon name="add" size={16} />
					Nueva
				</a>
			</div>
			<div class="divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
				{#each expenseCategories as category (category.id)}
					<a href={categoryHref(category.kind, category.id)} class="flex items-center gap-3 py-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full"
							style="background-color:{category.color}1f;color:{category.color}"
						>
							<Icon name={category.icon} size={18} filled />
						</span>
						<p class="min-w-0 flex-1 truncate text-body text-ink">{category.name}</p>
						<Icon name="chevron_right" size={18} class="text-muted" />
					</a>
				{:else}
					<p class="py-6 text-center text-body-sm text-muted">Sin categorías de gasto.</p>
				{/each}
			</div>
		</section>

		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-title-sm text-ink">Ingresos</h2>
				<a href={newCategoryHref('income')} class="flex items-center gap-1 text-label font-semibold text-primary">
					<Icon name="add" size={16} />
					Nueva
				</a>
			</div>
			<div class="divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
				{#each incomeCategories as category (category.id)}
					<a href={categoryHref(category.kind, category.id)} class="flex items-center gap-3 py-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full"
							style="background-color:{category.color}1f;color:{category.color}"
						>
							<Icon name={category.icon} size={18} filled />
						</span>
						<p class="min-w-0 flex-1 truncate text-body text-ink">{category.name}</p>
						<Icon name="chevron_right" size={18} class="text-muted" />
					</a>
				{:else}
					<p class="py-6 text-center text-body-sm text-muted">Sin categorías de ingreso.</p>
				{/each}
			</div>
		</section>
	{:else}
		<section class="rounded-2xl bg-secondary/6 p-4">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="text-label-sm font-semibold tracking-wide text-secondary uppercase">
						Presupuesto de {data.month.label}
					</p>
					<p class="tnum mt-1 text-title-md font-bold text-ink">
						{formatMoney(budgetedTotal, data.currency)}
					</p>
					<p class="text-body-sm text-on-surface-variant">
						Repartidos en {data.expenseCategories.filter((category) => category.budget > 0).length}
						categorías
					</p>
				</div>
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="savings" size={20} />
				</span>
			</div>
			<div class="mt-3 flex items-center justify-between gap-2 border-t border-secondary/15 pt-3">
				<p class="text-body-sm text-on-surface-variant">Presupuesto global</p>
				<p class="text-body-sm">
					<span class="tnum font-semibold text-ink">
						{formatMoney(data.monthlyBudget, data.currency)}
					</span>
					· <a href="/ajustes" class="font-semibold text-secondary underline">Ajustes</a>
				</p>
			</div>
		</section>

		<form
			method="POST"
			action="?/saveBudgets"
			class="space-y-3"
			use:enhance={enhanceForm({
				success: 'Presupuestos guardados',
				onStart: () => (saving = true),
				onFinish: () => (saving = false)
			})}
		>
			<div class="space-y-2">
				{#each data.expenseCategories as category (category.id)}
					<div class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3.5">
						<div class="flex items-center gap-3">
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-full"
								style="background-color:{category.color}1f;color:{category.color}"
							>
								<Icon name={category.icon} size={18} filled />
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-body font-medium text-ink">{category.name}</p>
								<p class="text-label-sm text-muted">
									Gastado {formatMoney(category.spent, data.currency)}
								</p>
							</div>
							<label class="flex shrink-0 items-center gap-1 rounded-xl border border-hairline bg-level-1/60 px-2.5 py-1.5">
								<span class="text-label-sm text-muted">{currencySymbol(data.currency)}</span>
								<input
									type="text"
									inputmode="decimal"
									name={`budget-${category.id}`}
									value={budgetValue(category)}
									placeholder="0.00"
									aria-label={`Límite para ${category.name}`}
									class="tnum w-20 bg-transparent text-right text-body font-semibold text-ink placeholder:text-muted-soft focus:outline-none"
								/>
							</label>
						</div>

						{#if previous[`budget-${category.id}`]}
							<p class="mt-1.5 text-label-sm text-tertiary">{previous[`budget-${category.id}`]}</p>
						{/if}

						{#if category.budget > 0}
							<div class="mt-2.5">
								<ProgressBar
									value={spentShare(category.spent, category.budget)}
									tone={barTone(spentShare(category.spent, category.budget))}
									size="sm"
								/>
								<p class={cn('mt-1 text-label-sm', spentShare(category.spent, category.budget) >= 100 ? 'text-tertiary' : 'text-muted')}>
									{Math.round(spentShare(category.spent, category.budget))}% de
									{formatMoney(category.budget, data.currency)}
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<div class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center">
						<p class="text-body text-on-surface-variant">
							Crea categorías de gasto para asignarles un límite mensual.
						</p>
					</div>
				{/each}
			</div>

			{#if data.expenseCategories.length > 0}
				<button type="submit" class={buttonClass('primary', 'lg', true)} disabled={saving}>
					{#if saving}
						<Icon name="progress_activity" size={20} class="animate-spin" />
					{:else}
						<Icon name="check" size={20} />
					{/if}
					Guardar presupuestos
				</button>
			{/if}
		</form>
	{/if}
</div>
