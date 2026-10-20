<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { install } from '#lib/stores/install.svelte';

	let prompting = $state(false);
	let mounted = $state(false);

	// Evita diferencias de hidratación: el estado real se lee tras montar.
	onMount(() => {
		mounted = true;
	});

	async function startInstall(): Promise<void> {
		if (prompting) return;
		prompting = true;
		try {
			await install.prompt();
		} finally {
			prompting = false;
		}
	}
</script>

<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
	<h2 class="flex items-center gap-2 text-title-sm text-ink">
		<Icon name="add_to_home_screen" size={18} class="text-secondary" />
		Instalar aplicación
	</h2>

	{#if !mounted}
		<p class="text-body-sm text-muted">
			Añade FinFlow a tu pantalla de inicio para abrirla como una app.
		</p>
	{:else if install.installed}
		<div
			class="flex items-start gap-2.5 rounded-xl bg-primary/8 p-3 text-body-sm text-on-surface-variant"
		>
			<Icon name="check_circle" size={18} class="mt-0.5 shrink-0 text-primary" filled />
			<p>FinFlow ya está instalada. Ábrela desde tu pantalla de inicio.</p>
		</div>
	{:else}
		<p class="text-body-sm text-muted">
			Tenla a mano y ábrela en pantalla completa, sin pasar por la barra del navegador.
		</p>

		{#if install.canInstall}
			<button
				type="button"
				class={buttonClass('primary', 'md', true)}
				disabled={prompting}
				onclick={startInstall}
			>
				{#if prompting}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="install_mobile" size={18} />
				{/if}
				Instalar FinFlow
			</button>
		{:else if install.ios}
			<div class="rounded-xl bg-secondary/8 p-3 text-body-sm text-on-surface-variant">
				<p class="font-semibold text-ink">En iPhone o iPad</p>
				<p class="mt-1">
					Abre FinFlow en Safari, toca <span class="font-semibold">Compartir</span> y elige
					<span class="font-semibold">Añadir a pantalla de inicio</span>.
				</p>
			</div>
		{:else}
			<div class="rounded-xl bg-level-1/70 p-3 text-body-sm text-on-surface-variant">
				Usa el menú de tu navegador y elige
				<span class="font-semibold">Instalar aplicación</span> o
				<span class="font-semibold">Añadir a pantalla de inicio</span>.
			</div>
		{/if}
	{/if}
</section>
