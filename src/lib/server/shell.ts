import { error } from '@sveltejs/kit';
import type { Account, Category, Currency, Profile, Tag } from '#lib/types/domain';
import { getAccounts, getCategories, getCurrencies, getProfile, getTags } from './queries';
import { requireAuth } from './results';

export interface ShellData {
	profile: Profile;
	accounts: Account[];
	categories: Category[];
	tags: Tag[];
	currencies: Currency[];
}

/**
 * Datos compartidos por todas las pantallas autenticadas: perfil, cuentas,
 * categorías, etiquetas y monedas. Se piden en paralelo una sola vez por
 * navegación.
 */
export async function loadShell(locals: App.Locals): Promise<ShellData> {
	const user = requireAuth(locals.user);
	const db = locals.supabase;

	const [profile, accounts, categories, tags, currencies] = await Promise.all([
		locals.profile ? Promise.resolve(locals.profile) : getProfile(db, user.id),
		getAccounts(db),
		getCategories(db),
		getTags(db),
		getCurrencies(db)
	]);

	if (!profile) {
		error(500, 'No pudimos cargar tu perfil. Vuelve a iniciar sesión.');
	}

	return { profile, accounts, categories, tags, currencies };
}

/** Cuenta seleccionada por defecto: la principal o la primera disponible. */
export function defaultAccount(accounts: Account[]): Account | null {
	return accounts.find((account) => account.isPrimary) ?? accounts[0] ?? null;
}

export function categoriesByKind(categories: Category[], kind: Category['kind']): Category[] {
	return categories.filter((category) => category.kind === kind);
}
