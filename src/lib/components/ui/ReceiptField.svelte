<script lang="ts">
	import { onDestroy } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props {
		name: string;
		error?: string;
		hint?: string;
		class?: string;
	}

	let { name, error, hint, class: className = '' }: Props = $props();

	const uid = $props.id();
	const inputId = `receipt-${uid}`;

	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);

	function release(): void {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
	}

	function onChange(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const selected = input.files?.[0] ?? null;
		file = selected;

		release();
		if (selected && selected.type.startsWith('image/')) previewUrl = URL.createObjectURL(selected);
	}

	function clear(): void {
		const input = document.getElementById(inputId) as HTMLInputElement | null;
		if (input) input.value = '';
		file = null;
		release();
	}

	const sizeLabel = $derived(file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : null);

	onDestroy(release);
</script>

<div class={cn('space-y-1.5', className)}>
	<!-- El input permanece montado para conservar el archivo seleccionado. -->
	<input
		id={inputId}
		type="file"
		{name}
		accept="image/png,image/jpeg,image/webp,application/pdf"
		class="sr-only"
		onchange={onChange}
	/>

	{#if file}
		<div
			class="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-container-lowest p-3 shadow-card"
		>
			{#if previewUrl}
				<img src={previewUrl} alt="Vista previa del comprobante" class="size-10 rounded-full object-cover" />
			{:else}
				<span class="flex size-10 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="description" size={20} />
				</span>
			{/if}

			<div class="min-w-0 flex-1">
				<p class="truncate text-title-sm text-ink">{file.name}</p>
				<p class="text-body-sm text-muted">Comprobante · {sizeLabel}</p>
			</div>

			<label
				for={inputId}
				class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary transition hover:bg-level-1"
				title="Cambiar archivo"
			>
				<Icon name="swap_horiz" size={18} />
			</label>

			<button
				type="button"
				class="flex size-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1"
				aria-label="Quitar comprobante"
				onclick={clear}
			>
				<Icon name="delete" size={18} />
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-3 rounded-2xl bg-secondary/8 p-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
				<Icon name="document_scanner" size={22} />
			</span>

			<div class="min-w-0 flex-1">
				<p class="text-title-sm text-ink">Adjuntar ticket</p>
				<p class="truncate text-body-sm text-muted">Foto o PDF · monto manual</p>
			</div>

			<label
				for={inputId}
				class="shrink-0 cursor-pointer rounded-full bg-secondary px-4 py-2 text-label text-white transition hover:bg-secondary/90"
			>
				Subir
			</label>
		</div>
	{/if}

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
