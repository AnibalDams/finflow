import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.types';
import type { Profile } from '#lib/types/domain';

declare global {
	namespace App {
		interface Locals {
			/** Cliente de Supabase ligado a la sesión del visitante (cookies). */
			supabase: SupabaseClient<Database>;
			/** Sesión y usuario verificados contra el servidor de Auth. */
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			/** Usuario autenticado, disponible tras el hook `handle`. */
			user: User | null;
			/** Perfil del usuario autenticado, disponible tras el hook `handle`. */
			profile: Profile | null;
			/** Minutos por detrás de UTC de la zona del usuario (cookie `tz_offset`). */
			tzOffset: number;
		}
		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
