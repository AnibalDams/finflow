/**
 * Service worker de FinFlow.
 *
 * Solo se cachean los assets inmutables del build y los archivos estáticos
 * (manifest, iconos y página offline). Las navegaciones van siempre a la red y,
 * si fallan, se sirve `offline.html`. Nunca se guardan respuestas con datos
 * financieros ni HTML autenticado.
 */
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { asset } from '$app/paths';
import { self } from '$app/service-worker';
import type { AssetPath } from '$app/types';

const cacheName = `finflow-${version}`;

// `$app/manifest` devuelve rutas relativas; `asset()` les añade el base path.
// El cast es necesario porque las rutas de build no forman parte del union
// generado de `AssetPath` (solo lo están los archivos de `static`).
const urlFor = (path: string): string =>
	asset((path.startsWith('/') ? path.slice(1) : path) as AssetPath);

const offlineUrl = urlFor('offline.html');

const precache = [
	...immutable.map((entry) => urlFor(entry.path)),
	...assets.map((entry) => urlFor(entry.path)),
	...prerendered.map((entry) => urlFor(entry.path))
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(cacheName);
			await cache.addAll(precache);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== cacheName) await caches.delete(key);
			}
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Navegaciones: red primero; sin conexión, página offline.
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}

	// Assets versionados y archivos estáticos: cache primero.
	if (precache.includes(url.pathname)) {
		event.respondWith(cacheFirst(request));
	}
});

// Permite activar de inmediato una versión nueva desde el banner de la app.
self.addEventListener('message', (event) => {
	const data = event.data as { type?: string } | null;
	if (data?.type === 'SKIP_WAITING') {
		event.waitUntil(self.skipWaiting());
	}
});

async function networkFirst(request: Request): Promise<Response> {
	try {
		return await fetch(request);
	} catch {
		const cache = await caches.open(cacheName);
		const offline = await cache.match(offlineUrl);

		return (
			offline ??
			new Response('Sin conexión', {
				status: 503,
				headers: { 'content-type': 'text/plain; charset=utf-8' }
			})
		);
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	return cached ?? fetch(request);
}
