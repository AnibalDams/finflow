import { DEFAULT_THEME, resolveTheme } from '#lib/theme/derive';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// El tema se resuelve en el servidor para que el primer pintado ya tenga la
	// paleta y el modo correctos: sin parpadeo ni JavaScript bloqueante.
	const theme = resolveTheme(locals.profile?.theme ?? DEFAULT_THEME);

	return {
		tzOffset: locals.tzOffset,
		theme: {
			preference: theme.preference,
			css: theme.css,
			meta: theme.meta
		}
	};
};
