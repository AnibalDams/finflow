<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import IconPicker from '#lib/components/ui/IconPicker.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { CATEGORY_ICON_GROUPS } from '#lib/utils/icons';
	import { COLOR_PALETTE } from '#lib/utils/labels';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const initialKind: 'expense' | 'income' =
		(values.kind as 'expense' | 'income' | undefined) ?? data.kind;

	let name = $state(values.name ?? '');
	let kind: 'expense' | 'income' = $state(initialKind);
	let icon = $state(values.icon ?? 'category');
	let color = $state(values.color ?? COLOR_PALETTE[0]);
	let saving = $state(false);
</script>

<PageHeader title="Nueva categoría" close centered backHref={data.volver} />

<form
	method="POST"
	class="space-y-5 px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: 'Categoría creada',
		onStart: () => (saving = true),
		onFinish: () => (saving = false)
	})}
>
	<input type="hidden" name="volver" value={data.volver} />

	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	<SegmentedControl
		name="kind"
		bind:value={kind}
		tone={kind === 'income' ? 'primary' : 'tertiary'}
		options={[
			{ value: 'expense', label: 'Gasto', icon: 'north_east' },
			{ value: 'income', label: 'Ingreso', icon: 'south_west' }
		]}
	/>

	<TextField
		label="Nombre de la categoría"
		name="name"
		icon="label"
		placeholder="Ej. Mascotas"
		bind:value={name}
		error={previous.name}
	/>

	<section class="space-y-2">
		<h2 class="text-label-sm font-medium text-on-surface-variant">Ícono</h2>
		<IconPicker name="icon" groups={CATEGORY_ICON_GROUPS} bind:value={icon} error={previous.icon} />
	</section>

	<section class="space-y-2">
		<h2 class="text-label-sm font-medium text-on-surface-variant">Color</h2>
		<div class="grid grid-cols-6 gap-2.5">
			{#each COLOR_PALETTE as swatch (swatch)}
				<label
					class="relative flex aspect-square cursor-pointer items-center justify-center rounded-full transition"
					style="background-color:{swatch}"
					title={swatch}
				>
					<input
						type="radio"
						name="color"
						value={swatch}
						checked={color === swatch}
						class="sr-only"
						onchange={() => (color = swatch)}
					/>
					{#if color === swatch}
						<Icon name="check" size={20} class="text-white" />
					{/if}
				</label>
			{/each}
		</div>
		{#if previous.color}
			<p class="text-body-sm font-medium text-tertiary">{previous.color}</p>
		{/if}
	</section>

	<div class="flex items-center gap-3 rounded-2xl bg-level-1/70 p-3">
		<span
			class="flex size-11 items-center justify-center rounded-full text-white"
			style="background-color:{color}"
		>
			<Icon name={icon} size={22} />
		</span>
		<div class="min-w-0">
			<p class="truncate text-title-sm text-ink">{name || 'Vista previa'}</p>
			<p class="text-body-sm text-muted">
				{kind === 'income' ? 'Categoría de ingreso' : 'Categoría de gasto'}
			</p>
		</div>
	</div>

	<button type="submit" class={buttonClass('primary', 'lg', true)} disabled={saving}>
		{#if saving}
			<Icon name="progress_activity" size={20} class="animate-spin" />
		{:else}
			<Icon name="check" size={20} />
		{/if}
		Crear categoría
	</button>
</form>
