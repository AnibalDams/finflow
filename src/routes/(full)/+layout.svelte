<script lang="ts">
	import { navigating, page } from '$app/state';
	import NavProgress from '#lib/components/app/NavProgress.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<NavProgress top="env(safe-area-inset-top)" topLg="0px" />

<main
	class="flex w-full flex-1 flex-col pt-safe pb-safe transition-opacity duration-150 lg:py-10"
	class:opacity-60={navigating.to !== null}
	aria-busy={navigating.to !== null}
>
	{#key page.route.id}
		<div
			class="animate-page-in flex w-full flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-4xl lg:flex-none lg:rounded-3xl lg:border lg:border-hairline/70 lg:bg-surface-container-lowest lg:shadow-card"
		>
			{@render children()}
		</div>
	{/key}
</main>
