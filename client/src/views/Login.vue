<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 bg-bg-secondary">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url('${loginBackground}')` }"
      aria-hidden="true"
    ></div>
    <div class="absolute inset-0 bg-black/30" aria-hidden="true"></div>
    <div
      class="absolute inset-0 opacity-30"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(15, 23, 42, 0.1), transparent 35%);"
    ></div>

    <div class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-10 shadow-xl transition-theme">
      <div class="mb-6 text-center">
        <img :src="lumaLogo" alt="Luma" class="mx-auto mb-4 h-14 w-auto object-contain sm:h-16" />
        <p class="mt-1 text-sm text-primary">Inicia sesión para acceder al panel</p>
      </div>

      <form class="space-y-4" @submit.prevent="submitLogin">
        <div>
          <label for="email" class="mb-1 block text-sm font-medium text-text">Correo electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="tu@correo.com"
            class="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text outline-none transition-theme focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-text">Contraseña</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-lg border border-border bg-surface px-3 py-3 pr-11 text-sm text-text outline-none transition-theme focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-theme hover:opacity-80 text-primary"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </div>

        <p v-if="validationError" class="text-sm text-danger">{{ validationError }}</p>
        <p v-if="errorMessage" class="text-sm text-danger">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-text-inverse shadow-md transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { resolveHomeByRole } from '../constants/roles'
import { useThemeStore } from '../store/theme'
import lumaLogoLight from '../assets/Luma.svg'
import lumaLogoDark from '../assets/Luma blanco.svg'
import loginBackground from '../assets/Fondo.jpg'

const router = useRouter()
const { loading, errorMessage, login, authStore } = useAuth()
const themeStore = useThemeStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const validationError = ref('')
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const submitLogin = async () => {
  if (!email.value.trim() || !password.value.trim()) {
    validationError.value = 'Correo y contraseña son requeridos.'
    return
  }

  validationError.value = ''

  const ok = await login(email.value, password.value)
  if (ok) {
    router.push(resolveHomeByRole(authStore.role ?? undefined, authStore.profile?.disable_agenda))
  }
}
</script>
