<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';

	const form = $derived(page.form as (FormState & { sent?: boolean }) | null | undefined);
	const sent = $derived(form?.sent === true);

	let saving = $state(false);
</script>

<div class="space-y-4">
	{#if sent}
		<Card class="p-5">
			<div class="flex flex-col items-center gap-3 py-4 text-center">
				<span class="flex size-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
					<Icon name="forward_to_inbox" size={28} filled />
				</span>
				<h2 class="text-title-md text-ink">Enlace enviado</h2>
				<p class="text-body text-muted">
					Si <span class="font-semibold text-ink">{form?.values?.email}</span> corresponde a una cuenta,
					recibirás un enlace para restablecer tu contraseña.
				</p>
				<a href="/login" class="mt-1 text-label-sm font-semibold text-primary">
					Volver a iniciar sesión
				</a>
			</div>
		</Card>
	{:else}
		<Card class="p-5">
			<div class="mb-4 space-y-0.5">
				<h2 class="text-title-md text-ink">Recuperar acceso</h2>
				<p class="text-body-sm text-muted">Te enviaremos un enlace para crear una contraseña nueva.</p>
			</div>

			<form
				method="POST"
				use:enhance={enhanceForm({
					onStart: () => (saving = true),
					onFinish: () => (saving = false)
				})}
				class="space-y-4"
			>
				<TextField
					label="Correo electrónico"
					name="email"
					type="email"
					inputmode="email"
					autocomplete="email"
					placeholder="tu@correo.com"
					icon="mail"
					required
					value={form?.values?.email ?? ''}
					error={form?.errors?.email}
				/>

				<Button type="submit" block size="lg" icon="send" loading={saving}>Enviar enlace</Button>
			</form>
		</Card>

		<p class="text-center text-body text-muted">
			<a href="/login" class="font-semibold text-primary">Volver al inicio de sesión</a>
		</p>
	{/if}
</div>
