<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { Account } from '#lib/types/domain';
	import { cn } from '#lib/utils/cn';
	import { formatMoney } from '#lib/utils/money';

	interface Props {
		accounts: Account[];
		name: string;
		value?: string;
		label: string;
		/** Prefijo de la línea informativa con el saldo. */
		hintPrefix?: string;
		placeholder?: string;
		error?: string;
		tone?: 'primary' | 'tertiary' | 'secondary';
		disabled?: boolean;
		class?: string;
	}

	let {
		accounts,
		name,
		value = $bindable(''),
		label,
		hintPrefix = 'Saldo disp:',
		placeholder = 'Selecciona una cuenta',
		error,
		tone = 'primary',
		disabled = false,
		class: className = ''
	}: Props = $props();

	const TONE: Record<string, string> = {
		primary: 'bg-primary/12 text-primary',
		tertiary: 'bg-tertiary/12 text-tertiary',
		secondary: 'bg-secondary/12 text-secondary'
	};

	const selected = $derived(accounts.find((account) => account.id === value) ?? null);
</script>

<div class={cn('space-y-1.5', className)}>
	<label
		class={cn(
			'relative flex items-center gap-3 rounded-2xl border bg-surface-container-lowest p-3 shadow-card transition',
			error ? 'border-tertiary/60' : 'border-hairline focus-within:border-secondary',
			disabled && 'opacity-60'
		)}
	>
		<span class="flex size-10 shrink-0 items-center justify-center rounded-full {TONE[tone]}">
			<Icon name={selected?.icon ?? 'account_balance_wallet'} size={20} />
		</span>

		<span class="min-w-0 flex-1">
			<span class="block text-label-sm text-muted">{label}</span>
			<span class="block truncate text-title-sm text-ink">
				{selected ? selected.name : placeholder}
			</span>
			{#if selected}
				<span class="block text-body-sm font-medium text-primary">
					{hintPrefix} {formatMoney(selected.balance, selected.currency)}
				</span>
			{/if}
		</span>

		<Icon name="expand_more" size={20} class="shrink-0 text-muted" />

		<select
			{name}
			{disabled}
			bind:value
			class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			aria-label={label}
		>
			<option value="" disabled>{placeholder}</option>
			{#each accounts as account (account.id)}
				<option value={account.id}>{account.name} · {formatMoney(account.balance, account.currency)}</option>
			{/each}
		</select>
	</label>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
