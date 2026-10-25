<script lang="ts">
	import { enhance } from '$app/forms';
	import AccountRow from '#lib/components/domain/AccountRow.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { cn } from '#lib/utils/cn';
	import { enhanceForm } from '#lib/utils/enhance';
	import { budgetTone } from '#lib/utils/finance';
	import type { FormState } from '#lib/utils/forms';
	import { ACCOUNT_KIND_ICONS, ACCOUNT_KIND_LABELS } from '#lib/utils/labels';
	import { currencySymbol, formatMoney, sumAmounts } from '#lib/utils/money';
	import type { AccountKind } from '#lib/types/domain';
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
	const expenseCategories = $derived(
		data.categories.filter((category) => category.kind === 'expense')
	);
	const incomeCategories = $derived(
		data.categories.filter((category) => category.kind === 'income')
	);
	const budgetedTotal = $derived(
		data.expenseCategories.reduce((total, category) => total + category.budget, 0)
	);

	const KIND_ORDER: AccountKind[] = ['checking', 'savings', 'pocket', 'cash', 'credit'];

	const groups = $derived(
		KIND_ORDER.map((kind) => {
			const accounts = activeAccounts.filter((account) => account.kind === kind);
			return {
				kind,
				label: ACCOUNT_KIND_LABELS[kind],
				icon: ACCOUNT_KIND_ICONS[kind],
				accounts,
				subtotal: sumAmounts(accounts.map((account) => account.balance))
			};
		}).filter((group) => group.accounts.length > 0)
	);

	const liquidTotal = $derived(
		sumAmounts(
			activeAccounts
				.filter(
					(account) =>
						account.kind === 'checking' || account.kind === 'pocket' || account.kind === 'cash'
				)
				.map((account) => account.balance)
		)
	);
	const savingsTotal = $derived(
		sumAmounts(
			activeAccounts
				.filter((account) => account.kind === 'savings')
				.map((account) => account.balance)
		)
	);
	const creditTotal = $derived(
		sumAmounts(
			activeAccounts
				.filter((account) => account.kind === 'credit')
				.map((account) => account.balance)
		)
	);

	const primaryAccount = $derived(
		activeAccounts.find((account) => account.isPrimary) ?? activeAccounts[0] ?? null
	);

	const kpis = $derived([
		{
			label: 'Liquidez disponible',
			value: formatMoney(liquidTotal, data.currency),
			meta: 'Corrientes, bolsillos y efectivo',
			icon: 'account_balance_wallet',
			tone: 'primary' as const
		},
		{
			label: 'Ahorro acumulado',
			value: formatMoney(savingsTotal, data.currency),
			meta: 'Cuentas de ahorro',
			icon: 'savings',
			tone: 'secondary' as const
		},
		{
			label: 'Saldo de crédito',
			value: formatMoney(creditTotal, data.currency),
			meta: 'Líneas y tarjetas',
			icon: 'credit_card',
			tone: 'tertiary' as const
		},
		{
			label: 'Patrimonio neto',
			value: formatMoney(data.totalBalance, data.currency),
			meta: `${activeAccounts.length} ${activeAccounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}`,
			icon: 'account_balance',
			tone: 'ink' as const
		}
	]);

	const KPI_TONES = {
		primary: 'bg-primary/10 text-primary',
		secondary: 'bg-secondary/10 text-secondary',
		tertiary: 'bg-tertiary/10 text-tertiary',
		ink: 'bg-level-1 text-ink'
	} as const;

	const distribution = $derived(
		groups.map((group) => ({
			...group,
			share:
				data.totalBalance !== 0
					? Math.min(100, (Math.abs(group.subtotal) / Math.abs(data.totalBalance)) * 100)
					: 0
		}))
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

<div class="space-y-4 px-4 pt-4 lg:mx-auto lg:max-w-[1440px] lg:space-y-6 lg:px-8 lg:pt-8 lg:pb-10">
	<div class="lg:flex lg:flex-wrap lg:items-end lg:justify-between lg:gap-4">
		<div>
			<p
				class="hidden text-label-sm font-semibold tracking-[0.16em] text-primary uppercase lg:block"
			>
				Consolidado multicuenta
			</p>
			<h1 class="text-title-lg text-ink lg:mt-1 lg:text-title-xl lg:tracking-tight">
				Cuentas y gestión patrimonial
			</h1>
			<p class="mt-1 text-body-sm text-on-surface-variant lg:text-body">
				Organiza dónde vive tu dinero y cómo lo clasificas.
			</p>
		</div>

		{#if tab === 'cuentas'}
			<div class="mt-3 hidden items-center gap-2 lg:mt-0 lg:flex">
				<a href="/movimientos/nuevo?tipo=transfer" class={buttonClass('outline', 'md')}>
					<Icon name="sync_alt" size={18} />
					Transferir entre cuentas
				</a>
				<a href="/cuentas/nueva" class={buttonClass('primary', 'md')}>
					<Icon name="add" size={18} />
					Nueva cuenta
				</a>
			</div>
		{/if}
	</div>

	<SegmentedControl options={tabs} bind:value={tab} size="sm" class="lg:max-w-md" />

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
		<section
			class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero lg:hidden"
		>
			<header class="flex items-center justify-between gap-2">
				<span class="text-label-sm font-semibold tracking-wide uppercase">Patrimonio total</span>
				<span class="rounded-full bg-white/10 px-2.5 py-1 text-label-sm font-semibold">
					{activeAccounts.length}
					{activeAccounts.length === 1 ? 'cuenta' : 'cuentas'}
				</span>
			</header>
			<p class="mt-3 flex items-baseline gap-1.5 tnum">
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

		<section
			class="hidden lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-4"
			aria-label="Resumen patrimonial"
		>
			{#each kpis as kpi (kpi.label)}
				<article
					class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card"
				>
					<div class="flex items-center justify-between gap-2">
						<p class="text-label font-medium text-on-surface-variant">{kpi.label}</p>
						<span class="flex size-9 items-center justify-center rounded-xl {KPI_TONES[kpi.tone]}">
							<Icon name={kpi.icon} size={19} />
						</span>
					</div>
					<p class="mt-3 tnum text-title-lg font-bold tracking-tight text-ink">{kpi.value}</p>
					<p class="mt-1 text-body-sm text-muted">{kpi.meta}</p>
				</article>
			{/each}
		</section>

		<a href="/cuentas/nueva" class={buttonClass('primary', 'lg', true, 'lg:hidden')}>
			<span class="flex size-6 items-center justify-center rounded-full border-2 border-white/70">
				<Icon name="add" size={16} />
			</span>
			Nueva cuenta
		</a>

		<div
			class="hidden lg:block lg:space-y-6 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6 xl:space-y-0"
		>
			<div class="space-y-5 xl:col-span-8">
				{#each groups as group (group.kind)}
					<section>
						<header class="mb-2 flex items-end justify-between gap-2">
							<h2 class="flex items-center gap-2 text-title-sm text-ink">
								<Icon name={group.icon} size={17} class="text-muted" />
								{group.label}
							</h2>
							<span class="text-label-sm text-muted">
								{group.accounts.length}
								{group.accounts.length === 1 ? 'cuenta' : 'cuentas'} ·
								<span class="tnum font-semibold text-ink"
									>{formatMoney(group.subtotal, data.currency)}</span
								>
							</span>
						</header>
						<div class="space-y-2">
							{#each group.accounts as account (account.id)}
								<AccountRow {account} href={`/cuentas/${account.id}`} compact />
							{/each}
						</div>
					</section>
				{/each}

				{#if archivedAccounts.length > 0}
					<section>
						<header class="mb-2 flex items-end justify-between gap-2">
							<h2 class="text-title-sm text-ink">Archivadas</h2>
							<span class="text-label-sm text-muted">{archivedAccounts.length}</span>
						</header>
						<div class="space-y-2">
							{#each archivedAccounts as account (account.id)}
								<AccountRow {account} href={`/cuentas/${account.id}`} archived compact />
							{/each}
						</div>
					</section>
				{/if}

				{#if activeAccounts.length === 0 && archivedAccounts.length === 0}
					<div
						class="rounded-2xl border border-dashed border-outline-variant px-4 py-10 text-center"
					>
						<p class="text-body text-on-surface-variant">Aún no tienes cuentas registradas.</p>
						<a href="/cuentas/nueva" class="mt-3 inline-flex text-label font-semibold text-primary">
							Crear mi primera cuenta
						</a>
					</div>
				{/if}
			</div>

			<aside class="space-y-4 xl:col-span-4">
				{#if primaryAccount}
					<section
						class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card"
					>
						<header class="flex items-start gap-3">
							<span
								class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
							>
								<Icon name={primaryAccount.icon} size={24} />
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<p class="truncate text-title-sm text-ink">{primaryAccount.name}</p>
									{#if primaryAccount.isPrimary}
										<span
											class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary"
										>
											Principal
										</span>
									{/if}
								</div>
								<p class="text-body-sm text-muted">
									{ACCOUNT_KIND_LABELS[primaryAccount.kind]} · {primaryAccount.currency}
								</p>
							</div>
						</header>

						<p class="mt-4 text-label-sm tracking-wide text-muted uppercase">Saldo actual</p>
						<p class="tnum text-title-xl font-bold tracking-tight text-ink">
							{formatMoney(primaryAccount.balance, primaryAccount.currency)}
						</p>

						<dl class="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4">
							<div>
								<dt class="text-label-sm text-muted">Saldo inicial</dt>
								<dd class="tnum text-label font-semibold text-ink">
									{formatMoney(primaryAccount.openingBalance, primaryAccount.currency)}
								</dd>
							</div>
							<div>
								<dt class="text-label-sm text-muted">Moneda</dt>
								<dd class="text-label font-semibold text-ink">{primaryAccount.currency}</dd>
							</div>
							<div>
								<dt class="text-label-sm text-muted">Tipo</dt>
								<dd class="text-label font-semibold text-ink">
									{ACCOUNT_KIND_LABELS[primaryAccount.kind]}
								</dd>
							</div>
							<div>
								<dt class="text-label-sm text-muted">Estado</dt>
								<dd class="text-label font-semibold text-primary">Activa</dd>
							</div>
						</dl>

						<div class="mt-4 grid grid-cols-2 gap-2">
							<a href="/movimientos/nuevo?tipo=transfer" class={buttonClass('primary', 'md')}>
								<Icon name="sync_alt" size={17} />
								Transferir
							</a>
							<a href={`/cuentas/${primaryAccount.id}`} class={buttonClass('outline', 'md')}>
								<Icon name="edit" size={17} />
								Editar
							</a>
						</div>
						<a
							href={`/movimientos?cuenta=${primaryAccount.id}`}
							class="mt-2 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-level-1 text-label font-semibold text-ink transition hover:bg-surface-container"
						>
							<Icon name="receipt_long" size={17} />
							Ver movimientos
						</a>
					</section>
				{/if}

				{#if distribution.length > 0}
					<section
						class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card"
					>
						<h2 class="text-title-sm text-ink">Distribución del patrimonio</h2>
						<div class="mt-4 space-y-3">
							{#each distribution as group (group.kind)}
								<div>
									<div class="flex items-center justify-between gap-2 text-body-sm">
										<span class="flex items-center gap-2 text-on-surface">
											<Icon name={group.icon} size={15} class="text-muted" />
											{group.label}
										</span>
										<span class="tnum font-semibold text-ink">
											{formatMoney(group.subtotal, data.currency)}
										</span>
									</div>
									<div
										class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-level-1"
										aria-hidden="true"
									>
										<div
											class="h-full rounded-full bg-secondary"
											style="width:{group.share}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<a
					href="/cuentas?tab=presupuestos"
					class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-secondary/6 p-4 transition hover:border-secondary/40"
				>
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/12 text-secondary"
					>
						<Icon name="savings" size={20} />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-label font-semibold text-ink">Presupuestos por categoría</span>
						<span class="block text-body-sm text-muted">Ajusta los límites de este mes</span>
					</span>
					<Icon name="chevron_right" size={18} class="shrink-0 text-muted" />
				</a>
			</aside>
		</div>

		<div class="space-y-4 lg:hidden">
			<section class="space-y-2.5">
				{#each activeAccounts as account (account.id)}
					<AccountRow {account} href={`/cuentas/${account.id}`} />
				{:else}
					<div
						class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center"
					>
						<p class="text-body text-on-surface-variant">Aún no tienes cuentas registradas.</p>
					</div>
				{/each}
			</section>

			{#if archivedAccounts.length > 0}
				<section class="space-y-2">
					<h2 class="text-label-sm font-semibold tracking-wide text-muted uppercase">Archivadas</h2>
					{#each archivedAccounts as account (account.id)}
						<AccountRow {account} href={`/cuentas/${account.id}`} archived />
					{/each}
				</section>
			{/if}
		</div>
	{:else if tab === 'categorias'}
		<div class="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-title-sm text-ink">Gastos</h2>
					<a
						href={newCategoryHref('expense')}
						class="flex items-center gap-1 text-label font-semibold text-primary"
					>
						<Icon name="add" size={16} />
						Nueva
					</a>
				</div>
				<div
					class="divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4"
				>
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
					<a
						href={newCategoryHref('income')}
						class="flex items-center gap-1 text-label font-semibold text-primary"
					>
						<Icon name="add" size={16} />
						Nueva
					</a>
				</div>
				<div
					class="divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4"
				>
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
		</div>
	{:else}
		<div
			class="space-y-4 lg:block lg:space-y-4 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6 xl:space-y-0"
		>
			<section class="rounded-2xl bg-secondary/6 p-4 lg:p-5 xl:col-span-5">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-label-sm font-semibold tracking-wide text-secondary uppercase">
							Presupuesto de {data.month.label}
						</p>
						<p class="mt-1 tnum text-title-md font-bold text-ink">
							{formatMoney(budgetedTotal, data.currency)}
						</p>
						<p class="text-body-sm text-on-surface-variant">
							Repartidos en {data.expenseCategories.filter((category) => category.budget > 0)
								.length}
							categorías
						</p>
					</div>
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary"
					>
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
				class="space-y-3 xl:col-span-7"
				use:enhance={enhanceForm({
					success: 'Presupuestos guardados',
					onStart: () => (saving = true),
					onFinish: () => (saving = false)
				})}
			>
				<div class="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
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
								<label
									class="flex shrink-0 items-center gap-1 rounded-xl border border-hairline bg-level-1/60 px-2.5 py-1.5"
								>
									<span class="text-label-sm text-muted">{currencySymbol(data.currency)}</span>
									<input
										type="text"
										inputmode="decimal"
										name={`budget-${category.id}`}
										value={budgetValue(category)}
										placeholder="0.00"
										aria-label={`Límite para ${category.name}`}
										class="w-20 bg-transparent text-right tnum text-body font-semibold text-ink placeholder:text-muted-soft focus:outline-none"
									/>
								</label>
							</div>

							{#if previous[`budget-${category.id}`]}
								<p class="mt-1.5 text-label-sm text-tertiary">
									{previous[`budget-${category.id}`]}
								</p>
							{/if}

							{#if category.budget > 0}
								<div class="mt-2.5">
									<ProgressBar
										value={spentShare(category.spent, category.budget)}
										tone={barTone(spentShare(category.spent, category.budget))}
										size="sm"
									/>
									<p
										class={cn(
											'mt-1 text-label-sm',
											spentShare(category.spent, category.budget) >= 100
												? 'text-tertiary'
												: 'text-muted'
										)}
									>
										{Math.round(spentShare(category.spent, category.budget))}% de
										{formatMoney(category.budget, data.currency)}
									</p>
								</div>
							{/if}
						</div>
					{:else}
						<div
							class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center lg:col-span-2"
						>
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
		</div>
	{/if}
</div>
