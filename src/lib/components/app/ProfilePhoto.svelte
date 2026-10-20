<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';

	interface Props {
		avatarUrl: string | null;
		hasAvatar: boolean;
		initials: string;
	}

	let { avatarUrl, hasAvatar, initials }: Props = $props();

	let uploading = $state(false);
	let removing = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let formElement = $state<HTMLFormElement | null>(null);

	function onFileChange(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		if (!input.files?.length) return;
		formElement?.requestSubmit();
	}

	function resetInput(): void {
		if (fileInput) fileInput.value = '';
	}

	function confirmRemove(event: SubmitEvent): void {
		if (!window.confirm('¿Quitar tu foto de perfil?')) event.preventDefault();
	}
</script>

<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
	<h2 class="flex items-center gap-2 text-title-sm text-ink">
		<Icon name="account_circle" size={18} class="text-secondary" />
		Foto de perfil
	</h2>

	<div class="flex items-center gap-4">
		<span
			class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-title-md font-bold text-primary"
		>
			{#if avatarUrl}
				<img src={avatarUrl} alt="Foto de perfil" class="size-full object-cover" />
			{:else}
				{initials}
			{/if}
		</span>

		<div class="min-w-0 flex-1 space-y-2">
			<form
				bind:this={formElement}
				method="POST"
				action="?/avatar"
				enctype="multipart/form-data"
				use:enhance={enhanceForm({
					success: 'Foto actualizada',
					onStart: () => (uploading = true),
					onFinish: () => {
						uploading = false;
						resetInput();
					}
				})}
			>
				<label
					class="{buttonClass('outline', 'sm')} cursor-pointer"
					class:pointer-events-none={uploading}
					class:opacity-60={uploading}
					aria-busy={uploading}
				>
					{#if uploading}
						<Icon name="progress_activity" size={16} class="animate-spin" />
					{:else}
						<Icon name="photo_camera" size={16} />
					{/if}
					Cambiar foto
					<input
						bind:this={fileInput}
						type="file"
						name="avatar"
						accept="image/png,image/jpeg,image/webp"
						class="sr-only"
						onchange={onFileChange}
					/>
				</label>
			</form>

			{#if hasAvatar}
				<form
					method="POST"
					action="?/removeAvatar"
					use:enhance={enhanceForm({
						success: 'Foto eliminada',
						onStart: () => (removing = true),
						onFinish: () => (removing = false)
					})}
					onsubmit={confirmRemove}
				>
					<button type="submit" class={buttonClass('ghost', 'sm')} disabled={removing}>
						{#if removing}
							<Icon name="progress_activity" size={16} class="animate-spin" />
						{:else}
							<Icon name="delete" size={16} />
						{/if}
						Quitar foto
					</button>
				</form>
			{/if}
		</div>
	</div>

	<p class="text-body-sm text-muted">PNG, JPG o WEBP · máximo 5 MB.</p>
</section>
