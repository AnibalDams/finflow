import { error, fail, redirect } from '@sveltejs/kit';
import { getCategories } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { formValues, readString } from '#lib/utils/forms';
import { categorySchema, fieldErrors } from '#lib/utils/validation';
import type { Category } from '#lib/types/domain';
import type { Actions, PageServerLoad } from './$types';

const VALUES = ['name', 'kind', 'icon', 'color'] as const;

/** Solo permite volver a rutas internas. */
function safePath(value: string | null): string {
	if (!value) return '/cuentas?tab=categorias';
	return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
		? value
		: '/cuentas?tab=categorias';
}

async function loadCategory(locals: App.Locals, id: string): Promise<Category | null> {
	const categories = await getCategories(locals.supabase, { includeArchived: true });
	return categories.find((category) => category.id === id) ?? null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const category = await loadCategory(locals, params.id);

	if (!category) {
		error(404, 'No encontramos esa categoría.');
	}

	return {
		category,
		volver: safePath(url.searchParams.get('volver'))
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = categorySchema.safeParse({
			name: readString(form, 'name'),
			kind: readString(form, 'kind'),
			icon: readString(form, 'icon') || 'category',
			color: readString(form, 'color') || '#64748b'
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos de la categoría.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error: updateError } = await locals.supabase
			.from('categories')
			.update({
				name: parsed.data.name,
				kind: parsed.data.kind,
				icon: parsed.data.icon,
				color: parsed.data.color
			})
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos actualizar la categoría.'),
				values
			});
		}

		return { ok: true };
	},

	archive: async ({ request, locals, params, url }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const archived = readString(form, 'archived') === 'true';
		// `action="?/..."` reemplaza los search params, así que la ruta de
		// retorno viaja en el formulario (con la URL como respaldo).
		const back = safePath(readString(form, 'volver') || url.searchParams.get('volver'));

		const { error: updateError } = await locals.supabase
			.from('categories')
			.update({ is_archived: archived })
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos archivar la categoría.')
			});
		}

		if (archived) redirect(303, back);

		return { ok: true };
	},

	delete: async ({ request, locals, params, url }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const back = safePath(readString(form, 'volver') || url.searchParams.get('volver'));

		const { error: deleteError } = await locals.supabase
			.from('categories')
			.delete()
			.eq('id', params.id);

		if (deleteError) {
			return fail(400, {
				message: mutationMessage(
					deleteError.message,
					'No pudimos eliminar la categoría: tiene movimientos asociados. Archívala en su lugar.'
				)
			});
		}

		redirect(303, back);
	}
};
