<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { currencySymbol, formatMoney } from '#lib/utils/money';
	import { parseAmountInput } from '#lib/utils/money';

	type Tone = 'primary' | 'tertiary' | 'secondary';

	interface Props {
		name: string;
		value?: string;
		currency?: string;
		label?: string;
		tone?: Tone;
		/** Sugerencias de suma rápida. */
		quickAmounts?: number[];
		error?: string;
		autofocus?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		name,
		value = $bindable(''),
		currency = 'USD',
		label = 'Monto a registrar',
		tone = 'primary',
		quickAmounts = [10, 25, 50, 100],
		error,
		autofocus = false,
		disabled = false,
		class: className = ''
	}: Props = $props();

	const TONE_TEXT: Record<Tone, string> = {
		primary: 'text-primary',
		tertiary: 'text-tertiary',
		secondary: 'text-secondary'
	};

	let input = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autofocus) input?.focus();
	});

	function add(amount: number): void {
		const current = parseAmountInput(value) ?? 0;
		value = (Math.round((current + amount) * 100) / 100).toFixed(2);
		input?.focus();
	}
</script>

<div class={cn('space-y-1.5', className)}>
	<div
		class={cn(
			'rounded-2xl border bg-surface-container-lowest px-4 py-4 shadow-card transition',
			error
				? 'border-tertiary/60'
				: 'border-hairline focus-within:border-secondary focus-within:ring-3 focus-within:ring-secondary/12'
		)}
	>
		<p class="text-center text-label-sm font-medium tracking-[0.12em] text-muted uppercase">
			{label}
		</p>

		<div class="mx-auto mt-2 flex max-w-72 items-center gap-2">
			<span class="shrink-0 text-title-md font-bold {TONE_TEXT[tone]}">
				{currency} {currencySymbol(currency)}
			</span>
			<input
				bind:this={input}
				{name}
				bind:value
				{disabled}
				type="text"
				inputmode="decimal"
				autocomplete="off"
				placeholder="0.00"
				aria-label={label}
				aria-invalid={error ? 'true' : undefined}
				class="tnum min-w-0 flex-1 bg-transparent text-right text-amount font-bold text-ink placeholder:text-outline-variant focus:outline-none"
			/>
		</div>

		{#if quickAmounts.length > 0}
			<div class="mt-3 flex flex-wrap justify-center gap-1.5">
				{#each quickAmounts as amount (amount)}
					<button
						type="button"
						class="rounded-full bg-level-1 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-container active:scale-95"
						onclick={() => add(amount)}
					>
						+{formatMoney(amount, currency)}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
