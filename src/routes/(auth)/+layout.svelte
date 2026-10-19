<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col bg-background">
	<header class="flex flex-col items-center gap-2.5 px-6 pt-safe pt-12 pb-6 text-center">
		<span
			class="flex size-13 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-fab"
		>
			<Icon name="account_balance_wallet" size={26} filled />
		</span>
		<div>
			<h1 class="text-title-lg tracking-tight text-ink">FinFlow</h1>
			<p class="mt-0.5 text-body text-muted">Tus finanzas personales, claras y bajo control.</p>
		</div>
	</header>

	<div class="flex-1 px-5 pb-safe pb-10">
		{@render children()}
	</div>
</div>
