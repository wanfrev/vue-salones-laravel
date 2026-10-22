# 🎨 LUMA — GUÍA DE REDISEÑO VISUAL (`design.md`)

Guía para rediseñar pantallas de Luma de forma **consistente y sin romper nada**. Complementa a `AGENTS.md` (arquitectura, rendimiento, TanStack Query, multi-tenant): si algo choca, manda `AGENTS.md`.

Se construyó a partir de los rediseños ya hechos: Clientes, Equipo y Gestión de Pagos/Horarios, Servicios, Inventario, Agenda, Calendario y Finanzas (parcial). Cuando el usuario diga «rediseña X», sigue esto.

---

## 0. Las 4 reglas que no se negocian

1. **Rediseño = SOLO visual.** No cambiar lógica, cifras, fórmulas, filtros, valores por defecto, tamaño de página, orden, permisos, textos de negocio ni la forma de hacer las cosas. El usuario lo corrigió explícitamente: *«todos los cambios que necesitaba eran puro visual, nada de lógica ni de forma de hacer las cosas»*.
2. **No quitar nada.** Todo botón, campo, texto, cifra, acción, estado y atajo que existe hoy tiene que seguir existiendo (puede cambiar de lugar, de forma o de color, no desaparecer). *«No quites nada, es todo rediseño.»*
3. **Lo que ya funciona por dentro no se toca.** En el Calendario, la grilla de horas, las tarjetas de citas, el arrastre y los popups quedaron intactos; solo se rediseñó lo que los rodea. Ante la duda sobre algo interactivo y complejo: no tocarlo y avisar.
4. **Mejoras = sugerencias, no cambios.** Si ves algo mejorable (paginación que falta, un bug, un nuevo filtro), se anota en la respuesta final como sugerencia y se pregunta. Nunca se aplica «de paso».

**Objetivo estético común** (lo que el usuario pide siempre): *menos cards, menos píldoras, más limpio y refinado*, como el POS.

---

## 1. Flujo de trabajo para cada pantalla

### 1.1 Antes de tocar nada — inventario de comportamiento
Lee el código viejo completo (vista + componentes hijos + composable) y **escribe la lista** de:
- Totales/cifras y de dónde salen (qué lista, qué período, qué filtro).
- Tamaño de página, orden por defecto, valores por defecto de filtros.
- Visibilidad de botones (permisos, feature flags, rol, nicho, solo lectura).
- Etiquetas y textos (incluida la terminología por nicho: `businessStore.terminology`).
- Cómo busca (campos, mayúsculas/acentos), qué limpia «Limpiar filtros».
- Estados: cargando, vacío, error.
- Emits/handlers que el padre espera.

### 1.2 Durante
- **Conserva el flujo de datos del padre**: props, eventos, computeds y composables se quedan; solo se mueve markup/CSS a componentes nuevos (presentacionales).
- Cambia el **template**; el `<script>` del padre se toca lo mínimo (imports, un computed de opciones).
- Un componente ≤ 400 líneas (AGENTS.md §5). Si la vista se pasa, extrae piezas presentacionales.

### 1.3 Después — verificación real (no «debería funcionar»)
1. `npx vitest run` (toda la suite), `npx vue-tsc --noEmit` (filtrar por los archivos tocados), `npm run build`.
2. Vista previa en el navegador del panel con **datos falsos** (ver §6): escritorio con ancho real (~720 px de contenido), móvil 375 px y modo oscuro. Medir con JS: sin scroll horizontal (`scrollWidth === clientWidth`), conteos de filas, clics clave.
3. Tests nuevos de los componentes (ver §7).
4. Borrar los archivos temporales de la vista previa.
5. **Reporte final** (ver §8): qué cambió, qué se comprobó que sigue igual, diferencias menores, sugerencias.

No hacer `git commit` salvo que el usuario lo pida.

---

## 2. Anatomía estándar de una pantalla rediseñada

```
┌ Encabezado: icono + h1 (+ acciones primarias a la derecha)
│
├ UNA tarjeta contenedora (`overflow-hidden rounded-2xl border border-border bg-surface shadow-sm`)
│   ├ Franja de cifras (si la pantalla tenía tarjetas de KPI)   ← borde inferior fino
│   ├ Buscador (+ filtros)                                        ← borde inferior fino
│   ├ Pestañas subrayadas (si hay vistas)                         ← borde inferior fino
│   ├ Lista de filas / cuadrícula de celdas
│   └ Paginación compartida (`ListPagination`)
└ Modales (sin cambios)
```

- **Encabezado:** `<DollarIcon class="h-4 w-4 text-primary"/>` + `<h1 class="text-xl font-bold tracking-tight text-text sm:text-2xl">`. Antes era un «eyebrow» pequeño en mayúsculas; ahora es un título real. Acciones primarias a la derecha (`flex shrink-0`); en móvil pueden pasar a icono solo **si ya lo hacían**.
- **Tarjeta única** en vez de una por bloque. Los bloques se separan con `border-b border-border-subtle`.
- **Cifras sin tarjetas:** una franja `grid`/`flex` con `<dl>`: etiqueta `text-[11px] uppercase tracking-wider text-text-muted`, valor `text-lg font-bold tabular-nums`. Si eran clicables (filtros), son `<button>` con estado activo (ver §3.6).
- **Espaciado:** `px-3 sm:px-4` dentro de la tarjeta; `py-2.5`–`py-3` por bloque.

---

## 3. Recetas de componentes (copiar, no reinventar)

### 3.1 Pestañas subrayadas (reemplazan botones en bloque / píldoras)
```html
<div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="…">
  <button v-for="t in tabs" role="tab" :aria-selected="active === t.value"
    class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
    :class="active === t.value ? 'text-primary' : 'text-text-secondary hover:text-text'">
    {{ t.label }}
    <span v-if="active === t.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
  </button>
</div>
```
⚠️ **Siempre `overflow-y-hidden` junto a `overflow-x-auto`**: sin él la fila hace scroll vertical («sube y baja»). Ya pasó.

### 3.2 Control segmentado (Hoy/Semana/Rango/Todas, D/S/M/A, Día/Mes/Año)
Un solo control, no varios botones sueltos:
```html
<div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
  <button class="px-3 py-2 transition-colors"
    :class="active ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'">…</button>
</div>
```

### 3.3 Buscador
`rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm … focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15` con `MagnifierIcon` a la izquierda. Placeholder corto (cabe en móvil); lo largo va en `title`/`aria-label`.

### 3.4 Selectores de lista larga → `FilterSelect` (NO `<select>` nativo)
`components/common/FilterSelect.vue`: botón + menú teleportado al `<body>` con posición fija, `max-height` con scroll interno, nunca más ancho que la pantalla, se abre hacia arriba si no cabe, cierra con clic fuera/Esc/elegir. Los `<select>` nativos con muchas opciones **se desbordan** (pasó en Agenda con empleados/servicios). Props: `v-model` (string), `options: {value,label}[]`, `ariaLabel`, `defaultValue` (valor «sin filtro»: se pinta en gris). El valor emitido es el mismo de antes (`'all'` o el id).
Un `<select>` nativo corto (3–6 opciones, ej. orden) puede quedarse nativo.

### 3.5 Filas de lista (una sola estructura para escritorio y móvil)
**Nunca duplicar tabla + tarjetas móviles.** Una `<ul class="divide-y divide-border-subtle">` con `<li>` en grid:
- Escritorio: `lg:grid lg:grid-cols-[minmax(0,1fr)_Xrem_…_var(--actions-w)] lg:items-center lg:gap-3`.
- **La última columna (acciones) de ANCHO FIJO**, nunca `auto`: si no, las columnas no se alinean entre filas porque cada fila es su propia grid. Cada botón icono mide `1.75rem` (`p-1.5` + `h-4 w-4`); `--actions-w = n*1.75rem` por `style`.
- **Dimensiona para el ancho real:** con el sidebar (256 px) el contenido en `lg` mide solo **~720 px**. Suma columnas fijas + gaps + padding y confirma que queda ≥ ~200 px al texto principal. Si no cabe, fusiona columnas (p. ej. «origen · empleado · método» en una línea bajo la descripción).
- Encabezados de columna: fila aparte `hidden lg:grid` con `text-[11px] font-bold uppercase tracking-wider text-text-muted` y `bg-bg-secondary/30`.
- Móvil: `relative`, acciones `absolute right-2 top-2 lg:static`, el bloque principal con `pr-[calc(var(--actions-w)+0.25rem)] lg:pr-0` para no pisarlas.
- Truco **`lg:contents`**: en móvil un bloque de 3 datos en `grid grid-cols-3` con etiquetas pequeñas (`lg:hidden`); en escritorio el contenedor desaparece (`lg:contents`) y sus hijos pasan a ser columnas de la grid de la fila.
- Densidad móvil objetivo: filas de ~80–165 px, no tarjetas de 140+ px.

### 3.6 Franja de cifras clicables (filtros por estado)
Celdas `<button>` con hover `bg-bg-secondary/50`; **activa** = fondo suave del color + línea inferior: `bg-warning/5 shadow-[inset_0_-2px_0] shadow-warning`. Separar celdas con `divide-x` (y en móvil 2×2 con `[&>*:nth-child(n+3)]:border-t`). Mantener los mismos handlers (`toggle…`) y las mismas reglas (p. ej. «al elegir Pendientes se fuerza la vista Activas»).

### 3.7 Cuadrícula de celdas (Servicios) en vez de tarjetas sueltas
Una tarjeta contenedora; cada elemento es una **celda con líneas finas**, no una `card`:
```html
<div class="overflow-hidden">
  <div class="-mb-px -mr-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <article class="border-b border-r border-border-subtle p-4 hover:bg-bg-secondary/40">…</article>
```
`-mb-px -mr-px` + `overflow-hidden` esconde el borde exterior y funciona con cualquier cantidad de elementos (última fila incompleta incluida). Mismos breakpoints/columnas que tenía la cuadrícula original.

### 3.8 Estados y «píldoras»
- **Estado (Activo/Pendiente/Pagada…)** → punto de 6 px + texto de color, sin cápsula: `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"/>Activo</span>`. Para no duplicar paletas, **reutiliza la fuente de color existente** (p. ej. `getStatusColor(status)` y quedarse con el token `text-*`; los colores por estado NO se reasignan: en Agenda `confirmed` es amarillo y `pending` rojo, así es).
- Elemento «normal» que no necesita etiqueta (p. ej. producto Activo) puede no mostrar nada y marcar solo la excepción (`· Inactivo` + `opacity-60`) — **solo si el dato sigue visible de alguna forma**; mencionarlo en «diferencias menores».
- Tags tipo «+2 servicios» → texto `text-xs font-semibold text-primary`.
- Chips de filtro (segmentos con contador) son aceptables cuando hay conteos (Clientes); si no, usar pestañas subrayadas.

### 3.9 Botones
- Primario: `rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 hover:bg-primary-hover`.
- Secundario: `rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text hover:bg-bg-secondary`.
- Acción terciaria/enlace: `rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10` (sin borde): «Hoy», «Ver todas», «Ahora».
- Destructiva suave: `text-danger hover:bg-danger/10` (ej. «Limpiar filtros»).
- Iconos: `rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-primary` (`hover:!text-danger` / `!text-warning` para eliminar/desactivar). **Siempre `title` + `aria-label`** (los tests y la accesibilidad dependen de ello).
- En móvil, grupos de botones largos: `flex flex-wrap gap-2` con `flex-1 justify-center sm:flex-none` para que ordenen en filas limpias.

### 3.10 Estados vacío / cargando / error
- Vacío: icono en círculo `h-14 w-14 bg-bg-secondary` + título `text-base font-medium` + subtítulo, **con el mismo texto de antes**, dentro de la tarjeta.
- Cargando: filas esqueleto (`animate-pulse`) dentro de la tarjeta, no tarjetas aparte. Regla de AGENTS.md §8: nada de overlay con blur ni spinner gigante.
- Error: caja `rounded-xl border border-danger/30 bg-danger/5` con el mensaje original.

---

## 4. Tokens y reglas de diseño

Colores (de `AGENTS.md` §9): `--color-primary #869C84`, hover `#748A72`/`#95AD93`, success `#10b981`/`#34d399`, danger `#ef4444`, warning `#f59e0b`, bordes `--color-border`. Usa las **clases semánticas** de Tailwind (`text-text`, `text-text-muted`, `text-text-secondary`, `bg-surface`, `bg-bg-secondary`, `border-border`, `border-border-subtle`, `text-primary`, `bg-primary/10`, `text-success|warning|danger|info`) — nunca hex sueltos, para que el modo oscuro funcione solo.

- Radio: tarjeta `rounded-2xl` (en el Calendario, `rounded-xl` para casar con la grilla que no se toca); controles `rounded-xl`; iconos/enlaces `rounded-lg`.
- Números: `tabular-nums` siempre. Montos con signo/color: `+` verde, `-` rojo.
- Texto mínimo `text-[10px]` (etiquetas); cuerpo `text-sm`; títulos de sección `text-sm font-semibold`.
- Reutilizar **antes de crear**: `DirectoryHeader` (título + total + alcance «en el negocio/en la sucursal X»), `ListPagination` (siempre que haya `usePagination`), `FilterSelect`, `EmptyState`, `ModalBase`.
- Transiciones: `transition-colors` / `transition-theme`; los fades de AGENTS.md §8 para skeleton → contenido.
- Terminología por nicho: nunca hardcodear «cita/cliente/empleado/servicio»; usar `businessStore.terminology.*` con el fallback que ya tenía el código.

---

## 5. Trampas conocidas (ya nos mordieron)

| Trampa | Qué hacer |
|---|---|
| `overflow-x-auto` sin `overflow-y-hidden` | La fila hace scroll vertical. Siempre los dos. |
| `<select>` nativo con listas largas | Se desborda: `FilterSelect`. |
| Grid por fila con última columna `auto` | Columnas desalineadas: ancho fijo vía `--actions-w`. |
| Tabla + tarjetas móviles | Duplica botones/tests: una sola estructura responsive. |
| Calcular columnas para 1100 px | El contenido real en `lg` mide ~720 px. Probar con `max-width: 740px`. |
| Quitar `relative` / añadir `relative` en wrappers del Calendario | `onDocClick` cierra los menús mirando `closest('.relative')`: **no poner `relative` en la tarjeta contenedora**; mantener `relative` en los wrappers de cada dropdown. |
| `<button>` anidado dentro de `<button>` (KpiCards: «Ver propinas») | HTML inválido; usar `<span role="button">` con `@click.stop`. |
| Tarjeta con `overflow-hidden` que contiene un popover absoluto | El popover se recorta: teleport al body (`FilterSelect`) o sacar el `overflow-hidden`. |
| Cambiar filtros en un handler sin preservar su efecto secundario | Ej.: Pendientes/Confirmadas fuerzan `viewMode = 'active'`; el aviso «Buscando en todas las fechas»; `Limpiar filtros` vuelve a Semana. Léelo en el código viejo. |
| Pestaña de contenido condicionada por rol/nicho/feature | Conservar las mismas condiciones (`mainTabs`, `watch` de redirección, `hideFinancialDashboard`, etc.). |
| Montos/cifras recalculados «mejor» | Prohibido. Mismo cálculo, misma fuente, mismo redondeo. |

---

## 6. Cómo verificar visualmente (técnica que funciona)

1. `preview_start` con la config `client` (`.claude/launch.json`, puerto 5173).
2. Crear **temporalmente** `client/preview-<x>.html` + `client/src/__preview-<x>.ts` que monten la vista (o los componentes) con `createPinia()`, `VueQueryPlugin` (con un `QueryClient` de `staleTime: Infinity, retry: false`), `SolarIconsPlugin`, y un `createRouter({ history: createMemoryHistory() })` si usa router.
3. **Sembrar datos** con `queryClient.setQueryData(<la clave real del composable>, datos)` (las claves salen de `serviciosKeys`, `productosKeys`, `agendaKeys`, `equipoKeys`, etc.; mira el `queryKey` exacto del `useQuery`). Rol/negocio: `useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } })` **después** de `app.use(pinia)`.
4. Revisar: escritorio (`resize_window` 1100×900 y `document.getElementById('app').style.maxWidth='740px'` para simular el ancho con sidebar), `preset: 'mobile'` (375), `colorScheme: 'dark'` + `data-theme="dark"`/clase `dark` en `<html>`.
5. Comprobar con `javascript_tool`: sin scroll horizontal, conteo de filas, que los clics hacen lo mismo que antes (filtros, tabs, ordenar, abrir/cerrar menús).
6. **Borrar** `preview-*.html` y `__preview-*.ts` y hacer `preview_stop`. `git status` no debe mostrar archivos de preview.

Gotchas de la herramienta: los `<Transition>` y las capturas **solo avanzan cuando se toma un screenshot** (un menú «sigue abierto» puede ser un cuadro viejo: verifica con JS); si un screenshot sale en blanco, repítelo; las llamadas a la API fallan en la preview (`ERR_CONNECTION_REFUSED`, «Failed to fetch») y es normal; la preview no corre con credenciales reales: no iniciar sesión.

---

## 7. Tests de los componentes nuevos

Patrón (Vitest + `@vue/test-utils`): cualquier componente que use `useCurrency`/store necesita Pinia y TanStack:
```ts
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
const plugins = [createPinia(), VueQueryPlugin]
mount(Comp, { props, global: { plugins } })
```
Qué cubrir: que muestra los datos (cifras, etiquetas, signo/color por tipo), que cada acción **emite** lo mismo que antes (`edit`, `delete`, `toggle`, `viewAll`…), visibilidad por permisos (`readonly`, `showTransfer`, `isStaffing`…), estados vacío/error, paginación (tamaño de página), y que el menú teleportado (`FilterSelect`) abre/cierra. Usa `data-testid` en filas (`product-row`, `agenda-row`, `recent-tx`) y `title`/`aria-label` en botones icono.

Ejemplos: `components/agenda/AgendaParts.test.ts`, `components/productos/InventoryLists.test.ts`, `components/servicios/ServiceCard.test.ts`, `components/finanzas/FinanzasSummary.test.ts`.

---

## 8. Formato del reporte final (siempre en español, sin tecnicismos de más)

1. **Qué se hizo** y en qué estado (verificado con qué: tests, tipos, build, vista previa; y qué NO se pudo probar: datos reales/sesión).
2. **Qué cambió** (bullets cortos por zona de la pantalla).
3. **Comprobé que sigue igual** (lista concreta de comportamientos del inventario de §1.1).
4. **Diferencias menores** (todo lo que cambió de forma aunque no de función: píldora→texto, columna fusionada, mensaje vacío ahora también en móvil…). Ser honesto, sin esconderlas.
5. **Sugerencias que NO apliqué** (paginación faltante, selects nativos en otros módulos, etc.).
6. Recordar que los archivos de preview se borraron y que **no hay commit**.

---

## 9. Registro de rediseños (qué existe y qué falta)

| Módulo | Estado | Archivos clave | Notas |
|---|---|---|---|
| Clientes | ✅ | `components/clients/ClientDirectory{Toolbar,List}.vue`, `clientFilters.ts`, `DirectoryHeader.vue` | Quedan diferencias de lógica por decidir (ventana de inactividad en presets, «Inactivos» sin nunca-visitados, búsqueda sin acentos, 20 por página). Preguntar si se revierten. |
| Equipo + Gestión de Pagos y Horarios | ✅ (lógica original restaurada) | `TeamDirectory`, `GestionTabs`, `ServiciosPanel`, `NominaPanel`, `DeudaPanel`, `HorariosPanel`, `payrollPeriods.ts` | Los botones «Registrar pago»/«Debitar consumo» viven DENTRO de Nómina. Pendiente de decidir: reinicio de página al cambiar la lista. |
| Servicios | ✅ | `views/Servicios.vue`, `components/servicios/*` | Cuadrícula de celdas finas. |
| Inventario (`Productos.vue`) | ✅ | `components/productos/{ProductStats,InventoryToolbar,ProductList,MovementList}.vue` | La lista NO está paginada (carga todo); movimientos limitados a 50 por el servicio. Sugerencia pendiente. |
| Agenda (`Admin.vue` + `EmployeeAgenda.vue`) | ✅ | `components/agenda/{AgendaSummaryStrip,AgendaFilters,AgendaListView}.vue`, `common/FilterSelect.vue` | `AgendaListView` compartido: el padre da título/conteo por el slot `summary`. |
| Calendario | ✅ (solo la barra superior) | `components/agenda/AgendaCalendar.vue` líneas del template superior | La grilla/tarjetas/arrastre/popups NO se tocaron y no deben tocarse. |
| Finanzas | 🟡 parcial | `views/Finanzas.vue` (encabezado+tabs+período), `KpiCards`, `CurrencyBreakdown`, `RecentTransactionsCard` | **Falta**: pestañas Ingresos (`DetailMovimientos`, 937 líneas), Egresos (`ExpensesSection`, `SupplierPaymentsSection`, `EmployeePaymentsSection` 676), Créditos, Propinas, Bancos, Cuadre del Día, y `FinanzasRegistros.vue`. Es un módulo con dinero: una pestaña a la vez, misma regla de no quitar nada. |
| POS | ✅ (rediseño previo) | `views/POS.vue` | Es la referencia estética original. |
| Pendientes por revisar | ⬜ | Reportes, Proveedores, Requerimientos, Créditos/Gift cards, CRM, Configuración, Nómina, Incidentes, vistas de empleado (`views/employee/*`), módulos clínico/dental | Revisar primero si tienen la «tarjetitis» (tarjetas de KPI arriba + tabla/tarjetas duplicadas) y aplicar §2–§3. |

Cada vez que se termine un módulo, **actualizar esta tabla**.

---

## 10. Checklist rápido antes de dar por terminado

- [ ] Inventario de comportamiento escrito y comparado (nada quitado, nada cambiado de lógica).
- [ ] Una tarjeta contenedora; pestañas subrayadas / control segmentado en vez de botones en bloque.
- [ ] Una sola estructura responsive (sin tabla+tarjetas duplicadas); última columna de ancho fijo.
- [ ] Estados como punto+texto; sin cápsulas innecesarias.
- [ ] Selectores largos con `FilterSelect`.
- [ ] Botones icono con `title` + `aria-label`; `data-testid` en filas.
- [ ] Probado a 740 px de ancho, móvil 375 y oscuro; sin scroll horizontal.
- [ ] `vitest` completo, `vue-tsc` limpio en lo tocado, `npm run build` OK.
- [ ] Tests nuevos de los componentes.
- [ ] Archivos de preview borrados; sin commit.
- [ ] Reporte final con diferencias menores y sugerencias; tabla de §9 actualizada.
