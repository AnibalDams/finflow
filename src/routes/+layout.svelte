<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#faf8ff" />
</svelte:head>

<div class="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
	{@render children()}
</div>

<Toaster />
