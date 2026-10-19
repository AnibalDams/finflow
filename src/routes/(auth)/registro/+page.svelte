<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import SelectField from '#lib/components/ui/SelectField.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { CURRENCY_OPTIONS } from '#lib/utils/labels';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const form = $derived(page.form as (FormState & { needsConfirmation?: boolean }) | null | undefined);
	const waitingForEmail = $derived(form?.needsConfirmation === true);

	let saving = $state(false);
</script>

<div class="space-y-4">
	{#if waitingForEmail}
		<Card class="p-5">
			<div class="flex flex-col items-center gap-3 py-4 text-center">
				<span class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Icon name="mark_email_read" size={28} filled />
				</span>
				<h2 class="text-title-md text-ink">Revisa tu correo</h2>
				<p class="text-body text-muted">
					Enviamos un enlace de confirmación a
					<span class="font-semibold text-ink">{form?.values?.email}</span>. Ábrelo para activar tu
					cuenta y empezar a registrar movimientos.
				</p>
				<a href="/login" class="mt-1 text-label-sm font-semibold text-primary">Volver a iniciar sesión</a>
			</div>
		</Card>
	{:else}
		<Card class="p-5">
			<div class="mb-4 space-y-0.5">
				<h2 class="text-title-md text-ink">Crea tu cuenta</h2>
				<p class="text-body-sm text-muted">Configura tu moneda y empieza a ordenar tus finanzas.</p>
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
					label="Nombre completo"
					name="fullName"
					autocomplete="name"
					placeholder="Sofía Ramírez"
					icon="person"
					required
					value={form?.values?.fullName ?? ''}
					error={form?.errors?.fullName}
				/>

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

				<SelectField
					label="Moneda principal"
					name="currency"
					icon="payments"
					options={CURRENCY_OPTIONS.map((option) => ({
						value: option.code,
						label: option.label
					}))}
					value={form?.values?.currency ?? data.defaultCurrency}
					error={form?.errors?.currency}
				/>

				<div class="grid gap-4">
					<TextField
						label="Contraseña"
						name="password"
						type="password"
						autocomplete="new-password"
						placeholder="Mínimo 8 caracteres"
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
				</div>

				<Button type="submit" block size="lg" icon="person_add" loading={saving}>Crear cuenta</Button>
			</form>
		</Card>

		<p class="text-center text-body text-muted">
			¿Ya tienes cuenta?
			<a href="/login" class="font-semibold text-primary">Inicia sesión</a>
		</p>
	{/if}
</div>
