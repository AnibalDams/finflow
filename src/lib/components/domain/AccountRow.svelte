<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';
	import { ACCOUNT_KIND_LABELS } from '#lib/utils/labels';
	import { formatMoney } from '#lib/utils/money';
	import type { Account } from '#lib/types/domain';

	interface Props {
		account: Account;
		href: string;
		archived?: boolean;
		compact?: boolean;
	}

	let { account, href, archived = false, compact = false }: Props = $props();
</script>

<a
	{href}
	class={cn(
		'flex items-center gap-3 rounded-2xl border p-3.5 transition',
		archived
			? 'border-hairline/70 bg-level-1/50 opacity-80 hover:border-outline-variant'
			: 'pressable border-hairline/70 bg-surface-container-lowest shadow-card hover:border-secondary/40',
		compact && 'p-3'
	)}
>
	<span
		class={cn(
			'flex shrink-0 items-center justify-center rounded-xl',
			compact ? 'size-10' : 'size-11',
			archived ? 'bg-level-1 text-muted' : 'bg-secondary/10 text-secondary'
		)}
	>
		<Icon name={account.icon} size={compact ? 19 : 22} />
	</span>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5">
			<p
				class={cn(
					'truncate font-semibold',
					compact ? 'text-body-sm' : 'text-body',
					archived ? 'text-on-surface-variant' : 'text-ink'
				)}
			>
				{account.name}
			</p>
			{#if account.isPrimary && !archived}
				<span
					class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary"
				>
					Principal
				</span>
			{/if}
			{#if archived}
				<span
					class="shrink-0 rounded-full bg-level-1 px-2 py-0.5 text-label-sm font-semibold text-muted"
				>
					Archivada
				</span>
			{/if}
		</div>
		<p class="truncate text-body-sm text-muted">
			{ACCOUNT_KIND_LABELS[account.kind]} · {account.currency}
		</p>
	</div>

	<div class="shrink-0 text-right">
		<p
			class={cn(
				'tnum font-bold',
				compact ? 'text-body-sm' : 'text-body',
				archived ? 'text-muted' : 'text-ink'
			)}
		>
			{formatMoney(account.balance, account.currency)}
		</p>
		<p class="text-label-sm text-muted">
			{archived ? 'Archivada' : `Inicial ${formatMoney(account.openingBalance, account.currency)}`}
		</p>
	</div>

	<Icon name="chevron_right" size={18} class="hidden shrink-0 text-muted-soft lg:block" />
</a>
