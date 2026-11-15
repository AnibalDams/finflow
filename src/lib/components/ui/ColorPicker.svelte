<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { COLOR_PALETTE } from '#lib/utils/labels';
	import Icon from './Icon.svelte';

	interface Props {
		/** Nombre del campo que viaja en el formulario. */
		name: string;
		/** Color seleccionado (enlazable). */
		value?: string;
		/** Paleta a mostrar; por defecto la del sistema de diseño. */
		colors?: string[];
		error?: string;
		class?: string;
	}

	let {
		name,
		value = $bindable(''),
		colors = COLOR_PALETTE,
		error,
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('space-y-2', className)}>
	<div class="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
		{#each colors as swatch (swatch)}
			<label
				class={cn(
					'relative flex size-10 cursor-pointer items-center justify-center rounded-full transition',
					'focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2 focus-within:ring-offset-surface-container-lowest',
					value === swatch &&
						'ring-2 ring-ink/25 ring-offset-2 ring-offset-surface-container-lowest'
				)}
				style="background-color:{swatch}"
				title={swatch}
			>
				<input
					type="radio"
					{name}
					value={swatch}
					checked={value === swatch}
					class="sr-only"
					aria-label={swatch}
					onchange={() => (value = swatch)}
				/>
				{#if value === swatch}
					<Icon name="check" size={18} class="text-white" />
				{/if}
			</label>
		{/each}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
