<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import { swUpdate } from '#lib/stores/sw-update.svelte';
</script>

{#if swUpdate.updateReady}
	<div
		class="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-100 mx-auto w-full max-w-[430px] px-4"
	>
		<div
			class="animate-rise pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-inverse-surface px-3.5 py-2.5 text-inverse-on-surface shadow-elevated"
			role="status"
		>
			<Icon name="system_update" size={18} />
			<p class="min-w-0 flex-1 text-label">Nueva versión disponible</p>

			<button
				type="button"
				class="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-label-sm font-semibold text-on-primary transition active:scale-95 disabled:opacity-60"
				disabled={swUpdate.activating}
				onclick={() => swUpdate.activate()}
			>
				{#if swUpdate.activating}
					<Icon name="progress_activity" size={15} class="animate-spin" />
					Actualizando
				{:else}
					<Icon name="refresh" size={15} />
					Actualizar
				{/if}
			</button>
		</div>
	</div>
{/if}
