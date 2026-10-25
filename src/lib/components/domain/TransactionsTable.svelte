<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';
	import { formatRelativeDay } from '#lib/utils/dates';
	import { TRANSACTION_TYPE_ICONS, TRANSACTION_TYPE_LABELS } from '#lib/utils/labels';
	import { formatSignedAmount } from '#lib/utils/money';
	import type { TransactionItem } from '#lib/types/domain';

	interface Props {
		items: TransactionItem[];
		currency?: string;
		showDate?: boolean;
		showAccount?: boolean;
		class?: string;
	}

	let {
		items,
		currency = 'USD',
		showDate = true,
		showAccount = true,
		class: className = ''
	}: Props = $props();

	function accentOf(item: TransactionItem): string {
		if (item.type === 'expense') return 'var(--color-tertiary)';
		if (item.type === 'income') return 'var(--color-primary)';
		return 'var(--color-secondary)';
	}

	function badgeOf(item: TransactionItem): string | null {
		if (item.type === 'transfer') {
			return item.counterAccountName ? `→ ${item.counterAccountName}` : 'Transferencia';
		}
		return item.categoryName;
	}

	function secondaryOf(item: TransactionItem): string {
		const base = item.notes?.trim() || TRANSACTION_TYPE_LABELS[item.type];
		return showAccount ? base : `${base} · ${item.accountName}`;
	}
</script>

<div class={cn('relative overflow-x-auto', className)}>
	<table class="w-full border-collapse text-left {showAccount ? 'min-w-[680px]' : 'min-w-[560px]'}">
		<caption class="sr-only">Listado de movimientos</caption>
		<thead>
			<tr
				class="border-b border-hairline text-label-sm font-semibold tracking-wide text-muted uppercase"
			>
				{#if showDate}
					<th scope="col" class="px-3 py-2.5 whitespace-nowrap">Fecha</th>
				{/if}
				<th scope="col" class="px-3 py-2.5">Concepto</th>
				<th scope="col" class="px-3 py-2.5">Categoría</th>
				{#if showAccount}
					<th scope="col" class="px-3 py-2.5">Cuenta</th>
				{/if}
				<th scope="col" class="px-3 py-2.5 text-right">Monto</th>
				<th scope="col" class="w-10 px-2 py-2.5"><span class="sr-only">Detalle</span></th>
			</tr>
		</thead>
		<tbody>
			{#each items as item (item.id)}
				{@const accent = item.categoryColor ?? accentOf(item)}
				{@const badge = badgeOf(item)}
				<tr class="border-b border-hairline/60 transition-colors last:border-0 hover:bg-level-1/50">
					{#if showDate}
						<td class="px-3 py-3 text-body-sm whitespace-nowrap text-muted">
							{formatRelativeDay(item.occurredAt)}
						</td>
					{/if}

					<td class="max-w-80 px-3 py-3">
						<a href={`/movimientos/${item.id}`} class="group flex min-w-0 items-center gap-3">
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-xl"
								style="background-color:color-mix(in srgb, {accent} 14%, transparent);color:{accent}"
								aria-hidden="true"
							>
								<Icon
									name={item.categoryIcon ?? TRANSACTION_TYPE_ICONS[item.type]}
									size={18}
									filled={item.type === 'income'}
								/>
							</span>
							<span class="min-w-0">
								<span
									class="block truncate text-label font-semibold text-ink group-hover:text-primary"
								>
									{item.concept}
								</span>
								<span class="block truncate text-body-sm text-muted">{secondaryOf(item)}</span>
							</span>
						</a>
					</td>

					<td class="px-3 py-3 whitespace-nowrap">
						{#if badge}
							<span
								class="inline-flex max-w-40 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-label-sm font-semibold"
								style="background-color:color-mix(in srgb, {accent} 12%, transparent);color:{accent}"
							>
								<span class="size-1.5 shrink-0 rounded-full" style="background-color:{accent}"
								></span>
								<span class="truncate">{badge}</span>
							</span>
						{:else}
							<span class="text-body-sm text-muted-soft">Sin categoría</span>
						{/if}
					</td>

					{#if showAccount}
						<td class="max-w-48 px-3 py-3">
							<span class="flex items-center gap-2 text-body-sm text-on-surface">
								<Icon name={item.accountIcon} size={16} class="shrink-0 text-muted" />
								<span class="truncate">{item.accountName}</span>
							</span>
						</td>
					{/if}

					<td
						class={cn(
							'px-3 py-3 text-right tnum text-label font-bold whitespace-nowrap',
							item.type === 'income'
								? 'text-primary'
								: item.type === 'transfer'
									? 'text-secondary'
									: 'text-ink'
						)}
					>
						{formatSignedAmount(item.amount, item.type, item.currency || currency)}
					</td>

					<td class="px-2 py-3 text-center">
						<a
							href={`/movimientos/${item.id}`}
							class="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-level-1 hover:text-ink"
							aria-label={`Ver detalle de ${item.concept}`}
						>
							<Icon name="chevron_right" size={18} />
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
