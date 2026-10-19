<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main class="flex w-full flex-1 flex-col pt-safe pb-safe">
	{@render children()}
</main>
