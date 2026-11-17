<script lang="ts">
	import SeasonalSnow from './SeasonalSnow.svelte';

	interface Props {
		/** Id del pack activo (`navidad`, …) o `null`. */
		season: string | null;
	}

	let { season }: Props = $props();
</script>

<!--
	Capa ambiental de cada temporada. Un pack nuevo añade aquí su efecto
	(por ejemplo, hojas para otoño o fuegos artificiales para Año Nuevo).
-->
{#if season === 'navidad'}
	<SeasonalSnow />
{/if}
