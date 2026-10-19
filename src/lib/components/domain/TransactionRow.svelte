<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { TransactionItem } from '#lib/types/domain';
	import { cn } from '#lib/utils/cn';
	import { formatRelativeDay } from '#lib/utils/dates';
	import { TRANSACTION_TYPE_ICONS } from '#lib/utils/labels';
	import { formatSignedAmount } from '#lib/utils/money';

	interface Props {
		transaction: TransactionItem;
		currency?: string;
		href?: string;
		class?: string;
		/** Muestra la cuenta en la línea secundaria en lugar de la fecha. */
		showAccount?: boolean;
	}

	let {
		transaction,
		currency = 'USD',
		href,
		class: className = '',
		showAccount = false
	}: Props = $props();

	const icon = $derived(transaction.categoryIcon ?? TRANSACTION_TYPE_ICONS[transaction.type]);
	const accent = $derived(
		transaction.type === 'expense'
			? 'var(--color-tertiary)'
			: transaction.type === 'income'
				? 'var(--color-primary)'
				: 'var(--color-secondary)'
	);
	const amountClass = $derived(
		transaction.type === 'expense'
			? 'text-ink'
			: transaction.type === 'income'
				? 'text-primary'
				: 'text-secondary'
	);
	const badge = $derived(
		transaction.type === 'transfer'
			? transaction.counterAccountName
				? `→ ${transaction.counterAccountName}`
				: 'Transferencia'
			: transaction.categoryName
	);
	const secondary = $derived(
		showAccount ? transaction.accountName : formatRelativeDay(transaction.occurredAt)
	);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class={cn(
		'flex items-center gap-3 py-3.5 transition-colors',
		href && 'pressable tap-highlight-none hover:bg-level-1/60',
		className
	)}
>
	<span
		class="flex size-11 shrink-0 items-center justify-center rounded-full"
		style="background-color:color-mix(in srgb, {transaction.categoryColor ??
			accent} 14%, transparent);color:{transaction.categoryColor ?? accent}"
		aria-hidden="true"
	>
		<Icon name={icon} size={20} filled={transaction.type === 'income'} />
	</span>

	<span class="min-w-0 flex-1">
		<span class="flex items-baseline justify-between gap-2">
			<span class="truncate text-label-lg font-semibold text-ink">{transaction.concept}</span>
			<span class="tnum shrink-0 text-label-lg font-bold {amountClass}">
				{formatSignedAmount(transaction.amount, transaction.type, currency)}
			</span>
		</span>

		<span class="mt-0.5 flex items-center gap-1.5">
			{#if badge}
				<span
					class="max-w-32 shrink-0 truncate rounded-full px-2 py-0.5 text-label-sm font-medium"
					style="background-color:color-mix(in srgb, {transaction.categoryColor ??
						accent} 12%, transparent);color:{transaction.categoryColor ?? accent}"
				>
					{badge}
				</span>
			{/if}
			<span class="truncate text-body-sm text-muted">{secondary}</span>
		</span>
	</span>

	{#if href}
		<Icon name="chevron_right" size={18} class="shrink-0 text-muted-soft" />
	{/if}
</svelte:element>
