<script lang="ts">
	import { onDestroy } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props {
		name: string;
		label?: string;
		accept?: string;
		hint?: string;
		error?: string;
		/** Texto del botón. */
		action?: string;
		class?: string;
	}

	let {
		name,
		label,
		accept = 'image/png,image/jpeg,image/webp,application/pdf',
		hint,
		error,
		action = 'Elegir archivo',
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const inputId = `file-${uid}`;

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

	/** Quita el archivo del input real (el input permanece en el DOM para conservar el FileList). */
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
	{#if label}
		<p class="text-label-sm font-medium text-on-surface-variant">{label}</p>
	{/if}

	<input id={inputId} type="file" {name} {accept} class="sr-only" onchange={onChange} />

	<div
		class={cn(
			'rounded-2xl border border-dashed p-3 transition',
			error ? 'border-tertiary/60 bg-tertiary/4' : 'border-outline-variant bg-level-1/50'
		)}
	>
		{#if file}
			<div class="flex items-center gap-3">
				{#if previewUrl}
					<img
						src={previewUrl}
						alt="Vista previa del comprobante"
						class="size-14 rounded-xl object-cover"
					/>
				{:else}
					<span
						class="flex size-14 items-center justify-center rounded-xl bg-surface-container-lowest text-muted"
					>
						<Icon name="description" size={24} />
					</span>
				{/if}

				<div class="min-w-0 flex-1">
					<p class="truncate text-label text-ink">{file.name}</p>
					<p class="text-body-sm text-muted">{sizeLabel}</p>
				</div>

				<label
					for={inputId}
					class="flex size-9 cursor-pointer items-center justify-center rounded-full text-secondary transition hover:bg-level-1"
					title="Cambiar archivo"
				>
					<Icon name="swap_horiz" size={18} />
				</label>

				<button
					type="button"
					class="flex size-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1"
					aria-label="Quitar archivo"
					onclick={clear}
				>
					<Icon name="close" size={18} />
				</button>
			</div>
		{:else}
			<label for={inputId} class="flex cursor-pointer items-center gap-3">
				<span
					class="flex size-11 items-center justify-center rounded-xl bg-surface-container-lowest text-primary"
				>
					<Icon name="upload_file" size={22} />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-label text-ink">{action}</span>
					<span class="block text-body-sm text-muted">PNG, JPG o PDF · hasta 10 MB</span>
				</span>
			</label>
		{/if}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
