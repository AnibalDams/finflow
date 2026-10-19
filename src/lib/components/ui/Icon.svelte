<script lang="ts">
	interface Props {
		/** Nombre del icono de Material Symbols. */
		name: string;
		size?: number;
		filled?: boolean;
		class?: string;
		/** Si se indica, el icono se anuncia a lectores de pantalla. */
		label?: string;
	}

	let { name, size = 24, filled = false, class: className = '', label }: Props = $props();
</script>

<span
	class="material-symbols-outlined block shrink-0 {className}"
	data-filled={filled}
	style="font-size:{size}px;width:{size}px;height:{size}px"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	>{name}</span
>
