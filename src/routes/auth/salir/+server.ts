import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Cierre de sesión por POST para evitar cierres accidentales desde enlaces. */
export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	redirect(303, '/login');
};
