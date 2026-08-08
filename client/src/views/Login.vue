<template>
  <div class="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
    <!-- Ambient backdrop -->
    <div class="pointer-events-none absolute inset-0 bg-bg-secondary" aria-hidden="true"></div>
    <div
      class="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 15% 20%, var(--color-primary-light), transparent 50%), radial-gradient(circle at 85% 80%, var(--color-primary-light), transparent 45%);"
    ></div>

    <!-- Card -->
    <div
      class="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-[32px] border border-border bg-surface shadow-2xl transition-theme lg:min-h-[620px]"
      :style="{ '--login-image': `url('${loginBackground}')` }"
    >
      <!-- Decorative panel — sits on the right and dissolves toward the form -->
      <div class="login-image pointer-events-none absolute inset-y-0 right-0 hidden w-[70%] lg:block" aria-hidden="true"></div>

      <!-- Form -->
      <div class="relative z-10 flex w-full flex-col px-8 py-10 sm:px-12 sm:py-14 lg:w-[54%] lg:px-16">
        <img :src="lumaLogo" alt="Luma" class="h-12 w-auto self-start object-contain sm:h-14" />

        <div class="flex flex-1 flex-col justify-center py-10 lg:py-8">
          <h1 class="font-luxe text-[1.75rem] leading-tight text-text sm:text-[2rem]">Bienvenido</h1>
          <p class="mt-1.5 text-sm text-text-muted">Inicia sesión para gestionar tu negocio.</p>

          <form class="mt-8 space-y-5" @submit.prevent="submitLogin">
            <div>
              <label for="email" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Correo electrónico</label>
              <div class="relative">
                <LetterIcon class="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="tu@correo.com"
                  class="w-full rounded-2xl border border-border bg-bg-secondary/50 py-3.5 pl-11 pr-4 text-sm text-text outline-none transition-theme placeholder:text-text-muted/70 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label for="password" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Contraseña</label>
              <div class="relative">
                <LockKeyholeMinimalisticIcon class="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted" />
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full rounded-2xl border border-border bg-bg-secondary/50 py-3.5 pl-11 pr-12 text-sm text-text outline-none transition-theme placeholder:text-text-muted/70 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-theme hover:text-text"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <EyeClosedIcon v-if="showPassword" class="h-4.5 w-4.5" />
                  <EyeIcon v-else class="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div v-if="validationError || errorMessage" class="flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger-light px-3.5 py-2.5">
              <DangerTriangleIcon class="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p class="text-xs font-medium text-danger">{{ validationError || errorMessage }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-full bg-text px-4 py-3.5 text-sm font-semibold text-text-inverse shadow-lg shadow-text/10 transition-theme hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
            </button>
          </form>
        </div>

        <div class="border-t border-border-subtle pt-5">
          <p class="text-xs text-text-muted">¿Problemas para acceder? Contacta a tu administrador.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { resolveHomeByRole } from '../constants/roles'
import { useThemeStore } from '../store/theme'
import {
  LetterIcon,
  LockKeyholeMinimalisticIcon,
  EyeIcon,
  EyeClosedIcon,
  DangerTriangleIcon,
} from '@solar-icons/vue/linear'
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

<style>
@font-face {
  font-family: 'LaLuxes';
  src: url('../assets/fonts/LaLuxes.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
</style>

<style scoped>
.font-luxe {
  font-family: 'LaLuxes', var(--font-sans);
}

/*
 * The panel is masked instead of overlaid so the pattern dissolves into whatever
 * the card background happens to be — no color to keep in sync across themes.
 * It overlaps the form column, and the transparent end of the mask lands over
 * the text so the fade reads as one continuous surface.
 */
.login-image {
  background-image: var(--login-image);
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 16%,
    rgba(0, 0, 0, 0.45) 34%,
    rgba(0, 0, 0, 0.85) 52%,
    #000 68%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 16%,
    rgba(0, 0, 0, 0.45) 34%,
    rgba(0, 0, 0, 0.85) 52%,
    #000 68%
  );
}

/* The sage pattern is far brighter than the dark card; tone it down to match.
 * Plain descendant selector, not :global(.dark) — the latter swallows the rest
 * of the selector and leaks the filter onto the whole page. */
.dark .login-image {
  filter: brightness(0.42) saturate(0.7);
}
</style>
