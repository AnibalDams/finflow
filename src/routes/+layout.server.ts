import { resolveSeason } from '#lib/theme/seasons';
import { DEFAULT_SCHEDULE, DEFAULT_THEME, parseTimeOfDay, resolveTheme } from '#lib/theme/derive';
import { dateAtOffset, timeAtOffset } from '#lib/utils/dates';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// El tema se resuelve en el servidor para que el primer pintado ya tenga la
	// paleta y el modo correctos: sin parpadeo ni JavaScript bloqueante.
	const schedule = locals.profile?.schedule ?? DEFAULT_SCHEDULE;
	const minutes = parseTimeOfDay(timeAtOffset(locals.tzOffset)) ?? 0;
	const theme = resolveTheme(locals.profile?.theme ?? DEFAULT_THEME, { schedule, minutes });

	// La temporada usa la fecha local del dispositivo (el servidor corre en UTC).
	const season = resolveSeason(locals.profile?.seasonal ?? 'auto', dateAtOffset(locals.tzOffset));

	return {
		tzOffset: locals.tzOffset,
		theme: {
			preference: theme.preference,
			css: theme.css,
			meta: theme.meta,
			mode: theme.mode,
			schedule
		},
		season: season ? { id: season.id, name: season.name, greeting: season.greeting } : null
	};
};
