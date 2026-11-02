import { getAnalytics } from '#lib/server/queries';
import {
	monthParam,
	parseISODate,
	periodRange,
	referenceAtOffset,
	shiftPeriodReference,
	toISODate,
	type PeriodPreset
} from '#lib/utils/dates';
import type { PageServerLoad } from './$types';

const PRESETS: readonly PeriodPreset[] = ['week', 'month', 'quarter', 'year'];

/** Acepta `YYYY-MM-DD` y valida que sea una fecha real. */
function parseReference(value: string | null, fallback: Date): Date {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
	const date = parseISODate(value);
	return toISODate(date) === value ? date : fallback;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('periodo');
	const preset: PeriodPreset = PRESETS.includes(requested as PeriodPreset)
		? (requested as PeriodPreset)
		: 'month';

	const today = referenceAtOffset(locals.tzOffset);
	const reference = parseReference(url.searchParams.get('ref'), today);
	const range = periodRange(preset, reference);
	const analytics = await getAnalytics(locals.supabase, range, locals.tzOffset);

	return {
		preset,
		range,
		analytics,
		month: monthParam(reference),
		currentMonth: monthParam(today),
		year: reference.getFullYear(),
		previousRef: toISODate(shiftPeriodReference(reference, preset, -1)),
		nextRef: toISODate(shiftPeriodReference(reference, preset, 1)),
		currency: locals.profile?.currency ?? 'USD',
		monthlyBudget: locals.profile?.monthlyBudget ?? 0,
		profileName: locals.profile?.fullName ?? ''
	};
};
