<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { afterNavigate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import UpdateBanner from '#lib/components/app/UpdateBanner.svelte';
	import SeasonalLayer from '#lib/components/seasonal/SeasonalLayer.svelte';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import { swUpdate } from '#lib/stores/sw-update.svelte';
	import { pageTitle } from '#lib/utils/titles';
	import { currentTimezoneOffset, setTimezoneCookie } from '#lib/utils/timezone';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const title = $derived(pageTitle(page.url.pathname));

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

<svelte:head>
	<!--
		Tema resuelto en el servidor (`resolveTheme`). Sin JavaScript: el modo
		`sistema` se decide con `prefers-color-scheme` y la especificidad
		`:root:root` evita depender del orden de inserción del CSS.
	-->
	<title>{title}</title>
	<svelte:element this={"style"} id="ff-theme">{data.theme.css}</svelte:element>
	{#each data.theme.meta as entry (entry.media ?? 'default')}
		<meta name="theme-color" media={entry.media} content={entry.color} />
	{/each}
</svelte:head>

<div
	class="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background lg:max-w-none"
	data-season={data.season?.id}
>
	{@render children()}
</div>

<SeasonalLayer season={data.season?.id ?? null} />

<UpdateBanner />
<Toaster />
