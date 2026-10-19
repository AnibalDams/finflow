<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';

	const form = $derived(page.form as FormState | null | undefined);
	const confirmNotice = $derived(page.url.searchParams.get('error') === 'confirm');

	let saving = $state(false);
</script>

<div class="space-y-4">
	{#if confirmNotice}
		<div class="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-amber-800">
			<Icon name="mark_email_unread" size={20} />
			<p class="text-body-sm">
				No pudimos confirmar el enlace. Solicita uno nuevo desde
				<a href="/recuperar" class="font-semibold underline">recuperar acceso</a>.
			</p>
		</div>
	{/if}

	<Card class="p-5">
		<div class="mb-4 space-y-0.5">
			<h2 class="text-title-md text-ink">Inicia sesión</h2>
			<p class="text-body-sm text-muted">Accede con tu correo y contraseña.</p>
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

			<TextField
				label="Contraseña"
				name="password"
				type="password"
				autocomplete="current-password"
				placeholder="••••••••"
				icon="lock"
				required
				error={form?.errors?.password}
			/>

			<div class="flex justify-end">
				<a href="/recuperar" class="text-label-sm font-semibold text-secondary">
					¿Olvidaste tu contraseña?
				</a>
			</div>

			<Button type="submit" block size="lg" icon="login" loading={saving}>Entrar</Button>
		</form>
	</Card>

	<p class="text-center text-body text-muted">
		¿No tienes cuenta?
		<a href="/registro" class="font-semibold text-primary">Crear cuenta</a>
	</p>
</div>
