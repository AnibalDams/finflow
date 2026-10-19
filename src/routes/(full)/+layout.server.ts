import { loadShell } from '#lib/server/shell';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => loadShell(locals);
