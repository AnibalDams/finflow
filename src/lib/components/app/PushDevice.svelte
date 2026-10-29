<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { install } from '#lib/stores/install.svelte';
	import { push, type PushState } from '#lib/stores/push.svelte';
	import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';

	onMount(() => {
		void push.init();
	});

	const STATUS: Record<PushState, { icon: string; title: string; detail: string }> = {
		unsupported: {
			icon: 'notifications_off',
			title: 'Este navegador no admite push',
			detail: 'Instala FinFlow o usa Chrome, Edge, Firefox o Safari 16.4 o superior.'
		},
		unconfigured: {
			icon: 'key_off',
			title: 'Falta configuración en el servidor',
			detail: 'Agrega PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY para activar los avisos.'
		},
		blocked: {
			icon: 'block',
			title: 'Notificaciones bloqueadas',
			detail: 'Habilítalas para este sitio desde los ajustes del navegador y recarga la página.'
		},
		inactive: {
			icon: 'notifications',
			title: 'Sin activar en este dispositivo',
			detail: 'Actívalas para que este dispositivo reciba los avisos.'
		},
		active: {
			icon: 'notifications_active',
			title: 'Activadas en este dispositivo',
			detail: 'Recibirás aquí los avisos de cuotas y aportes.'
		}
	};

	const status = $derived(STATUS[push.state]);
	const showIosHint = $derived(push.state === 'unsupported' && install.ios && !install.installed);

	async function enable(): Promise<void> {
		const ok = await push.enable();

		if (ok) notifySuccess('Notificaciones activadas en este dispositivo');
		else if (push.error) notifyError(push.error);
		else if (push.state === 'blocked')
			notifyError('El navegador tiene bloqueadas las notificaciones');
	}

	async function disable(): Promise<void> {
		await push.disable();

		if (push.error) notifyError(push.error);
		else notifySuccess('Este dispositivo ya no recibirá avisos');
	}

	async function test(): Promise<void> {
		const result = await push.sendTest();

		if (!result) {
			notifyError(push.error ?? 'No pudimos enviar la prueba');
			return;
		}

		if (result.sent > 0) notifySuccess('Prueba enviada');
		else notifyError('No hay dispositivos suscritos para enviar la prueba');
	}
</script>

<div class="space-y-3 rounded-xl bg-level-1/70 p-3">
	<div class="flex items-start gap-3">
		<span
			class="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary"
		>
			<Icon name={status.icon} size={18} filled />
		</span>
		<div class="min-w-0">
			<p class="text-label font-medium text-ink">{status.title}</p>
			<p class="mt-0.5 text-body-sm text-muted">{status.detail}</p>
		</div>
	</div>

	{#if showIosHint}
		<p class="text-body-sm text-muted">
			En iPhone o iPad, primero añade FinFlow a la pantalla de inicio desde Safari.
		</p>
	{/if}

	{#if push.error}
		<p class="text-body-sm font-medium text-tertiary" role="alert">{push.error}</p>
	{/if}

	{#if push.state === 'active'}
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class={buttonClass('outline', 'sm')}
				disabled={push.busy}
				onclick={test}
			>
				<Icon name="send" size={16} />
				Enviar prueba
			</button>
			<button
				type="button"
				class={buttonClass('ghost', 'sm')}
				disabled={push.busy}
				onclick={disable}
			>
				Desactivar aquí
			</button>
		</div>
	{:else if push.state === 'inactive'}
		<button
			type="button"
			class={buttonClass('secondary', 'sm')}
			disabled={push.busy}
			onclick={enable}
		>
			{#if push.busy}
				<Icon name="progress_activity" size={16} class="animate-spin" />
			{:else}
				<Icon name="notifications_active" size={16} />
			{/if}
			Activar en este dispositivo
		</button>
	{/if}
</div>
