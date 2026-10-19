# FinFlow

Aplicación móvil-first de finanzas personales: movimientos, métricas, metas, deudas, cuentas y ajustes. Construida con **SvelteKit + Svelte 5 (runes)**, **TypeScript estricto**, **Tailwind CSS v4** y **Supabase** (Auth + Postgres + Storage).

## Características

- **Inicio**: patrimonio total con sparkline, ingresos/gastos del mes, presupuestos y movimientos recientes.
- **Movimientos**: lista mensual con navegación entre meses, búsqueda, filtros, alta de gasto/ingreso/transferencia, comprobante adjunto (solo imagen, sin OCR), edición y borrado desde el detalle.
- **Métricas**: totales del periodo con comparación contra el periodo anterior, desglose por categoría, serie temporal y exportación a **CSV** (`;` y coma decimal, compatible con Excel en español) y **PDF**.
- **Planes y metas**: aportaciones, ritmo de ahorro (adelantado / a tiempo / atrasado / vencido), proyección de fecha de alcance, pausar, completar y reactivar.
- **Deudas**: amortización con MSI/interés fijo/interés variable, proyección con método bola de nieve, alertas de vencimiento y pagos atómicos que generan el gasto asociado.
- **Cuentas y categorías**: cuentas con saldo inicial, moneda (no editable), cuenta principal única, archivado y borrado solo sin movimientos; categorías con icono y color; presupuestos por categoría y mes.
- **Ajustes**: perfil, cambio de contraseña, exportaciones y cierre de sesión.
- **Seguridad**: RLS en todas las tablas, secretos solo por variables de entorno, validación con Zod, redirecciones internas validadas, cierre de sesión solo por POST y traducción de errores de Auth al español.
- **Sin modo demo**: los datos se cargan siempre desde Supabase. `supabase/seed.sql` crea el usuario de demostración bajo demanda.

## Requisitos

- Node.js 24+
- Cuenta de Supabase con el esquema de `supabase/migrations/0001_init.sql` y `0002_storage.sql` aplicado.

## Configuración

```sh
cp .env.example .env
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | sí | URL del proyecto (`https://<ref>.supabase.co`) |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sí | Clave publicable (segura para el cliente) |

Las claves de servidor **no** se usan: todo el acceso a Supabase ocurre en el servidor con la sesión del usuario.

## Desarrollo

```sh
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run build` | Compila la app para producción |
| `npm run check` | `svelte-check` (tipado estricto) |
| `npm run lint` | Prettier + ESLint |
| `npm run test:unit` | Vitest: utilidades puras (dinero, fechas, cálculos financieros, validaciones, CSV, series) |
| `npm run test:e2e` | Playwright contra `npm run build && npm run preview` |
| `npm run test` | Ambas suites en orden |

## Datos de demostración

```sh
psql <tu-conexion> -f supabase/seed.sql
# o pega el contenido en el editor SQL de Supabase
```

Usuario: `demo@finflow.app` · Contraseña: `FinFlow2026!` (re-ejecutable: no duplica filas).

## Pruebas E2E

Las pruebas E2E comparten el usuario de demostración y se ejecutan en serie (`workers: 1`). Cada caso crea datos con sufijo de marca de tiempo y los elimina al terminar; los valores tocados (presupuesto de ejemplo, presupuesto global, cuenta principal) se restauran dentro de la propia prueba.

Variables opcionales: `E2E_EMAIL` y `E2E_PASSWORD`.

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
supabase/
  migrations/     # esquema, vistas, RPCs
  seed.sql        # datos de demostración
e2e/              # pruebas end-to-end
```

## Notas de diseño

- El dinero se calcula en **centavos enteros** y se formatea con agrupación `1,234.56`.
- Los agregados de periodos usan límites en UTC; la presentación es local.
- Los formularios usan `use:enhance` con un helper central que muestra toasts y respeta `redirect`. Las pestañas y filtros que viven en la URL se siembran en estado local, porque `action="?/nombre"` descarta los parámetros existentes.
- Los gráficos son SVG hechos a mano (sin librerías); el PDF usa `jspdf`.

## Seguridad en producción

- Las migraciones de `supabase/migrations/` se aplican en orden (0001 esquema, 0002 storage, 0003 endurecimiento e índices). No requieren la CLI ni Docker.
- En el panel de Supabase → **Auth → Providers → Email** conviene activar **Leaked password protection** (Supabase lo revisa contra HaveIBeenPwned). Es el único aviso del asesor de seguridad que no se puede resolver por SQL.
- Los buckets `receipts` y `goal-images` son privados; el acceso se resuelve con URLs firmadas y las políticas exigen que la ruta empiece por `auth.uid()`.

