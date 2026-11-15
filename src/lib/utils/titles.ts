/**
 * Títulos de documento por ruta.
 *
 * El navegador usa la URL como título cuando la página no declara uno, así que
 * el título se resuelve aquí una sola vez y el layout raíz lo emite. Las rutas
 * específicas van antes que las genéricas (`/movimientos/nuevo` antes de
 * `/movimientos`).
 *
 * No agregues `<title>` en las páginas: duplicaría el nodo en el `<head>`.
 */

const SUFFIX = 'FinFlow';

const ROUTES: ReadonlyArray<readonly [RegExp, string]> = [
	[/^\/movimientos\/nuevo$/, 'Nuevo movimiento'],
	[/^\/movimientos\/[^/]+$/, 'Detalle del movimiento'],
	[/^\/movimientos$/, 'Movimientos'],

	[/^\/planes\/nuevo$/, 'Nuevo plan'],
	[/^\/planes\/[^/]+$/, 'Detalle del plan'],
	[/^\/planes$/, 'Planes'],

	[/^\/deudas\/nueva$/, 'Nueva deuda'],
	[/^\/deudas\/[^/]+$/, 'Detalle de la deuda'],
	[/^\/deudas$/, 'Deudas'],

	[/^\/cuentas\/nueva$/, 'Nueva cuenta'],
	[/^\/cuentas\/[^/]+$/, 'Detalle de la cuenta'],
	[/^\/cuentas$/, 'Cuentas'],

	[/^\/categorias\/nueva$/, 'Nueva categoría'],
	[/^\/categorias\/[^/]+$/, 'Editar categoría'],

	[/^\/metricas$/, 'Métricas'],
	[/^\/apariencia$/, 'Apariencia'],
	[/^\/ajustes$/, 'Configuración'],

	[/^\/login$/, 'Iniciar sesión'],
	[/^\/registro$/, 'Crear cuenta'],
	[/^\/recuperar$/, 'Recuperar contraseña'],
	[/^\/restablecer$/, 'Restablecer contraseña'],

	[/^\/$/, 'Inicio']
];

/** Título del documento para una ruta, con la marca como sufijo. */
export function pageTitle(pathname: string): string {
	const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	const match = ROUTES.find(([pattern]) => pattern.test(normalized));
	return match ? `${match[1]} · ${SUFFIX}` : SUFFIX;
}
