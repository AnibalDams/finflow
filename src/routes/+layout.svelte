<script lang="ts">
	import './layout.css';
	import { afterNavigate } from '$app/navigation';
	import UpdateBanner from '#lib/components/app/UpdateBanner.svelte';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import { swUpdate } from '#lib/stores/sw-update.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Busca una versión nueva del service worker en cada navegación del cliente.
	afterNavigate(() => {
		void swUpdate.check();
	});
</script>

<div class="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
	{@render children()}
</div>

<UpdateBanner />
<Toaster />
