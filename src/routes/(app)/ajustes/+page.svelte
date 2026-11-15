<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import InstallApp from '#lib/components/app/InstallApp.svelte';
	import ProfilePhoto from '#lib/components/app/ProfilePhoto.svelte';
	import PushDevice from '#lib/components/app/PushDevice.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import SelectField from '#lib/components/ui/SelectField.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { currencyIcon } from '#lib/utils/labels';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const errors: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const profile = $derived(data.profile);

	let fullName = $state(values.fullName ?? profile.fullName);
	let currency = $state(values.currency ?? profile.currency);
	let monthlyBudget = $state(values.monthlyBudget ?? profile.monthlyBudget.toFixed(2));
	let savingProfile = $state(false);

	let currentPassword = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let savingPassword = $state(false);
	let leaving = $state(false);

	let pushEnabled = $state(profile.pushEnabled);
	let pushTime = $state(profile.pushTime);
	let savingNotifications = $state(false);

	let newCurrencyCode = $state('');
	let newCurrencyName = $state('');
	let editingCode = $state<string | null>(null);
	let editingName = $state('');
	let savingCurrency = $state(false);

	const usedCurrencies = $derived(new Set(data.usedCurrencies));

	const initials = $derived(
		profile.fullName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || 'FF'
	);

	const currencyOptions = $derived(
		data.currencies.map((option) => ({
			value: option.code,
			label: `${option.code} · ${option.name}`,
			icon: currencyIcon(option.code)
		}))
	);

	const stats = $derived([
		{ label: 'Cuentas', value: data.counts.accounts, icon: 'account_balance_wallet' },
		{ label: 'Categorías', value: data.counts.categories, icon: 'category' },
		{ label: 'Planes activos', value: data.counts.goals, icon: 'flag' },
		{ label: 'Deudas activas', value: data.counts.debts, icon: 'credit_card' }
	]);
</script>

<svelte:head>
	<title>Configuración · FinFlow</title>
</svelte:head>

<div
	class="space-y-4 px-4 pt-4 pb-10 lg:mx-auto lg:max-w-3xl lg:space-y-6 lg:px-8 lg:pt-8 lg:pb-10"
>
	<header class="hidden lg:block">
		<p class="text-label-sm font-semibold tracking-[0.16em] text-primary uppercase">FinFlow</p>
		<h1 class="mt-1 text-title-xl tracking-tight text-ink">Configuración</h1>
		<p class="mt-1 text-body text-on-surface-variant">
			Administra tu perfil, seguridad, presupuesto y datos de tu cuenta.
		</p>
	</header>

	<section class="rounded-panel hero-surface p-5 shadow-hero lg:p-6">
		<div class="flex items-center gap-3">
			<span
				class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-title-sm font-bold text-on-primary-fixed"
			>
				{#if profile.avatarUrl}
					<img src={profile.avatarUrl} alt="" class="size-full object-cover" />
				{:else}
					{initials}
				{/if}
			</span>
			<div class="min-w-0">
				<p class="truncate text-title-sm font-semibold">{profile.fullName || 'Tu perfil'}</p>
				<p class="truncate text-body-sm text-hero-foreground/70">{data.email}</p>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-4 gap-2">
			{#each stats as stat (stat.label)}
				<div class="rounded-card bg-hero-overlay p-2 text-center">
					<Icon name={stat.icon} size={18} class="mx-auto text-primary-fixed" />
					<p class="mt-1 tnum text-title-sm font-bold">{stat.value}</p>
					<p class="text-[10px] leading-tight text-hero-foreground/60">{stat.label}</p>
				</div>
			{/each}
		</div>
	</section>

	<div class="space-y-4">
		<ProfilePhoto
			avatarUrl={profile.avatarUrl}
			hasAvatar={Boolean(profile.avatarPath)}
			{initials}
		/>

		<a
			href={resolve('/(app)/cuentas')}
			class="flex items-center gap-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-3.5 shadow-card transition hover:border-secondary/40"
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-control bg-secondary/10 text-secondary"
			>
				<Icon name="account_balance_wallet" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-body font-medium text-ink">Cuentas y categorías</p>
				<p class="text-body-sm text-muted">Saldos, íconos y presupuestos por categoría</p>
			</div>
			<Icon name="chevron_right" size={20} class="shrink-0 text-muted" />
		</a>

		<a
			href={resolve('/(full)/apariencia')}
			class="flex items-center gap-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-3.5 shadow-card transition hover:border-primary/40"
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary"
			>
				<Icon name="palette" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-body font-medium text-ink">Apariencia</p>
				<p class="text-body-sm text-muted">Paleta, modo claro/oscuro y contraste</p>
			</div>
			<Icon name="chevron_right" size={20} class="shrink-0 text-muted" />
		</a>
	</div>

	<div class="space-y-4">
		<section
			class="space-y-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-4 lg:p-5"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="person" size={18} class="text-secondary" />
				Perfil
			</h2>

			{#if form?.intent === 'profile' && form.message}
				<div
					class="flex items-start gap-2 rounded-control bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
					role="alert"
				>
					<Icon name="error" size={18} class="mt-0.5 shrink-0" />
					{form.message}
				</div>
			{/if}

			<form
				method="POST"
				action="?/profile"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Perfil actualizado',
					onStart: () => (savingProfile = true),
					onFinish: () => (savingProfile = false)
				})}
			>
				<TextField
					label="Nombre completo"
					name="fullName"
					bind:value={fullName}
					error={errors.fullName}
				/>
				<SelectField
					label="Moneda principal"
					name="currency"
					options={currencyOptions}
					bind:value={currency}
					error={errors.currency}
				/>
				<AmountField
					name="monthlyBudget"
					label="Presupuesto mensual global"
					bind:value={monthlyBudget}
					{currency}
					tone="primary"
					quickAmounts={[]}
					error={errors.monthlyBudget}
				/>
				<p class="text-body-sm text-muted">
					Se usa como meta general en Inicio; los límites por categoría se editan en Cuentas.
				</p>

				<button type="submit" class={buttonClass('secondary', 'md', true)} disabled={savingProfile}>
					{#if savingProfile}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="check" size={18} />
					{/if}
					Guardar perfil
				</button>
			</form>
		</section>

		<section
			class="space-y-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-4"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="currency_exchange" size={18} class="text-secondary" />
				Monedas
			</h2>

			{#if form?.intent === 'currencies' && form.message}
				<div
					class="flex items-start gap-2 rounded-control bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
					role="alert"
				>
					<Icon name="error" size={18} class="mt-0.5 shrink-0" />
					{form.message}
				</div>
			{/if}

			<p class="text-body-sm text-muted">
				Agrega las monedas con las que trabajas. USD y EUR vienen incluidas; una moneda en uso no se
				puede eliminar.
			</p>

			<ul class="space-y-2">
				{#each data.currencies as item (item.code)}
					<li class="flex items-center gap-2 rounded-control bg-level-1/60 px-3 py-2">
						<span
							class="shrink-0 rounded-control bg-secondary/10 px-2 py-1 text-label-sm font-semibold text-secondary"
						>
							{item.code}
						</span>

						{#if editingCode === item.code}
							<form
								method="POST"
								action="?/currencyRename"
								class="flex min-w-0 flex-1 items-center gap-1"
								use:enhance={enhanceForm({
									success: 'Moneda actualizada',
									onSuccess: () => (editingCode = null),
									onStart: () => (savingCurrency = true),
									onFinish: () => (savingCurrency = false)
								})}
							>
								<input type="hidden" name="code" value={item.code} />
								<input
									name="name"
									bind:value={editingName}
									maxlength={60}
									required
									aria-label={`Nombre de ${item.code}`}
									class="h-9 min-w-0 flex-1 rounded-control border border-hairline bg-surface-container-lowest px-2 text-body-sm text-ink focus:border-secondary focus:ring-3 focus:ring-secondary/12 focus:outline-none"
								/>
								<button
									type="submit"
									class="flex size-8 shrink-0 items-center justify-center rounded-control text-secondary transition hover:bg-secondary/10 disabled:opacity-40"
									disabled={savingCurrency}
									aria-label={`Guardar nombre de ${item.code}`}
								>
									<Icon name="check" size={18} />
								</button>
								<button
									type="button"
									class="flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-level-1"
									onclick={() => (editingCode = null)}
									aria-label={`Cancelar edición de ${item.code}`}
								>
									<Icon name="close" size={18} />
								</button>
							</form>
						{:else}
							<span class="min-w-0 flex-1 truncate text-body-sm text-ink">
								{item.name}
								{#if item.code === profile.currency}
									<span class="text-label-sm text-muted"> · Principal</span>
								{:else if usedCurrencies.has(item.code)}
									<span class="text-label-sm text-muted"> · En uso</span>
								{/if}
							</span>

							<button
								type="button"
								class="flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-secondary/10 hover:text-secondary"
								onclick={() => {
									editingCode = item.code;
									editingName = item.name;
								}}
								aria-label={`Renombrar ${item.code}`}
							>
								<Icon name="edit" size={18} />
							</button>

							<form
								method="POST"
								action="?/currencyRemove"
								use:enhance={enhanceForm({
									success: 'Moneda eliminada',
									onStart: () => (savingCurrency = true),
									onFinish: () => (savingCurrency = false)
								})}
							>
								<input type="hidden" name="code" value={item.code} />
								<button
									type="submit"
									class="flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-tertiary/10 hover:text-tertiary disabled:pointer-events-none disabled:opacity-40"
									disabled={usedCurrencies.has(item.code)}
									title={usedCurrencies.has(item.code) ? 'Moneda en uso' : 'Eliminar moneda'}
									aria-label={`Eliminar ${item.code}`}
								>
									<Icon name="delete" size={18} />
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>

			<form
				method="POST"
				action="?/currencyAdd"
				class="space-y-3 border-t border-hairline/60 pt-3"
				use:enhance={enhanceForm({
					success: 'Moneda agregada',
					onSuccess: () => {
						newCurrencyCode = '';
						newCurrencyName = '';
					},
					onStart: () => (savingCurrency = true),
					onFinish: () => (savingCurrency = false)
				})}
			>
				<TextField
					label="Código"
					name="code"
					placeholder="Ej. GBP"
					maxlength={3}
					autocapitalize="characters"
					bind:value={newCurrencyCode}
					error={errors.code}
					hint="Tres letras, como GBP o JPY"
				/>
				<TextField
					label="Nombre"
					name="name"
					placeholder="Ej. Libra esterlina"
					bind:value={newCurrencyName}
					error={errors.name}
				/>

				<button
					type="submit"
					class={buttonClass('secondary', 'md', true)}
					disabled={savingCurrency}
				>
					{#if savingCurrency}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="add" size={18} />
					{/if}
					Agregar moneda
				</button>
			</form>
		</section>

		<section
			class="space-y-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-4"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="notifications" size={18} class="text-secondary" />
				Notificaciones
			</h2>

			{#if form?.intent === 'notifications' && form.message}
				<div
					class="flex items-start gap-2 rounded-control bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
					role="alert"
				>
					<Icon name="error" size={18} class="mt-0.5 shrink-0" />
					{form.message}
				</div>
			{/if}

			<p class="text-body-sm text-muted">
				Un recordatorio al día por cada cuota por vencer o vencida, hasta que la pagues, la archives
				o la elimines.
			</p>

			<form
				method="POST"
				action="?/notifications"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Preferencias de notificación guardadas',
					onStart: () => (savingNotifications = true),
					onFinish: () => (savingNotifications = false)
				})}
			>
				<Switch
					label="Avisarme de cuotas y aportes"
					description="Se envía a la hora local de tu dispositivo"
					name="pushEnabled"
					bind:checked={pushEnabled}
				/>

				<TextField
					label="Hora del aviso"
					name="pushTime"
					type="time"
					bind:value={pushTime}
					error={errors.pushTime}
					hint="Elige la hora a la que quieres recibir el recordatorio"
				/>

				<PushDevice />

				<button
					type="submit"
					class={buttonClass('secondary', 'md', true)}
					disabled={savingNotifications}
				>
					{#if savingNotifications}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="check" size={18} />
					{/if}
					Guardar preferencias
				</button>
			</form>
		</section>

		<section
			class="space-y-3 rounded-card border border-hairline/70 bg-surface-container-lowest p-4"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="lock" size={18} class="text-secondary" />
				Contraseña
			</h2>

			{#if form?.intent === 'password' && form.message}
				<div
					class="flex items-start gap-2 rounded-control bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
					role="alert"
				>
					<Icon name="error" size={18} class="mt-0.5 shrink-0" />
					{form.message}
				</div>
			{/if}

			<form
				method="POST"
				action="?/password"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Contraseña actualizada',
					onSuccess: () => {
						currentPassword = '';
						password = '';
						passwordConfirm = '';
					},
					onStart: () => (savingPassword = true),
					onFinish: () => (savingPassword = false)
				})}
			>
				<TextField
					label="Contraseña actual"
					name="currentPassword"
					type="password"
					icon="lock"
					autocomplete="current-password"
					bind:value={currentPassword}
					error={errors.currentPassword}
				/>
				<TextField
					label="Nueva contraseña"
					name="password"
					type="password"
					icon="lock"
					autocomplete="new-password"
					bind:value={password}
					error={errors.password}
					hint="Mínimo 12 caracteres, con letras y números"
				/>
				<TextField
					label="Confirmar contraseña"
					name="passwordConfirm"
					type="password"
					icon="lock_reset"
					autocomplete="new-password"
					bind:value={passwordConfirm}
					error={errors.passwordConfirm}
				/>

				<button
					type="submit"
					class={buttonClass('secondary', 'md', true)}
					disabled={savingPassword}
				>
					{#if savingPassword}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="key" size={18} />
					{/if}
					Cambiar contraseña
				</button>
			</form>
		</section>
	</div>

	<div>
		<InstallApp />
	</div>

	<section class="space-y-2">
		<form
			method="POST"
			action="/auth/salir"
			use:enhance={enhanceForm({
				onStart: () => (leaving = true),
				onFinish: () => (leaving = false)
			})}
		>
			<button type="submit" class={buttonClass('danger', 'md', true)} disabled={leaving}>
				{#if leaving}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="logout" size={18} />
				{/if}
				Cerrar sesión
			</button>
		</form>
		<p class="text-center text-label-sm text-muted">
			FinFlow · Tus datos financieros están cifrados con protocolo AES-256
		</p>
	</section>
</div>
