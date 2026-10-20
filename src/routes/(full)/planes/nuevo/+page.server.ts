import { fail, redirect } from '@sveltejs/kit';
import { getAccounts } from '#lib/server/queries';
import { mutationMessage, removeFile, uploadGoalImage, validateImage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { defaultAccount } from '#lib/server/shell';
import { addMonths, toISODate } from '#lib/utils/dates';
import { formValues, readFile, readString } from '#lib/utils/forms';
import { fieldErrors, goalSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = [
	'name',
	'targetAmount',
	'initialAmount',
	'targetDate',
	'category',
	'accountId',
	'monthlyContribution',
	'reminderDay'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const accounts = await getAccounts(locals.supabase);
	const now = new Date();

	return {
		accounts,
		defaultAccountId: defaultAccount(accounts)?.id ?? '',
		defaultDate: toISODate(addMonths(now, 6)),
		today: toISODate(now),
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = goalSchema.safeParse({
			name: readString(form, 'name'),
			targetAmount: readString(form, 'targetAmount'),
			initialAmount: readString(form, 'initialAmount') || '0',
			targetDate: readString(form, 'targetDate'),
			category: readString(form, 'category'),
			accountId: readString(form, 'accountId'),
			monthlyContribution: readString(form, 'monthlyContribution') || '0',
			reminderEnabled: form.get('reminderEnabled') === 'on' ? 'on' : 'false',
			reminderDay: readString(form, 'reminderDay') || '1'
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos del plan.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const accountId = parsed.data.accountId || null;
		if (accountId) {
			const { data: account } = await locals.supabase
				.from('accounts')
				.select('id')
				.eq('id', accountId)
				.maybeSingle();

			if (!account) {
				return fail(400, {
					message: 'La cuenta seleccionada no está disponible.',
					errors: { accountId: 'Selecciona una cuenta válida' },
					values
				});
			}
		}

		const goalId = crypto.randomUUID();
		const image = readFile(form, 'image');
		let imagePath: string | null = null;

		if (image) {
			const problem = await validateImage(image);
			if (problem) {
				return fail(400, { message: problem, errors: { image: problem }, values });
			}

			try {
				const uploaded = await uploadGoalImage(locals.supabase, user.id, goalId, image);
				imagePath = uploaded.path;
			} catch (uploadError) {
				return fail(500, {
					message:
						uploadError instanceof Error ? uploadError.message : 'No pudimos subir la imagen.',
					values
				});
			}
		}

		const { error } = await locals.supabase.from('goals').insert({
			id: goalId,
			user_id: user.id,
			name: parsed.data.name,
			target_amount: parsed.data.targetAmount,
			initial_amount: parsed.data.initialAmount,
			target_date: parsed.data.targetDate,
			category: parsed.data.category,
			account_id: accountId,
			monthly_contribution: parsed.data.monthlyContribution,
			reminder_enabled: parsed.data.reminderEnabled,
			reminder_day: parsed.data.reminderDay,
			image_path: imagePath
		});

		if (error) {
			if (imagePath) await removeFile(locals.supabase, 'goal-images', imagePath);
			return fail(400, {
				message: mutationMessage(error.message, 'No pudimos crear el plan.'),
				values
			});
		}

		redirect(303, `/planes/${goalId}`);
	}
};
