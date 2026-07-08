<template>
  <div class="min-h-screen bg-bg">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4">
          <img :src="lumaLogo" alt="Luma" class="h-7 w-auto object-contain" />
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-text">SaaS control</h1>
            <p class="text-sm text-text-muted">Alta y control de negocios en un solo lugar.</p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="logout"
        >
          Cerrar sesion
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <section class="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text">Registrar negocio</h2>
              <p class="text-sm text-text-muted">Crea el negocio y envia la invitacion al dueno.</p>
            </div>
            <div class="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              Total: {{ businessesCount }}
            </div>
          </div>

          <form class="grid gap-3" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="businessName">Nombre del negocio</label>
              <input
                id="businessName"
                v-model="form.businessName"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Salon Luma"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="ownerEmail">Email del dueno</label>
              <input
                id="ownerEmail"
                v-model="form.ownerEmail"
                type="email"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="dueno@salon.com"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="ownerPassword">Contraseña del dueno</label>
              <input
                id="ownerPassword"
                v-model="form.ownerPassword"
                type="password"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="nicheType">Nicho</label>
              <select
                v-if="!showingCustomNiche"
                id="nicheType"
                :value="form.nicheType"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                @change="onNicheSelect"
              >
                <option value="" disabled selected>Selecciona un nicho</option>
                <option value="__new__">+ Agregar nuevo</option>
                <option value="salon">Salón de belleza</option>
                <option value="barberia">Barbería</option>
                <option value="spa">Spa (humano)</option>
                <option value="mixto">Mixto (Barbería + Salón + Spa)</option>
                <option value="dog_spa">Spa canino / Veterinaria</option>
                <option value="nail_bar">Barra de uñas</option>
                <option value="centro_estetico">Centro estético</option>
              </select>
              <div v-else class="flex gap-2">
                <input
                  id="nicheType"
                  v-model="form.nicheType"
                  type="text"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="Escribe el nicho..."
                />
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-theme hover:bg-bg-secondary"
                  @click="cancelCustomNiche"
                >
                  Volver
                </button>
              </div>
            </div>

            <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

            <button
              type="submit"
              :disabled="isCreating"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isCreating ? 'Creando...' : 'Crear negocio e invitar' }}
            </button>
          </form>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text">Negocios registrados</h2>
              <p class="text-sm text-text-muted">Selecciona un negocio para administrarlo.</p>
            </div>
            <input
              v-model="search"
              type="search"
              placeholder="Buscar"
              class="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div class="space-y-3">
            <router-link
              v-for="biz in filteredBusinesses"
              :key="biz.id"
              :to="`/superadmin/business/${biz.id}`"
              class="block rounded-xl border border-border bg-bg-secondary p-4 transition-theme hover:border-primary/50 hover:shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-semibold text-text">{{ biz.name }}</h3>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      :class="biz.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'"
                    >
                      {{ biz.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <p class="text-xs text-text-muted">Slug: {{ biz.slug }} · Nicho: {{ biz.niche_type }}</p>
                  <p class="text-xs text-text-muted">Creado: {{ formatDate(biz.created_at) }}</p>
                </div>
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </router-link>

            <div v-if="!filteredBusinesses.length" class="rounded-xl border border-dashed border-border bg-bg-secondary p-6 text-center text-sm text-text-muted">
              No hay negocios para mostrar.
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { formatDate } from '../lib/formatters'
import { useNotification } from '../composables/common/useNotification'
import { useAuth } from '../composables/common/useAuth'
import { useThemeStore } from '../store/theme'
import { createBusinessWithOwner, listBusinesses, superadminKeys } from '../services/superadminService'
import { translateError } from '../lib/errors'
import lumaLogoLight from '../assets/Luma.svg'
import lumaLogoDark from '../assets/Luma blanco.svg'
import type { Business } from '../types/database'

const { logout, loading } = useAuth()
const { success, error } = useNotification()
const queryClient = useQueryClient()
const themeStore = useThemeStore()
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const form = ref({
  businessName: '',
  ownerEmail: '',
  ownerPassword: '',
  nicheType: '',
})

const showingCustomNiche = ref(false)

const onNicheSelect = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (value === '__new__') {
    showingCustomNiche.value = true
    form.value.nicheType = ''
    return
  }
  form.value.nicheType = value
}

const cancelCustomNiche = () => {
  showingCustomNiche.value = false
  form.value.nicheType = ''
}

const search = ref('')
const formError = ref('')

const { data: businessesData } = useQuery({
  queryKey: superadminKeys.businesses(),
  queryFn: listBusinesses,
})

const businesses = computed<Business[]>(() => businessesData.value ?? [])
const businessesCount = computed(() => businesses.value.length)

const { mutateAsync: createBusiness, isPending: isCreating } = useMutation({
  mutationFn: createBusinessWithOwner,
  onSuccess: async () => {
    success('Negocio creado. El admin ya puede iniciar sesión.')
    form.value.businessName = ''
    form.value.ownerEmail = ''
    form.value.ownerPassword = ''
    form.value.nicheType = ''
    formError.value = ''
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  },
  onError: (err: unknown) => {
    error(translateError(err, 'No fue posible crear el negocio.'))
  },
})

const filteredBusinesses = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return businesses.value
  return businesses.value.filter(biz =>
    biz.name.toLowerCase().includes(term)
      || biz.slug.toLowerCase().includes(term)
      || biz.niche_type.toLowerCase().includes(term)
  )
})

const handleSubmit = async () => {
  formError.value = ''

  if (!form.value.businessName.trim() || !form.value.ownerEmail.trim() || !form.value.ownerPassword.trim()) {
    formError.value = 'Nombre, email y contraseña son requeridos.'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.value.ownerEmail.trim())) {
    formError.value = 'El formato del email no es válido.'
    return
  }

  if (form.value.ownerPassword.trim().length < 6) {
    formError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  await createBusiness({
    businessName: form.value.businessName,
    ownerEmail: form.value.ownerEmail,
    ownerPassword: form.value.ownerPassword,
    nicheType: form.value.nicheType.trim() || undefined,
  })
}


</script>
