<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const form = $derived(page.form as FormState | null | undefined);

	let saving = $state(false);
</script>

<Card class="p-5">
	<div class="mb-4 space-y-0.5">
		<h2 class="text-title-md text-ink">Nueva contraseña</h2>
		<p class="text-body-sm text-muted">Define una contraseña segura para tu cuenta.</p>
	</div>

	{#if !data.hasRecoverySession}
		<div class="flex flex-col gap-3">
			<div class="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-amber-800">
				<Icon name="link_off" size={20} />
				<p class="text-body-sm">
					Este enlace ya no es válido o expiró. Solicita uno nuevo para continuar.
				</p>
			</div>
			<a href={resolve('/(auth)/recuperar')}>
				<Button block icon="restart_alt">Solicitar nuevo enlace</Button>
			</a>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={enhanceForm({
				onStart: () => (saving = true),
				onFinish: () => (saving = false)
			})}
			class="space-y-4"
		>
			<TextField
				label="Contraseña nueva"
				name="password"
				type="password"
				autocomplete="new-password"
				placeholder="Mínimo 12 caracteres"
				icon="lock"
				required
				error={form?.errors?.password}
			/>

			<TextField
				label="Repite la contraseña"
				name="passwordConfirm"
				type="password"
				autocomplete="new-password"
				placeholder="••••••••"
				icon="lock_reset"
				required
				error={form?.errors?.passwordConfirm}
			/>

			<Button type="submit" block size="lg" icon="save" loading={saving}>Guardar contraseña</Button>
		</form>
	{/if}
</Card>
