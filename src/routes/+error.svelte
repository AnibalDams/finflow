<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import type { ErrorProps } from './$types';

	let { error }: ErrorProps = $props();

	const heading = $derived(error.status === 404 ? 'Ups, te perdiste' : 'Algo salió mal');
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
	<span class="flex size-16 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
		<Icon name={error.status === 404 ? 'explore_off' : 'report'} size={30} />
	</span>
	<div class="space-y-1.5">
		<h1 class="text-title-md text-ink">{heading}</h1>
		<p class="text-body text-muted">{error.message}</p>
		<p class="text-body-sm text-muted-soft">Código {error.code ?? error.status}</p>
	</div>
	<a href="/" class="mt-1">
		<Button icon="home" variant="primary">Volver al inicio</Button>
	</a>
</div>
