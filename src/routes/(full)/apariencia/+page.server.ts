import { fail } from '@sveltejs/kit';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import {
	DEFAULT_SCHEDULE,
	DEFAULT_THEME,
	palettePreview,
	parseTimeOfDay,
	type CustomPalette,
	type ThemePreference,
	type ThemeSchedule
} from '#lib/theme/derive';
import { PALETTES, type NeutralTemperature } from '#lib/theme/palettes';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, themeSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = [
	'palette',
	'mode',
	'seasonal',
	'scheduleLightStart',
	'scheduleDarkStart',
	'customPrimary',
	'customSecondary',
	'customTertiary',
	'customNeutral'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals.user);

	return {
		theme: locals.profile?.theme ?? DEFAULT_THEME,
		schedule: locals.profile?.schedule ?? DEFAULT_SCHEDULE,
		seasonal: locals.profile?.seasonal ?? 'auto',
		palettes: PALETTES.map((palette) => ({
			id: palette.id,
			name: palette.name,
			description: palette.description,
			reference: palette.reference,
			preview: palettePreview(palette.id)
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = themeSchema.safeParse({
			palette: readString(form, 'palette'),
			mode: readString(form, 'mode'),
			seasonal: readString(form, 'seasonal') || 'auto',
			scheduleLightStart: readString(form, 'scheduleLightStart') || undefined,
			scheduleDarkStart: readString(form, 'scheduleDarkStart') || undefined,
			customPrimary: readString(form, 'customPrimary') || undefined,
			customSecondary: readString(form, 'customSecondary') || undefined,
			customTertiary: readString(form, 'customTertiary') || undefined,
			customNeutral: readString(form, 'customNeutral') || undefined
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa la apariencia elegida.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const custom = buildCustom(parsed.data);
		if (parsed.data.palette === 'custom' && !custom) {
			return fail(400, {
				message: 'Elige los tres colores de tu paleta.',
				values
			});
		}

		const preference: ThemePreference = {
			palette: parsed.data.palette,
			mode: parsed.data.mode,
			custom
		};
		const schedule = buildSchedule(parsed.data);

		const { error } = await locals.supabase
			.from('profiles')
			.update({
				theme_palette: preference.palette,
				theme_mode: preference.mode,
				seasonal_theme: parsed.data.seasonal,
				theme_schedule: {
					lightStart: schedule.lightStart,
					darkStart: schedule.darkStart
				},
				theme_custom: custom
					? {
							primary: custom.primary,
							secondary: custom.secondary,
							tertiary: custom.tertiary,
							neutral: custom.neutral
						}
					: null
			})
			.eq('id', user.id);

		if (error) {
			return fail(400, {
				message: mutationMessage(error.message, 'No pudimos guardar tu apariencia.'),
				values
			});
		}

		return { ok: true };
	}
};

function buildSchedule(data: {
	scheduleLightStart?: string;
	scheduleDarkStart?: string;
}): ThemeSchedule {
	const lightStart = data.scheduleLightStart ? parseTimeOfDay(data.scheduleLightStart) : null;
	const darkStart = data.scheduleDarkStart ? parseTimeOfDay(data.scheduleDarkStart) : null;

	if (lightStart === null || darkStart === null || lightStart === darkStart) {
		return DEFAULT_SCHEDULE;
	}

	return { lightStart, darkStart };
}

function buildCustom(data: {
	customPrimary?: string;
	customSecondary?: string;
	customTertiary?: string;
	customNeutral?: string;
}): CustomPalette | null {
	const { customPrimary, customSecondary, customTertiary, customNeutral } = data;
	if (!customPrimary || !customSecondary || !customTertiary) return null;

	const neutral: NeutralTemperature =
		customNeutral === 'cool' || customNeutral === 'warm' ? customNeutral : 'neutral';

	return {
		primary: customPrimary,
		secondary: customSecondary,
		tertiary: customTertiary,
		neutral
	};
}
