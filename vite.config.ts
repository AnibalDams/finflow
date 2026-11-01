import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

/** Forma que acepta la CSP de SvelteKit para un origen de host. */
type HostSource = `https://${string}.${string}`;

/** Host real del proyecto Supabase, para no abrir la CSP a cualquier proyecto. */
function supabaseOrigin(value: string | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url.origin : null;
	} catch {
		return null;
	}
}

export default defineConfig(({ mode }) => {
	const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
	const storageHost = supabaseOrigin(env.PUBLIC_SUPABASE_URL);
	// Respaldo: si el build no ve la variable (CI sin entorno), se mantiene el
	// comodín para no romper las imágenes firmadas de Storage.
	// El origen ya está validado como `https://host[:puerto]`, forma de HostSource.
	const imageHosts: HostSource[] = storageHost
		? [storageHost as HostSource]
		: ['https://*.supabase.co'];

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
				// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
				// See https://svelte.dev/docs/kit/adapters for more information about adapters.
				adapter: adapter(),

				// CSP estricta con nonces/hashes generados por SvelteKit. Los estilos
				// inline son necesarios para las barras de progreso y gráficos SVG.
				csp: {
					mode: 'auto',
					directives: {
						'default-src': ['self'],
						'script-src': ['self'],
						'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
						'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
						'img-src': ['self', 'data:', 'blob:', ...imageHosts],
						// No hay cliente Supabase en el navegador: todas las llamadas
						// salen del servidor.
						'connect-src': ['self'],
						'manifest-src': ['self'],
						'worker-src': ['self', 'blob:'],
						'frame-src': ['none'],
						'frame-ancestors': ['none'],
						'base-uri': ['self'],
						'form-action': ['self'],
						'object-src': ['none']
					}
				}
			})
		],
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
