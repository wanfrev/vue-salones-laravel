<template>
  <aside
    :class="[
      'fixed left-0 top-[var(--header-total)] h-[calc(100dvh-var(--header-total))] w-64 bg-surface border-r border-border shadow-xl transition-theme transition-transform duration-300 lg:translate-x-0 flex flex-col',
      isOpen ? 'z-40 translate-x-0' : 'z-40 -translate-x-full lg:z-40'
    ]"
  >
    <nav ref="navEl" class="relative flex-1 overflow-y-auto px-3 pt-4 pb-2 touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
      <div
        aria-hidden="true"
        class="sidebar-pill pointer-events-none absolute left-2 right-2 rounded-lg border-l-[3px] border-primary bg-primary-light transition-[top,height,opacity] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[top,height] motion-reduce:transition-none"
        :style="{ top: `${pill.top}px`, height: `${pill.height}px`, opacity: pill.visible ? 1 : 0, transitionDuration: pill.animate ? undefined : '0ms' }"
      />
      <template v-for="section in visibleSections" :key="section.title ?? 'main'">
        <p v-if="section.title" class="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted/70">
          {{ section.title }}
        </p>

        <template v-for="link in section.links" :key="link.to">
          <!-- Expandable group (e.g. Configuración) — the header toggles, sub-links navigate. -->
          <div v-if="link.children && link.children.length">
            <button
              type="button"
              :data-nav-key="`g:${link.to}`"
              @click="toggleExpanded(link.to)"
              :class="[
                'group relative mb-0.5 flex w-full items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-2 text-left text-sm font-medium transition-theme',
                isGroupActive(link)
                  ? 'border-transparent text-text'
                  : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text'
              ]"
            >
              <span :class="[
                'flex h-7 w-7 items-center justify-center rounded-md transition-theme',
                isGroupActive(link) ? 'text-primary sidebar-icon-pop' : 'bg-bg-secondary group-hover:bg-border'
              ]">
                <component :is="link.icon" class="h-4 w-4" />
              </span>
              <span :class="['flex-1', isGroupActive(link) && 'font-semibold']">{{ resolveLabel(link) }}</span>
              <svg
                class="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded(link.to) }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
                <div v-if="isExpanded(link.to)" class="mb-1 ml-4 space-y-0.5 border-l border-border pl-3">
              <router-link
                v-for="child in link.children"
                :key="child.to"
                :to="child.to"
                :aria-current="isActive(child.to) ? 'page' : undefined"
                @click="onNavClick($event, child.to)"
                @pointerenter="prefetch(child.to)"
                @focus="prefetch(child.to)"
                @touchstart.passive="prefetch(child.to)"
                :class="[
                  'relative flex items-center gap-2.5 rounded-lg py-2 pr-3 pl-2 text-[13px] font-medium transition-theme',
                  isActive(child.to)
                    ? 'bg-bg-secondary text-primary font-semibold'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text active:bg-bg-secondary'
                ]"
              >
                <component :is="child.icon" class="h-3.5 w-3.5 shrink-0" />
                {{ resolveLabel(child) }}
              </router-link>
            </div>
          </div>

          <router-link
            v-else
            :to="link.to"
            :data-nav-key="`l:${link.to}`"
            :aria-current="isActive(link.to) ? 'page' : undefined"
            @click="onNavClick($event, link.to)"
            @pointerenter="prefetch(link.to)"
            @focus="prefetch(link.to)"
            @touchstart.passive="prefetch(link.to)"
            :class="[
              'group relative mb-0.5 flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-2 text-sm font-medium transition-theme',
              isActive(link.to)
                ? 'border-transparent text-text'
                : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text active:bg-bg-secondary'
            ]"
          >
            <span :class="[
              'flex h-7 w-7 items-center justify-center rounded-md transition-theme',
              isActive(link.to) ? 'text-primary sidebar-icon-pop' : 'bg-bg-secondary group-hover:bg-border'
            ]">
              <component :is="link.icon" class="h-4 w-4" />
            </span>
            <span :class="['flex-1', isActive(link.to) && 'font-semibold']">{{ resolveLabel(link) }}</span>
            <span
              v-if="link.badge && !isActive(link.to)"
              class="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary"
            >
              {{ badgeLabel(link.badge) }}
            </span>
          </router-link>
        </template>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadRouteLocation, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole, isEncargado } from '../../constants/roles'
import { evaluateGate } from '../../router/gate'
import { sidebarSections } from './sidebarLinks'
import { matchNavPath } from './sidebarActive'
import type { SidebarLink } from './sidebarLinks'
import { useI18n, messageCatalog, type MessageKey } from '../../i18n'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()

const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))
// Stricter than isAdmin (which also lets an encargado through) — admin/superadmin only, for
// links whose page content is itself gated that strictly (e.g. Configuración's sub-pages).
const isStrictAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')

// "Modo Gabinete" — an opt-in, per-employee toggle (default false) that trims the sidebar down
// to just what a dentist needs mid-consultation. Deliberately its own flag rather than reusing
// can_access_dental_clinical (default true for every employee): a secretary/assistant in the
// same dental business must keep their full menu unless the admin explicitly narrows THEIRS too.
const isGabineteMode = computed(() => authStore.role === 'empleado' && !!authStore.profile?.gabinete_mode)
const GABINETE_ALLOWED_PATHS = ['/dashboard/gabinete', '/dashboard/agenda', '/dashboard/clientes']

const isLinkVisible = (link: SidebarLink): boolean => {
  if (isGabineteMode.value && !GABINETE_ALLOWED_PATHS.includes(link.to)) return false
  if (link.strictAdminOnly && !isStrictAdmin.value) return false
  if (link.adminOnly && !isAdmin.value) {
    // Empleados de tienda con permisos
    if (link.to === '/admin/pos' && authStore.profile?.can_access_pos) return true
    if (link.to === '/admin/inventario' && authStore.profile?.can_access_inventory) return true
    if (link.to === '/admin/proveedores' && authStore.profile?.can_access_suppliers) return true
    if (link.to === '/admin/requerimientos' && authStore.profile?.can_access_requirements) return true
    return false
  }
  if (link.employeeOnly && isAdmin.value) {
    // Encargados earn commissions/salary like empleados, so they keep access to their own report.
    const isEncargadoReport = isEncargado(authStore.role ?? undefined) &&
      (link.to === '/dashboard/comisiones' || link.to === '/dashboard/recibo')
    if (!isEncargadoReport) return false
  }
  if (link.employeeOnly && authStore.role === 'empleado' && businessStore.features.employees_recibo_only && link.to !== '/dashboard/recibo') {
    return false
  }
  return evaluateGate(link.gate, {
    profile: authStore.profile,
    hasFeature: (key) => businessStore.hasFeature(key),
    hasCapability: (capability) => businessStore.hasCapability(capability),
  })
}

const visibleSections = computed(() =>
  sidebarSections
    .map(section => ({
      ...section,
      links: section.links
        .filter(isLinkVisible)
        .map(link => link.children ? { ...link, children: link.children.filter(isLinkVisible) } : link)
        .filter(link => !link.children || link.children.length > 0),
    }))
    .filter(section => {
      return !section.adminOnly || isAdmin.value || section.links.some(l =>
        ['/admin/pos', '/admin/inventario', '/admin/proveedores', '/admin/requerimientos'].includes(l.to)
      )
    })
    .filter(section => section.links.length > 0)
)

// Todas las rutas navegables del menú visible (de un grupo cuentan sus hijos, no su cabecera).
const navPaths = computed(() =>
  visibleSections.value.flatMap(s => s.links.flatMap(l => (l.children?.length ? l.children.map(c => c.to) : [l.to]))),
)

// Resaltado optimista: al tocar una opción se marca de inmediato, sin esperar a que cargue la
// pantalla (rutas lazy + guards pueden tardar y el menú se sentía "pegado"). Se limpia cuando
// termina cualquier navegación -- si un guard redirige a otro lado, manda la ruta real.
const pendingTo = ref<string | null>(null)
let pendingTimer: ReturnType<typeof setTimeout> | null = null
const clearPending = () => {
  pendingTo.value = null
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
}
const stopAfterEach = router.afterEach(clearPending)
onBeforeUnmount(() => { stopAfterEach(); clearPending() })

const onNavClick = (e: MouseEvent, to: string) => {
  // Ctrl/Cmd/Shift-clic abre en otra pestaña o ventana: acá no hay navegación que esperar.
  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    pendingTo.value = to
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(clearPending, 4000)
  }
  // En móvil el menú es un cajón: al elegir una opción tiene que cerrarse (el evento estaba
  // declarado pero nunca se emitía, así que quedaba abierto tapando la pantalla).
  emit('close')
}

// Precarga el código de la pantalla al pasar el mouse / enfocar / tocar, para que al hacer clic
// ya esté descargado. Solo resuelve los componentes lazy de la ruta; no corre guards ni navega.
const prefetched = new Set<string>()
const prefetch = (to: string) => {
  if (prefetched.has(to) || to === route.path) return
  prefetched.add(to)
  try {
    loadRouteLocation(router.resolve(to)).catch(() => prefetched.delete(to))
  } catch {
    prefetched.delete(to)
  }
}

// Activa también en sus pantallas internas (/admin/clientes/123...), no solo en la ruta exacta:
// antes, entrar a un detalle dejaba el menú sin ninguna opción marcada. Ver sidebarActive.ts.
const activeTo = computed(() => pendingTo.value ?? matchNavPath(route.path, navPaths.value))
const isActive = (path: string): boolean => activeTo.value === path
const isGroupActive = (link: SidebarLink): boolean =>
  !!link.children?.some(child => isActive(child.to))

// Auto-open a group when the current route is one of its children; a manual toggle overrides
// that default (in either direction) until toggled again.
const expandedOverrides = ref<Record<string, boolean>>({})
const isExpanded = (to: string): boolean => {
  const link = sidebarSections.flatMap(s => s.links).find(l => l.to === to)
  const autoOpen = !!link?.children?.some(child => isActive(child.to))
  return expandedOverrides.value[to] ?? autoOpen
}
const toggleExpanded = (to: string) => {
  expandedOverrides.value = { ...expandedOverrides.value, [to]: !isExpanded(to) }
}

// Sliding active pill: a single indicator that glides to the active row when the
// user navigates between modules (or a group auto-opens/closes). Positioned with
// top/height measured from the DOM so no layout math lives in the templates.
const navEl = ref<HTMLElement | null>(null)
const pill = ref({ top: 0, height: 0, visible: false, animate: false })

const activeRowKey = computed<string | null>(() => {
  for (const section of visibleSections.value) {
    for (const link of section.links) {
      if (link.children?.length) {
        if (isGroupActive(link)) return `g:${link.to}`
      } else if (isActive(link.to)) {
        return `l:${link.to}`
      }
    }
  }
  return null
})

// La fila se busca por atributo en el DOM, no con un `ref`: en las opciones normales el ref de un
// <router-link> es la instancia del componente (no un HTMLElement), así que el indicador nunca
// encontraba la fila activa y quedaba invisible. `data-nav-key` cae sobre el <a> raíz.
const measurePill = (animate: boolean) => {
  const key = activeRowKey.value
  const el = key && navEl.value
    ? navEl.value.querySelector<HTMLElement>(`[data-nav-key="${key.replace(/"/g, '\\"')}"]`)
    : null
  if (el && navEl.value) {
    pill.value = { top: el.offsetTop, height: el.offsetHeight, visible: true, animate }
  } else {
    pill.value = { top: pill.value.top, height: pill.value.height, visible: false, animate }
  }
}

// El indicador solo se desliza cuando cambia la opción activa. Si lo que cambió fue otra cosa
// (abrir/cerrar un grupo, el cajón móvil, la lista visible), las filas se reacomodan al instante
// y un deslizamiento de 400 ms dejaba el indicador desfasado detrás de ellas. Tampoco se anima
// la primera medición (no tiene de dónde "venir").
watch(
  [activeRowKey, visibleSections, expandedOverrides, () => props.isOpen],
  async ([key], old) => {
    const animate = !!old && key !== old[0]
    await nextTick()
    measurePill(animate)
  },
  { immediate: true },
)

// La medición "immediate" de arriba corre en el setup, antes de que existan las filas, así que
// la posición inicial se mide al montar. También al cargar las fuentes y si cambia el ancho del
// menú (el texto puede reacomodarse y mover las filas).
let navResizeObserver: ResizeObserver | null = null
onMounted(() => {
  measurePill(false)
  document.fonts?.ready.then(() => measurePill(false))
  if (navEl.value && typeof ResizeObserver !== 'undefined') {
    navResizeObserver = new ResizeObserver(() => measurePill(false))
    navResizeObserver.observe(navEl.value)
  }
})
onBeforeUnmount(() => navResizeObserver?.disconnect())

const { t, locale } = useI18n()

// The menu's own Spanish label is the key (see i18n/messages/nav.ts). In Spanish nothing changes, so the
// business's custom names (terminology) keep working exactly as before.
const translated = (label: string): string | null => {
  if (locale.value === 'es') return null
  const key = `nav.${label}`
  return key in messageCatalog.en ? t(key as MessageKey) : null
}

const resolveLabel = (link: SidebarLink): string => {
  const inOtherLanguage = translated(link.label)
  if (inOtherLanguage) return inOtherLanguage
  if (link.labelKey) {
    const term = (businessStore.terminology as Record<string, string>)[link.labelKey]
    return term || link.label
  }
  return link.label
}

const badgeLabel = (badge: string): string => translated(badge) ?? badge

// Another language changes the width of every label, so the highlight pill has to be measured again.
watch(locale, () => nextTick(() => measurePill(false)))


</script>
