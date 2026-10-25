<script lang="ts">
	import { page } from '$app/state';
	import TransactionsTable from '#lib/components/domain/TransactionsTable.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import TransactionRow from '#lib/components/domain/TransactionRow.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { formatRelativeDay, monthKey, toISODate } from '#lib/utils/dates';
	import { formatMoney, sumAmounts } from '#lib/utils/money';
	import type { TransactionItem } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let filtersOpen = $state(false);
	let typeFilter = $state(data.filters.type);
	let accountFilter = $state(data.filters.accountId);
	let categoryFilter = $state(data.filters.categoryId);

	/** Construye una URL conservando los filtros activos. */
	function withParams(changes: Record<string, string | null>): string {
		const params = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(changes)) {
			if (value === null || value === '') params.delete(key);
			else params.set(key, value);
		}
		const query = params.toString();
		return `/movimientos${query ? `?${query}` : ''}`;
	}

	const isCurrentMonth = $derived(data.month === monthKey(new Date()));

	const groups = $derived.by(() => {
		const map = new Map<string, TransactionItem[]>();

		for (const item of data.items) {
			const key = toISODate(new Date(item.occurredAt));
			const bucket = map.get(key);
			if (bucket) bucket.push(item);
			else map.set(key, [item]);
		}

		return [...map.entries()].map(([date, items]) => ({
			date,
			label: formatRelativeDay(date),
			items,
			total: sumAmounts(
				items.map((item) =>
					item.type === 'income' ? item.amount : item.type === 'expense' ? -item.amount : 0
				)
			)
		}));
	});

	const remaining = $derived(Math.max(0, data.total - data.items.length));

	const accountFilterName = $derived(
		data.accounts.find((account) => account.id === accountFilter)?.name ?? 'Todas las cuentas'
	);
	const categoryFilterName = $derived(
		data.categories.find((category) => category.id === categoryFilter)?.name ??
			'Todas las categorías'
	);

	function signedTotal(total: number): string {
		if (total === 0) return '';
		return `${total > 0 ? '+' : '−'}${formatMoney(Math.abs(total))}`;
	}
</script>

<div class="space-y-4 px-4 pt-4 lg:mx-auto lg:max-w-[1440px] lg:space-y-6 lg:px-8 lg:pt-8 lg:pb-10">
	<header class="hidden flex-wrap items-end justify-between gap-4 lg:flex">
		<div>
			<p class="text-label-sm font-semibold tracking-[0.16em] text-primary uppercase">
				Registro de actividad
			</p>
			<h1 class="mt-1 text-title-xl tracking-tight text-ink">Movimientos</h1>
			<p class="mt-1 text-body text-on-surface-variant">
				Consulta, filtra y depura cada ingreso, gasto o transferencia de tu historial.
			</p>
		</div>
		<a href="/movimientos/nuevo" class={buttonClass('primary', 'md')}>
			<Icon name="add" size={18} />
			Registrar movimiento
		</a>
	</header>

	<header class="flex items-center justify-between gap-2">
		<a
			href={withParams({ mes: data.previousMonth })}
			class="flex size-9 items-center justify-center rounded-full bg-level-1 text-on-surface-variant transition hover:bg-surface-container"
			aria-label="Mes anterior"
		>
			<Icon name="chevron_left" size={20} />
		</a>

		<div class="min-w-0 text-center">
			<h1 class="text-capitalize truncate text-title-md text-ink lg:text-title-lg">
				{data.rangeLabel}
			</h1>
			{#if !isCurrentMonth && data.month}
				<a href={withParams({ mes: null })} class="text-label-sm font-semibold text-secondary">
					Volver al mes actual
				</a>
			{:else}
				<p class="text-label-sm text-muted">
					{data.total}
					{data.total === 1 ? 'movimiento' : 'movimientos'}
				</p>
			{/if}
		</div>

		<a
			href={withParams({ mes: data.nextMonth })}
			class="flex size-9 items-center justify-center rounded-full bg-level-1 text-on-surface-variant transition hover:bg-surface-container"
			aria-label="Mes siguiente"
		>
			<Icon name="chevron_right" size={20} />
		</a>
	</header>

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 lg:p-5">
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
			<div class="min-w-0">
				<p class="flex items-center gap-1.5 text-label-xs tracking-wide text-muted uppercase">
					<span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
					Ingresos
				</p>
				<p class="mt-1 truncate tnum text-title-sm font-bold text-primary lg:text-title-md">
					+{formatMoney(data.totals.income)}
				</p>
			</div>
			<div class="min-w-0">
				<p class="flex items-center gap-1.5 text-label-xs tracking-wide text-muted uppercase">
					<span class="size-1.5 rounded-full bg-tertiary" aria-hidden="true"></span>
					Gastos
				</p>
				<p class="mt-1 truncate tnum text-title-sm font-bold text-tertiary lg:text-title-md">
					−{formatMoney(data.totals.expense)}
				</p>
			</div>
			<div class="hidden min-w-0 lg:block">
				<p class="flex items-center gap-1.5 text-label-xs tracking-wide text-muted uppercase">
					<span class="size-1.5 rounded-full bg-ink" aria-hidden="true"></span>
					Balance del mes
				</p>
				<p class="mt-1 truncate tnum text-title-md font-bold text-ink">
					{formatMoney(data.totals.income - data.totals.expense)}
				</p>
			</div>
		</div>

		<div
			class="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3 lg:hidden"
		>
			<span class="text-body-sm text-muted">Balance del mes</span>
			<span class="tnum text-title-sm font-bold text-ink">
				{formatMoney(data.totals.income - data.totals.expense)}
			</span>
		</div>
	</section>

	<div class="flex gap-2 lg:gap-3">
		<form method="GET" class="relative flex-1" role="search">
			<input type="hidden" name="mes" value={data.month ?? ''} />
			{#if data.filters.type !== 'all'}
				<input type="hidden" name="tipo" value={data.filters.type} />
			{/if}
			<Icon
				name="search"
				size={19}
				class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-soft"
			/>
			<input
				type="search"
				name="q"
				value={data.filters.search}
				placeholder="Buscar concepto o nota"
				aria-label="Buscar movimientos"
				class="h-11 w-full rounded-full border border-hairline bg-surface-container-lowest pr-3 pl-10 text-body text-ink placeholder:text-muted-soft focus:border-secondary focus:ring-3 focus:ring-secondary/12 focus:outline-none lg:h-12 lg:pr-28"
			/>
			<button
				type="submit"
				class="sr-only lg:not-sr-only lg:absolute lg:top-1/2 lg:right-2 lg:-translate-y-1/2 lg:rounded-full lg:bg-primary lg:px-4 lg:py-1.5 lg:text-label-sm lg:font-semibold lg:text-on-primary"
			>
				Buscar
			</button>
		</form>

		<button
			type="button"
			class="relative flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-3 text-on-surface-variant transition hover:bg-level-1 lg:h-12 lg:px-4"
			aria-label="Filtrar movimientos"
			onclick={() => (filtersOpen = true)}
		>
			<Icon name="tune" size={20} />
			<span class="hidden text-label font-semibold lg:inline">Filtros</span>
			{#if data.hasFilters}
				<span
					class="absolute top-2 right-2 size-2 rounded-full bg-tertiary lg:static lg:size-2"
					aria-hidden="true"
				></span>
			{/if}
		</button>
	</div>

	{#if data.items.length === 0}
		<div class="rounded-2xl border border-hairline/70 bg-surface-container-lowest">
			<EmptyState
				icon="receipt_long"
				title={data.hasFilters ? 'Sin resultados' : 'Aún no hay movimientos'}
				description={data.hasFilters
					? 'Prueba con otros filtros o cambia de mes.'
					: 'Registra tu primer movimiento para empezar a ver tus finanzas.'}
			>
				{#snippet action()}
					<a href="/movimientos/nuevo" class={buttonClass('primary', 'md')}>
						<Icon name="add" size={18} />
						Registrar movimiento
					</a>
				{/snippet}
			</EmptyState>
		</div>
	{:else}
		<div
			class="hidden overflow-hidden rounded-2xl border border-hairline/70 bg-surface-container-lowest lg:block"
		>
			<TransactionsTable items={data.items} currency={data.profile.currency} showDate showAccount />
		</div>

		<div class="space-y-4 lg:hidden">
			{#each groups as group (group.date)}
				<section class="space-y-1.5">
					<header class="flex items-baseline justify-between px-1">
						<h2 class="text-label-sm font-semibold tracking-wide text-muted uppercase">
							{group.label}
						</h2>
						<span class="tnum text-label-sm text-muted">{signedTotal(group.total)}</span>
					</header>

					<div class="rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
						<ul>
							{#each group.items as item, index (item.id)}
								<li
									class="animate-stagger {index > 0 ? 'border-t border-hairline/70' : ''}"
									style="animation-delay:{Math.min(index, 8) * 30}ms"
								>
									<TransactionRow
										transaction={item}
										currency={item.currency}
										href={`/movimientos/${item.id}`}
										showAccount
									/>
								</li>
							{/each}
						</ul>
					</div>
				</section>
			{/each}
		</div>

		{#if remaining > 0}
			<a
				href={withParams({ limit: String(data.limit + 25) })}
				data-sveltekit-noscroll
				class={buttonClass('tonal', 'lg', true, 'lg:max-w-sm')}
			>
				Ver {Math.min(25, remaining)} más
				<span class="text-label-sm font-normal text-muted">({remaining} restantes)</span>
			</a>
		{/if}
	{/if}
</div>

<Sheet title="Filtrar movimientos" bind:open={filtersOpen}>
	<form method="GET" action="/movimientos" class="space-y-4">
		<input type="hidden" name="mes" value={data.month ?? ''} />
		{#if data.filters.search}
			<input type="hidden" name="q" value={data.filters.search} />
		{/if}

		<div class="space-y-1.5">
			<p class="text-label-sm font-medium text-on-surface-variant">Tipo</p>
			<SegmentedControl
				name="tipo"
				size="sm"
				bind:value={typeFilter}
				options={[
					{ value: 'all', label: 'Todos' },
					{ value: 'income', label: 'Ingresos' },
					{ value: 'expense', label: 'Gastos' },
					{ value: 'transfer', label: 'Transf.' }
				]}
			/>
		</div>

		<div class="space-y-1.5">
			<span class="block text-label-sm font-medium text-on-surface-variant">Cuenta</span>
			<details
				class="group overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest"
			>
				<summary
					class="flex h-12 cursor-pointer list-none items-center gap-2 px-3 text-body text-ink [&::-webkit-details-marker]:hidden"
				>
					<Icon name="account_balance" size={18} class="text-muted-soft" />
					<span class="min-w-0 flex-1 truncate">{accountFilterName}</span>
					<Icon
						name="expand_more"
						size={20}
						class="text-muted transition-transform group-open:rotate-180"
					/>
				</summary>

				<div class="max-h-56 overflow-y-auto border-t border-hairline p-1.5">
					<label
						class="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-level-1/60 {accountFilter ===
						''
							? 'bg-primary/8'
							: ''}"
					>
						<input type="radio" name="cuenta" value="" bind:group={accountFilter} class="sr-only" />
						<Icon name="apps" size={18} class="text-muted" />
						<span class="min-w-0 flex-1 truncate text-body-sm text-ink">Todas las cuentas</span>
						{#if accountFilter === ''}
							<Icon name="check" size={18} class="text-primary" />
						{/if}
					</label>

					{#each data.accounts as account (account.id)}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-level-1/60 {accountFilter ===
							account.id
								? 'bg-primary/8'
								: ''}"
						>
							<input
								type="radio"
								name="cuenta"
								value={account.id}
								bind:group={accountFilter}
								class="sr-only"
							/>
							<Icon name={account.icon} size={18} class="text-muted" />
							<span class="min-w-0 flex-1 truncate text-body-sm text-ink">{account.name}</span>
							{#if accountFilter === account.id}
								<Icon name="check" size={18} class="text-primary" />
							{/if}
						</label>
					{/each}
				</div>
			</details>
		</div>

		<div class="space-y-1.5">
			<span class="block text-label-sm font-medium text-on-surface-variant">Categoría</span>
			<details
				class="group overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest"
			>
				<summary
					class="flex h-12 cursor-pointer list-none items-center gap-2 px-3 text-body text-ink [&::-webkit-details-marker]:hidden"
				>
					<Icon name="category" size={18} class="text-muted-soft" />
					<span class="min-w-0 flex-1 truncate">{categoryFilterName}</span>
					<Icon
						name="expand_more"
						size={20}
						class="text-muted transition-transform group-open:rotate-180"
					/>
				</summary>

				<div class="max-h-56 overflow-y-auto border-t border-hairline p-1.5">
					<label
						class="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-level-1/60 {categoryFilter ===
						''
							? 'bg-primary/8'
							: ''}"
					>
						<input
							type="radio"
							name="categoria"
							value=""
							bind:group={categoryFilter}
							class="sr-only"
						/>
						<Icon name="apps" size={18} class="text-muted" />
						<span class="min-w-0 flex-1 truncate text-body-sm text-ink">
							Todas las categorías
						</span>
						{#if categoryFilter === ''}
							<Icon name="check" size={18} class="text-primary" />
						{/if}
					</label>

					{#each data.categories as category (category.id)}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-level-1/60 {categoryFilter ===
							category.id
								? 'bg-primary/8'
								: ''}"
						>
							<input
								type="radio"
								name="categoria"
								value={category.id}
								bind:group={categoryFilter}
								class="sr-only"
							/>
							<span
								class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-level-1"
								style="color:{category.color}"
							>
								<Icon name={category.icon} size={16} />
							</span>
							<span class="min-w-0 flex-1 truncate text-body-sm text-ink">{category.name}</span>
							{#if categoryFilter === category.id}
								<Icon name="check" size={18} class="text-primary" />
							{/if}
						</label>
					{/each}
				</div>
			</details>
		</div>

		<div class="grid grid-cols-[auto_1fr] gap-2 pt-1">
			<a
				href={withParams({ tipo: null, cuenta: null, categoria: null })}
				class={buttonClass('ghost', 'lg')}
			>
				Limpiar
			</a>
			<button type="submit" class={buttonClass('primary', 'lg', true)}>Aplicar filtros</button>
		</div>
	</form>
</Sheet>
