# FinFlow · Sistema de diseño

Documento de referencia del sistema visual. La fuente de verdad es
`src/routes/layout.css` (tokens) y `src/lib/theme/` (paletas y derivación);
este archivo explica **por qué** están así y cómo usarlos.

---

## 1. Capas

```text
paletas.ts (datos)  →  derive.ts (OKLCH + contraste)  →  --ff-*  →  @theme  →  utilidades
```

- `--ff-*` son las variables reales de color. Cambian en runtime según la
  preferencia del perfil y el modo claro/oscuro.
- `@theme` expone `--color-*` como indirecciones (`--color-primary: var(--ff-primary)`).
  Por eso `bg-primary/10` compila a `color-mix(in oklab, var(--color-primary) 10%, transparent)`
  y sigue a la paleta activa.
- **No escribas hex sueltos** en componentes. Si falta un color, es un token nuevo
  en `layout.css` + `derive.ts`, no una clase arbitraria.

## 2. Tokens semánticos

| Grupo       | Tokens                                                                                                  | Uso                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Superficies | `background`, `surface`, `surface-container-lowest … highest`, `canvas`, `level-1`, `hairline`          | Jerarquía tonal. `surface-container-lowest` es la tarjeta; en oscuro sube de luminosidad |
| Texto       | `ink`, `on-surface`, `on-surface-variant`, `muted`, `muted-soft`, `outline`, `outline-variant`          | `ink`/`on-surface` ≥ 12:1, `muted` ≥ 4.5:1                                               |
| Marca       | `primary` + `on/container/fixed`                                                                        | Acción principal e **ingresos**                                                          |
| Planes      | `secondary` + familia                                                                                   | Metas y ahorro                                                                           |
| Gastos      | `tertiary` + familia                                                                                    | Gastos y deudas                                                                          |
| Estados     | `warning`, `warning-ink`, `warning-ink-strong`, `success`, `error`                                      | Avisos; nunca `amber-*` directo                                                          |
| Hero        | `hero`, `hero-foreground`, `hero-overlay`, `hero-gradient`                                              | Superficie del saldo. Usa la utilidad `hero-surface`                                     |
| Movimiento  | `income-surface/text`, `expense-surface/text`, `plan-surface/text`                                      | Chips y filas de resumen                                                                 |
| Sombras     | `shadow-card`, `shadow-level-1`, `shadow-elevated`, `shadow-sheet`, `shadow-fab`, `shadow-hero`, `glow` | La geometría vive en `layout.css`; el color se deriva por modo                           |

## 3. Modos

- `light`, `dark`, `system` (por defecto). El servidor emite un `<style id="ff-theme">`
  en el `<head>` con `:root:root{…}`; el modo `system` añade
  `@media (prefers-color-scheme: dark)`.
- La especificidad `:root:root` evita depender del orden en que el navegador
  inserte el CSS (dev/HMR).
- Sin JavaScript no hay parpadeo: el primer pintado ya trae el tema correcto.

## 4. Paletas

Catálogo en `src/lib/theme/palettes.ts`: `esmeralda` (por defecto), `mercurio`,
`nubank`, `wise`, `revolut`, `cobalto`, `grafito`, `terracota` y `custom`.

Cada preset define semillas (marca, planes, gastos, tono/croma del neutro y
superficie del hero). `derive.ts` genera el resto y **garantiza**:

- `on-surface`/tarjeta ≥ 12:1 y `muted`/tarjeta ≥ 4.5:1;
- `primary` sobre el fondo ≥ 4.5:1 y `on-primary`/`primary` ≥ 4.5:1;
- `hero-foreground`/`hero` ≥ 7:1;
- distancia de tono entre ingresos y gastos ≥ 40° (en los presets).

La paleta personalizada acepta tres colores y una temperatura de neutro
(frío/neutro/cálido). «Auto-ajustar» mueve la luminosidad en OKLCH hasta cumplir
AA sin cambiar el tono.

## 5. Tipografía

- Inter variable, `font-optical-sizing: auto`.
- Escala: `title-xl` 36, `title-lg` 26, `title-md` 20, `title-sm` 17, `amount` 30,
  `display` 44, `body-lg` 16, `body` 14, `body-sm` 12, `label`/`label-sm`/`label-xs`.
- Pesos: 400 cuerpo, 500–600 etiquetas, 650–700 solo montos y titulares.
- `tnum` en toda cifra que cambie en vivo.

## 6. Radios, elevación y movimiento

- **Radios semánticos** (no uses `rounded-xl/2xl/3xl` en código nuevo):
  `rounded-control` 12 (botones, inputs, chips), `rounded-card` 20 (tarjetas,
  filas, contenedores), `rounded-panel` 28 (hero, hojas y el marco de escritorio)
  y `rounded-full` para píldoras y avatares.
- **Elevación**: un solo nivel en flujo (`shadow-card`) y uno para capas
  flotantes (`shadow-elevated`/`shadow-sheet`). `shadow-hero` y `shadow-fab` son
  tratamientos especiales. En oscuro la sombra se refuerza porque el borde pierde
  contraste.
- Movimiento: 120–250 ms sobre `transform`/`opacity`, respetando
  `prefers-reduced-motion`.

## 7. Reglas de uso

1. Un solo `primary` sólido por vista; el resto va tonal o translúcido.
2. El hero usa `hero-surface` y `bg-hero-overlay` para sus capas internas;
   `hero-foreground` es el texto.
3. Sobre el hero usa `primary-fixed`/`tertiary-fixed`, nunca `*-container`.
4. Estados: `warning` para riesgo, `tertiary` para gasto, `primary` para ingreso.
5. Selectores de la app con `OptionSheet`; nunca `<select>` nativo.
6. Todo flujo remoto necesita `loading`, `error` y `empty`.

## 8. Temporadas

Un **pack** de temporada decora la app entera durante una ventana de fechas y
se puede apagar o forzar por usuario.

- Motor: `src/lib/theme/seasons.ts`. Un pack declara `id`, `name`, `greeting`,
  `window` (mes/día, puede cruzar el año) y una paleta sugerida.
- Preferencia: `profiles.seasonal_theme` → `auto` | `off` | `<id>`.
  `auto` respeta la ventana; un id fuerza el pack (vista previa/QA).
- Resolución: el layout raíz usa la fecha **local** (`dateAtOffset`) y expone
  `data-season` en el contenedor y `data.season` a las páginas.
- Decoración: `src/lib/components/seasonal/` (nieve, guirnalda, sprites pixel
  art y escena) + `src/routes/seasons.css` con todo lo animado.
- La UI de Apariencia permite apagar la decoración o forzarla con «Ver ahora».

### Añadir otra fiesta

1. Crea el pack en `SEASONAL_THEMES` con su ventana.
2. Añade sus sprites en `seasonal/sprites.ts` (todas las filas del mismo ancho;
   `sprites.spec.ts` lo verifica).
3. Añade su bloque `[data-season='<id>']` en `seasons.css` y, si necesita un
   efecto ambiental propio, su rama en `SeasonalLayer.svelte`.
4. Opcional: una paleta en `palettes.ts` y su referencia en `palette`.
5. No hay que tocar la base: el id viaja en `seasonal_theme`.

## 9. Informes exportados

`export-html.ts` recibe un `ReportPalette` (`theme/report.ts`). El informe se
genera **siempre en claro** —se comparte y se imprime— y hereda del tema activo
la marca, planes, gastos y los colores de las series. El hero del informe se
oscurece hasta que el texto blanco cumple 4.5:1, así una marca clara (Wise) no
rompe la portada. Sin sesión se usa `DEFAULT_REPORT_PALETTE`.
