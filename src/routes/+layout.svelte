<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { afterNavigate, invalidateAll } from '$app/navigation';
	import UpdateBanner from '#lib/components/app/UpdateBanner.svelte';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import { swUpdate } from '#lib/stores/sw-update.svelte';
	import { currentTimezoneOffset, setTimezoneCookie } from '#lib/utils/timezone';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Busca una versión nueva del service worker en cada navegación del cliente.
	afterNavigate(() => {
		void swUpdate.check();
	});

	onMount(() => {
		// El primer render del servidor no conoce la zona: se refresca una vez
		// con la cookie del navegador para que los rangos sean locales.
		const offset = currentTimezoneOffset();
		setTimezoneCookie(offset);

		if (data.tzOffset !== offset) {
			void invalidateAll();
		}
	});
</script>

<div class="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
	{@render children()}
</div>

<UpdateBanner />
<Toaster />
