<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import OptionSheet from '#lib/components/ui/OptionSheet.svelte';
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
		required?: boolean;
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
		required = false,
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const TONE: Record<string, string> = {
		primary: 'bg-primary/12 text-primary',
		tertiary: 'bg-tertiary/12 text-tertiary',
		secondary: 'bg-secondary/12 text-secondary'
	};

	const selected = $derived(accounts.find((account) => account.id === value) ?? null);

	const options = $derived(
		accounts.map((account) => ({
			value: account.id,
			label: account.name,
			description: `${hintPrefix} ${formatMoney(account.balance, account.currency)}`,
			icon: account.icon
		}))
	);
</script>

<div class={cn('space-y-1.5', className)}>
	<button
		type="button"
		bind:this={trigger}
		class={cn(
			'pressable flex w-full items-center gap-3 rounded-2xl border bg-surface-container-lowest p-3 text-left shadow-card transition',
			error ? 'border-tertiary/60' : 'border-hairline hover:border-outline-variant',
			disabled && 'pointer-events-none opacity-60'
		)}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={`${label}: ${selected ? selected.name : placeholder}`}
		{disabled}
		onclick={() => (open = true)}
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
	</button>

	<OptionSheet
		bind:open
		title={label}
		{name}
		{label}
		{tone}
		{required}
		returnFocus={trigger}
		bind:value
		options={options}
	/>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
