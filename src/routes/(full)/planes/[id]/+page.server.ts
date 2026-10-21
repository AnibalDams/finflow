import { error, fail, redirect } from '@sveltejs/kit';
import { getAccounts, getGoal } from '#lib/server/queries';
import {
	mutationMessage,
	removeFile,
	signedUrl,
	uploadGoalImage,
	validateImage
} from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { dateAtOffset, localDateTimeToUtc } from '#lib/utils/dates';
import { formValues, readFile, readString } from '#lib/utils/forms';
import { contributionSchema, fieldErrors, goalSchema } from '#lib/utils/validation';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const GOAL_VALUES = [
	'name',
	'targetAmount',
	'initialAmount',
	'targetDate',
	'category',
	'accountId',
	'monthlyContribution',
	'reminderDay'
] as const;

const statusSchema = z.enum(['active', 'completed', 'paused']);

export const load: PageServerLoad = async ({ locals, params }) => {
	const result = await getGoal(locals.supabase, params.id);

	if (!result) {
		error(404, 'No encontramos ese plan.');
	}

	const [accounts, imageUrl] = await Promise.all([
		getAccounts(locals.supabase),
		result.goal.imagePath
			? signedUrl(locals.supabase, 'goal-images', result.goal.imagePath, 3600)
			: Promise.resolve(null)
	]);

	return {
		goal: result.goal,
		contributions: result.contributions,
		accounts,
		imageUrl,
		today: dateAtOffset(locals.tzOffset),
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	contribute: async ({ request, locals, params }) => {
		const user = requireAuth(locals.user);
		const current = await getGoal(locals.supabase, params.id);

		if (!current) error(404, 'No encontramos ese plan.');

		const form = await request.formData();
		const values = formValues(form, ['amount', 'occurredAt', 'note'] as const);
		const rawDate = readString(form, 'occurredAt');

		const parsed = contributionSchema.safeParse({
			goalId: current.goal.id,
			amount: readString(form, 'amount'),
			occurredAt: localDateTimeToUtc(
				rawDate || dateAtOffset(locals.tzOffset),
				'12:00',
				locals.tzOffset
			),
			note: readString(form, 'note')
		});

		if (!parsed.success) {
			return fail(400, {
				intent: 'contribute',
				message: 'Revisa los datos de la aportación.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error: insertError } = await locals.supabase.from('goal_contributions').insert({
			user_id: user.id,
			goal_id: current.goal.id,
			amount: parsed.data.amount,
			occurred_at: new Date(parsed.data.occurredAt).toISOString(),
			note: parsed.data.note
		});

		if (insertError) {
			return fail(400, {
				intent: 'contribute',
				message: mutationMessage(insertError.message, 'No pudimos registrar la aportación.'),
				values
			});
		}

		if (
			current.goal.status === 'active' &&
			current.goal.savedAmount + parsed.data.amount >= current.goal.targetAmount
		) {
			await locals.supabase
				.from('goals')
				.update({ status: 'completed', completed_at: new Date().toISOString() })
				.eq('id', current.goal.id);
		}

		return { ok: true };
	},

	update: async ({ request, locals, params }) => {
		const user = requireAuth(locals.user);
		const current = await getGoal(locals.supabase, params.id);

		if (!current) error(404, 'No encontramos ese plan.');

		const form = await request.formData();
		const values = formValues(form, GOAL_VALUES);

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
				intent: 'update',
				message: 'Revisa los datos del plan.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const accountId = parsed.data.accountId || null;
		const image = readFile(form, 'image');
		const removeImage = readString(form, 'removeImage') === '1';

		let nextPath = removeImage ? null : current.goal.imagePath;
		let uploaded: string | null = null;

		if (image) {
			const problem = await validateImage(image);
			if (problem) {
				return fail(400, {
					intent: 'update',
					message: problem,
					errors: { image: problem },
					values
				});
			}

			try {
				const result = await uploadGoalImage(locals.supabase, user.id, current.goal.id, image);
				uploaded = result.path;
				nextPath = result.path;
			} catch (uploadError) {
				return fail(500, {
					intent: 'update',
					message:
						uploadError instanceof Error ? uploadError.message : 'No pudimos subir la imagen.',
					values
				});
			}
		}

		const { error: updateError } = await locals.supabase
			.from('goals')
			.update({
				name: parsed.data.name,
				target_amount: parsed.data.targetAmount,
				initial_amount: parsed.data.initialAmount,
				target_date: parsed.data.targetDate,
				category: parsed.data.category,
				account_id: accountId,
				monthly_contribution: parsed.data.monthlyContribution,
				reminder_enabled: parsed.data.reminderEnabled,
				reminder_day: parsed.data.reminderDay,
				image_path: nextPath
			})
			.eq('id', current.goal.id);

		if (updateError) {
			if (uploaded) await removeFile(locals.supabase, 'goal-images', uploaded);
			return fail(400, {
				intent: 'update',
				message: mutationMessage(updateError.message, 'No pudimos actualizar el plan.'),
				values
			});
		}

		if (current.goal.imagePath && current.goal.imagePath !== nextPath) {
			await removeFile(locals.supabase, 'goal-images', current.goal.imagePath);
		}

		return { ok: true };
	},

	status: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const parsed = statusSchema.safeParse(readString(form, 'status'));

		if (!parsed.success) {
			return fail(400, { message: 'Estado no válido.' });
		}

		const { error: updateError } = await locals.supabase
			.from('goals')
			.update({
				status: parsed.data,
				completed_at: parsed.data === 'completed' ? new Date().toISOString() : null
			})
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos cambiar el estado.')
			});
		}

		return { ok: true };
	},

	delete: async ({ locals, params }) => {
		requireAuth(locals.user);
		const current = await getGoal(locals.supabase, params.id);

		if (!current) error(404, 'No encontramos ese plan.');

		const { error: deleteError } = await locals.supabase
			.from('goals')
			.delete()
			.eq('id', current.goal.id);

		if (deleteError) {
			return fail(400, {
				message: mutationMessage(deleteError.message, 'No pudimos eliminar el plan.')
			});
		}

		if (current.goal.imagePath) {
			await removeFile(locals.supabase, 'goal-images', current.goal.imagePath);
		}

		redirect(303, '/planes');
	}
};
