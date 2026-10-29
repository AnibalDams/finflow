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
	},
	SITE_URL: {
		public: false,
		description: 'URL pública del sitio para enlaces de correo (opcional en desarrollo)',
		schema: (value) => {
			if (!value) return '';
			let url: URL;
			try {
				url = new URL(value);
			} catch {
				throw new Error('SITE_URL no es una URL válida');
			}
			const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
			if (url.protocol !== 'https:' && !isLocal) {
				throw new Error('SITE_URL debe usar HTTPS fuera de localhost');
			}
			return url.origin;
		}
	},
	PUBLIC_VAPID_PUBLIC_KEY: {
		public: true,
		description: 'Clave pública VAPID para Web Push (vacía desactiva las notificaciones)',
		schema: (value) => value?.trim() ?? ''
	},
	VAPID_PRIVATE_KEY: {
		public: false,
		description: 'Clave privada VAPID (solo servidor)',
		schema: (value) => value?.trim() ?? ''
	},
	VAPID_SUBJECT: {
		public: false,
		description: 'Contacto VAPID: mailto: o URL del sitio',
		schema: (value) => value?.trim() || 'mailto:demo@finflow.app'
	},
	CRON_SECRET: {
		public: false,
		description: 'Secreto compartido que valida al cron de notificaciones',
		schema: (value) => {
			const secret = value?.trim() ?? '';
			if (secret && secret.length < 16) {
				throw new Error('CRON_SECRET debe tener al menos 16 caracteres');
			}
			return secret;
		}
	},
	SUPABASE_SERVICE_ROLE_KEY: {
		public: false,
		description: 'Clave service_role de Supabase (solo servidor, sin RLS)',
		schema: (value) => value?.trim() ?? ''
	}
});
