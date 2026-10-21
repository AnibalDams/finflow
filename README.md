# FinFlow

Aplicación móvil-first de finanzas personales: movimientos, métricas, metas, deudas, cuentas y ajustes. Construida con **SvelteKit + Svelte 5 (runes)**, **TypeScript estricto**, **Tailwind CSS v4** y **Supabase** (Auth + Postgres + Storage).

## Características

- **Inicio**: patrimonio total con sparkline, ingresos/gastos del mes, presupuestos y movimientos recientes.
- **Movimientos**: lista mensual con navegación entre meses, búsqueda, filtros, alta de gasto/ingreso/transferencia, comprobante adjunto (solo imagen, sin OCR), edición y borrado desde el detalle.
- **Métricas**: totales del periodo con comparación contra el periodo anterior, desglose por categoría, serie temporal y exportación a **CSV** (`;` y coma decimal, compatible con Excel en español) y **PDF**.
- **Planes y metas**: aportaciones, ritmo de ahorro (adelantado / a tiempo / atrasado / vencido), proyección de fecha de alcance, pausar, completar y reactivar.
- **Deudas**: amortización con MSI/interés fijo/interés variable, frecuencia **semanal, quincenal o mensual**, fecha de origen, monto ya entregado, cuotas pagadas con calendario, proyección con método bola de nieve, alertas de vencimiento y pagos atómicos que generan el gasto asociado.
- **Cuentas y categorías**: cuentas con saldo inicial, moneda (no editable), cuenta principal única, archivado y borrado solo sin movimientos; categorías con icono y color; presupuestos por categoría y mes.
- **Ajustes**: perfil, cambio de contraseña, exportaciones y cierre de sesión.
- **PWA instalable**: manifest, iconos propios, service worker con página offline y sección "Instalar aplicación" en Ajustes (con instrucciones para iOS).
- **Seguridad**: RLS en todas las tablas, secretos solo por variables de entorno, validación con Zod, redirecciones internas validadas, cierre de sesión solo por POST y traducción de errores de Auth al español.
- **Sin modo demo**: los datos se cargan siempre desde Supabase. `supabase/seed.sql` crea el usuario de demostración bajo demanda.

## Requisitos

- Node.js 24+
- Cuenta de Supabase con el esquema de `supabase/migrations/0001_init.sql` y `0002_storage.sql` aplicado.

## Configuración

```sh
cp .env.example .env
```

| Variable                          | Obligatoria | Descripción                                                                |
| --------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`             | sí          | URL del proyecto (`https://<ref>.supabase.co`)                             |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sí          | Clave publicable (segura para el cliente)                                  |
| `SITE_URL`                        | producción  | URL pública (`https://tu-dominio.com`) para enlaces de confirmación/correo |

Las claves de servidor **no** se usan: todo el acceso a Supabase ocurre en el servidor con la sesión del usuario.

## Desarrollo

```sh
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Comando             | Descripción                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `npm run build`     | Compila la app para producción                                                             |
| `npm run check`     | `svelte-check` (tipado estricto)                                                           |
| `npm run check:sw`  | Type-check del service worker con `$app/tsconfig/service-worker`                           |
| `npm run icons`     | Regenera los iconos PWA desde el logo del navbar                                           |
| `npm run lint`      | Prettier + ESLint                                                                          |
| `npm run test:unit` | Vitest: utilidades puras (dinero, fechas, cálculos financieros, validaciones, CSV, series) |
| `npm run test:e2e`  | Playwright contra `npm run build && npm run preview`                                       |
| `npm run test`      | Ambas suites en orden                                                                      |

## PWA e instalación

- `static/manifest.webmanifest` e iconos en `static/icons/` (192, 512, maskable 512 y Apple 180). Se generan desde el logo del navbar con `npm run icons` (usa Playwright, sin dependencias nuevas).
- El service worker (`src/service-worker/index.ts`) precachea solo los assets inmutables del build y los archivos estáticos. Las navegaciones son **network-first** con fallback a `/offline.html`; nunca se cachean datos financieros ni HTML autenticado.
- SvelteKit registra el service worker automáticamente en producción (en `vite dev` no se registra). Para probarlo: `npm run build && npm run preview`.
- En cada navegación del cliente (`afterNavigate`) se ejecuta `registration.update()`. Si hay una versión nueva esperando, aparece un banner **"Nueva versión disponible"** que la activa con `SKIP_WAITING` y recarga la app.
- En **Ajustes → Instalar aplicación** aparece el botón nativo cuando el navegador lo permite; en iOS se muestran los pasos (Compartir → Añadir a pantalla de inicio). Si ya está instalada, la sección lo indica.

## Datos de demostración

```sh
psql <tu-conexion> -f supabase/seed.sql
# o pega el contenido en el editor SQL de Supabase
```

El script rellena datos ficticios, pero **no crea ni publica credenciales**. Crea un usuario de pruebas propio en Supabase Auth y pásalo a las pruebas con `E2E_EMAIL` / `E2E_PASSWORD`. La contraseña de la antigua cuenta `demo@finflow.app` fue rotada a un valor aleatorio no publicado y sus sesiones fueron revocadas; no reutilices credenciales de demostración en producción.

## Pruebas E2E

Las pruebas E2E comparten un usuario de pruebas dedicado y se ejecutan en serie (`workers: 1`). Cada caso crea datos con sufijo de marca de tiempo y los elimina al terminar; los valores tocados (presupuesto de ejemplo, presupuesto global, cuenta principal) se restauran dentro de la propia prueba.

Variables necesarias para las pruebas con sesión: `E2E_EMAIL` y `E2E_PASSWORD` (secretos de CI, sin valores por defecto). Si faltan, esos casos se omiten.

```sh
E2E_EMAIL=test@tu-dominio.com E2E_PASSWORD='...' npx playwright test
```

```sh
npx playwright test --ui    # para explorar
```

## Estructura

```
src/
  lib/
    components/   # UI kit y componentes de dominio (cards, sheet, charts, TransactionRow)
    server/       # capa de datos: queries, mutations, alerts, results
    routes/       # (app) shell con navegación, (full) flujos de detalle, (auth) sesión
    utils/        # dinero (centavos), fechas, finanzas, validación, exportación, series
    types/        # tipos de dominio y tipos generados de la base de datos
  service-worker/ # precache de assets y fallback offline
static/           # manifest, iconos PWA y página offline
scripts/          # generación de iconos
supabase/
  migrations/     # esquema, vistas, RPCs
  seed.sql        # datos de demostración
e2e/              # pruebas end-to-end
```

## Notas de diseño

- El dinero se calcula en **centavos enteros** y se formatea con agrupación `1,234.56`.
- En deudas, `monthly_payment` almacena la **cuota por periodo**; el compromiso mensual se deriva de la frecuencia (52/12 semanal, 2 quincenal, 1 mensual) y el interés anual se convierte a tasa periódica (÷52, ÷24, ÷12).
- La zona horaria del navegador se guarda en la cookie `tz_offset` (minutos). Los rangos de periodo se convierten a instantes UTC para consultar y la analítica recibe el offset; las fechas y timestamps se muestran siempre en hora local.
- Los formularios usan `use:enhance` con un helper central que muestra toasts y respeta `redirect`. Las pestañas y filtros que viven en la URL se siembran en estado local, porque `action="?/nombre"` descarta los parámetros existentes.
- Los gráficos son SVG hechos a mano (sin librerías); el PDF usa `jspdf`.
- La interfaz da respuesta inmediata: barra de progreso de navegación, atenuado del contenido al cambiar de ruta, estados `loading` en cada acción y transiciones de 120–250 ms sobre `transform`/`opacity`. Todo respeta `prefers-reduced-motion`.
- Los selectores (cuentas, moneda, tipo de cuenta, filtros y día de recordatorio) usan una **hoja inferior** propia (`OptionSheet`) en lugar del menú nativo del navegador. Mantienen `name`/`required` con un `<select>` oculto, y son navegables con teclado (flechas, Home/End, Escape) devolviendo el foco al cerrar.
- Las hojas (`Sheet`) atrapan el foco con Tab/Shift+Tab y lo devuelven al disparador al cerrarse; `NotificationsSheet` reutiliza el mismo componente con su animación de salida.

## Seguridad en producción

- Las migraciones de `supabase/migrations/` se aplican en orden (0001 esquema, 0002 storage, 0003 endurecimiento e índices, 0004 frecuencia y origen de deudas, 0005 hardening de RPCs y permisos, 0006 integridad multi-tenant). No requieren la CLI ni Docker.
- Configura `SITE_URL` con el dominio de producción para que los enlaces de confirmación y recuperación no dependan del header `Host`.
- Las cookies de sesión son `HttpOnly`, `Secure` y `SameSite=Lax`; las respuestas autenticadas se envían con `Cache-Control: private, no-store`.
- La app aplica CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` y cabeceras COOP/CORP. HSTS lo añade Vercel en el despliegue actual.
- Los formularios de Auth tienen rate limiting en memoria, contraseñas de mínimo 12 caracteres con letras y números, comprobación k-anonymity contra HaveIBeenPwned y reautenticación para cambiar la contraseña. Para un despliegue multi-instancia, complementa el limitador con un almacén distribuido (KV/Redis).
- En el panel de Supabase → **Auth → Providers → Email**, activa también **Leaked password protection** (es una configuración del proveedor, no de la base de datos).
- Los buckets `receipts` y `goal-images` son privados; el acceso se resuelve con URLs firmadas y las políticas exigen que la ruta empiece por `auth.uid()`.
- Los archivos subidos se validan por MIME, tamaño y firma binaria (magic bytes). Para entornos de alto riesgo, añade análisis antivirus.
