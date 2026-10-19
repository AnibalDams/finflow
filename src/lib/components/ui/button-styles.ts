import { cn, type ClassValue } from '#lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
	primary:
		'bg-primary text-on-primary shadow-[0_8px_18px_-10px_rgba(0,108,73,0.75)] hover:bg-primary/90 active:bg-primary/95',
	secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90',
	tonal: 'bg-primary/10 text-primary hover:bg-primary/15',
	outline: 'border border-outline-variant bg-surface-container-lowest text-ink hover:bg-level-1',
	ghost: 'text-on-surface-variant hover:bg-level-1',
	danger: 'bg-tertiary text-on-tertiary hover:bg-tertiary/90'
};

const SIZES: Record<ButtonSize, string> = {
	sm: 'h-9 gap-1.5 px-3.5 text-label-sm rounded-lg',
	md: 'h-11 gap-2 px-4 text-label rounded-xl',
	lg: 'h-13 gap-2 px-5 text-[15px] font-semibold rounded-xl'
};

/** Clases compartidas por botones y enlaces con apariencia de botón. */
export function buttonClass(
	variant: ButtonVariant = 'primary',
	size: ButtonSize = 'md',
	block = false,
	extra?: ClassValue
): string {
	return cn(
		'inline-flex shrink-0 select-none items-center justify-center font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
		VARIANTS[variant],
		SIZES[size],
		block && 'w-full',
		extra
	);
}
