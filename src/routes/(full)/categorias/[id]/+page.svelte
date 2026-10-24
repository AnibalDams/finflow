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

	const category = $derived(data.category);
	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});

	let name = $state(category.name);
	let kind: 'expense' | 'income' = $state(category.kind);
	let icon = $state(category.icon);
	let color = $state(category.color);
	let saving = $state(false);
	let deleting = $state(false);
	let archiveSaving = $state(false);

	function confirmDelete(event: MouseEvent): void {
		const button = event.currentTarget as HTMLButtonElement;
		if (!window.confirm(`¿Eliminar la categoría ${category.name}?`)) return;
		deleting = true;
		button.form?.requestSubmit();
	}
</script>

<PageHeader title={category.name} backHref={data.volver} />

<div class="space-y-4 px-4 pt-4 pb-10">
	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	{#if category.isArchived}
		<div class="flex items-center gap-2 rounded-xl bg-level-1 px-3 py-2.5 text-body-sm text-muted">
			<Icon name="archive" size={18} />
			Esta categoría está archivada y no aparece en los formularios.
		</div>
	{/if}

	<form
		method="POST"
		action="?/update"
		class="space-y-5"
		use:enhance={enhanceForm({
			success: 'Categoría actualizada',
			onStart: () => (saving = true),
			onFinish: () => (saving = false)
		})}
	>
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
			bind:value={name}
			error={previous.name}
		/>

		<section class="space-y-2">
			<h2 class="text-label-sm font-medium text-on-surface-variant">Ícono</h2>
			<IconPicker
				name="icon"
				groups={CATEGORY_ICON_GROUPS}
				bind:value={icon}
				error={previous.icon}
			/>
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
			Guardar cambios
		</button>
	</form>

	<section class="space-y-2">
		<form
			method="POST"
			action="?/archive"
			use:enhance={enhanceForm({
				success: category.isArchived ? 'Categoría reactivada' : 'Categoría archivada',
				onStart: () => (archiveSaving = true),
				onFinish: () => (archiveSaving = false)
			})}
		>
			<input type="hidden" name="volver" value={data.volver} />
			<input type="hidden" name="archived" value={category.isArchived ? 'false' : 'true'} />
			<button type="submit" class={buttonClass('outline', 'md', true)} disabled={archiveSaving}>
				{#if archiveSaving}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name={category.isArchived ? 'unarchive' : 'archive'} size={18} />
				{/if}
				{category.isArchived ? 'Reactivar categoría' : 'Archivar categoría'}
			</button>
		</form>

		<form
			method="POST"
			action="?/delete"
			use:enhance={enhanceForm({ success: 'Categoría eliminada' })}
		>
			<input type="hidden" name="volver" value={data.volver} />
			<button
				type="button"
				class={buttonClass('danger', 'md', true)}
				disabled={deleting}
				onclick={confirmDelete}
			>
				{#if deleting}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="delete" size={18} />
				{/if}
				Eliminar categoría
			</button>
		</form>
	</section>
</div>
