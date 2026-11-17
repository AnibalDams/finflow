<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import PixelSprite from './PixelSprite.svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<!-- Escena decorativa reutilizable (login, cabeceras, estados vacíos). -->
<div class={cn('flex items-end gap-3', className)} aria-hidden="true">
	<PixelSprite name="tree" size={64} motion="bob" />
	<PixelSprite name="snowman" size={42} />
	<PixelSprite name="gift" size={28} />
	<PixelSprite name="boot" size={26} />
	<PixelSprite name="santa" size={40} motion="bob" class="ml-auto" />
</div>
