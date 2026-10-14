<template>
  <header class="mb-6 lg:mb-8">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
      <SettingsIcon class="h-3.5 w-3.5" />
      <span>Configuración</span>
    </div>
  </header>

  <div class="max-w-4xl pb-8">
    <GeneralSettings v-if="activeSection === 'general'" />
    <WhatsAppSection v-else-if="activeSection === 'whatsapp' && canManageBusinessConfig" />
    <PermissionsSettings v-else-if="activeSection === 'permisos' && isAdmin" />
    <NotificationsSettings v-else-if="activeSection === 'notificaciones' && canManageBusinessConfig" />
    <BranchesSettings v-else-if="activeSection === 'sucursales' && canManageBusinessConfig" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SettingsIcon } from '@solar-icons/vue/linear'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import GeneralSettings from '../components/settings/GeneralSettings.vue'
import PermissionsSettings from '../components/settings/PermissionsSettings.vue'
import NotificationsSettings from '../components/settings/NotificationsSettings.vue'
import BranchesSettings from '../components/settings/BranchesSettings.vue'
import WhatsAppSection from '../components/settings/WhatsAppSection.vue'

/**
 * Each Configuración page is its own route (/admin/configuracion/:section, linked from the
 * sidebar); this view only picks which one to show. The sections themselves live in
 * components/settings/, and every title/description/message in featureCopy.ts.
 */
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')
const canManageBusinessConfig = isAdmin

const activeSection = computed(() => (route.params.section as string) || 'general')

// Guards against a stale or typed-in URL for a section this business/role can't see (e.g.
// /sucursales without multi-sucursal): send them to the first section they do have.
const visibleSectionIds = computed(() =>
  [
    { id: 'general', visible: true },
    { id: 'whatsapp', visible: canManageBusinessConfig.value && businessStore.features.whatsapp_available && businessStore.features.agenda },
    { id: 'permisos', visible: isAdmin.value },
    { id: 'notificaciones', visible: canManageBusinessConfig.value && businessStore.features.agenda },
    { id: 'sucursales', visible: canManageBusinessConfig.value && businessStore.isMultiBranch },
  ].filter(s => s.visible).map(s => s.id),
)

watch([visibleSectionIds, activeSection], ([ids, current]) => {
  if (!ids.includes(current)) {
    router.replace(`/admin/configuracion/${ids[0] || 'general'}`)
  }
}, { immediate: true })
</script>
