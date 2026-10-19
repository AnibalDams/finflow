import { getGoals } from '#lib/server/queries';
import { signedUrl } from '#lib/server/mutations';
import { contributionPlan } from '#lib/utils/finance';
import { sumAmounts } from '#lib/utils/money';
import type { GoalStatus } from '#lib/types/domain';
import type { PageServerLoad } from './$types';

type GoalFilter = Extract<GoalStatus, 'active' | 'completed' | 'paused'>;

function parseFilter(value: string | null): GoalFilter {
	if (value === 'completados') return 'completed';
	if (value === 'pausa') return 'paused';
	return 'active';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const goals = await getGoals(locals.supabase);
	const filter = parseFilter(url.searchParams.get('estado'));

	const images: Record<string, string> = {};
	await Promise.all(
		goals
			.filter((goal) => goal.imagePath)
			.map(async (goal) => {
				const signed = await signedUrl(locals.supabase, 'goal-images', goal.imagePath ?? '', 3600);
				if (signed) images[goal.id] = signed;
			})
	);

	const active = goals.filter((goal) => goal.status === 'active');
	const monthlySaving = sumAmounts(
		active.map(
			(goal) =>
				goal.monthlyContribution ??
				contributionPlan({
					target: goal.targetAmount,
					saved: goal.savedAmount,
					targetDate: goal.targetDate
				}).monthlyAmount
		)
	);

	return {
		goals,
		images,
		filter,
		counts: {
			active: active.length,
			completed: goals.filter((goal) => goal.status === 'completed').length,
			paused: goals.filter((goal) => goal.status === 'paused').length
		},
		totalSaved: sumAmounts(goals.map((goal) => goal.savedAmount)),
		totalTarget: sumAmounts(goals.map((goal) => goal.targetAmount)),
		monthlySaving,
		currency: locals.profile?.currency ?? 'USD'
	};
};
