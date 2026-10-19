import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Variables de entorno del proyecto.
 * Se declaran aquí y se consumen desde `$app/env/public` (navegador y servidor).
 */
export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		description: 'URL del proyecto Supabase (https://<ref>.supabase.co)',
		schema: (value) => {
			if (!value) throw new Error('PUBLIC_SUPABASE_URL es obligatoria');
			let url: URL;
			try {
				url = new URL(value);
			} catch {
				throw new Error('PUBLIC_SUPABASE_URL no es una URL válida');
			}
			if (url.protocol !== 'https:') {
				throw new Error('PUBLIC_SUPABASE_URL debe usar HTTPS');
			}
			return url.origin;
		}
	},
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		description: 'Clave publicable de Supabase (segura para el cliente)',
		schema: (value) => {
			if (!value) throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY es obligatoria');
			return value;
		}
	}
});
