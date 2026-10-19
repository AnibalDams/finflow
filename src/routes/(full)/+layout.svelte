<script lang="ts">
	import { navigating, page } from '$app/state';
	import NavProgress from '#lib/components/app/NavProgress.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<NavProgress top="env(safe-area-inset-top)" />

<main
	class="flex w-full flex-1 flex-col pt-safe pb-safe transition-opacity duration-150"
	class:opacity-60={navigating.to !== null}
	aria-busy={navigating.to !== null}
>
	{#key page.route.id}
		<div class="animate-page-in flex w-full flex-1 flex-col">
			{@render children()}
		</div>
	{/key}
</main>
