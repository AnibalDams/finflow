import { getAnalytics } from '#lib/server/queries';
import { periodRange, type PeriodPreset } from '#lib/utils/dates';
import type { PageServerLoad } from './$types';

const PRESETS: readonly PeriodPreset[] = ['week', 'month', 'quarter', 'year'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('periodo');
	const preset: PeriodPreset = PRESETS.includes(requested as PeriodPreset)
		? (requested as PeriodPreset)
		: 'month';

	const range = periodRange(preset);
	const analytics = await getAnalytics(locals.supabase, range);

	return {
		preset,
		range,
		analytics,
		currency: locals.profile?.currency ?? 'USD',
		monthlyBudget: locals.profile?.monthlyBudget ?? 0
	};
};
