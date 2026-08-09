<template>
  <div class="login-page relative flex min-h-screen w-full items-center overflow-hidden bg-bg-secondary">
    <!-- Full-bleed background image, faded out toward the form side -->
    <div
      class="login-image pointer-events-none absolute inset-0"
      :style="{ '--login-image': `url('${loginBackground}')` }"
      aria-hidden="true"
    ></div>

    <!-- Form — nudged off the left edge from lg up, so the image/blend reads
         as roughly half the screen instead of a thin right-hand strip. -->
    <div class="login-form relative z-10 flex w-full flex-col px-5 py-8 sm:px-10 sm:py-12 md:px-14 lg:w-[420px] lg:px-0 lg:py-14 lg:ml-[6vw] xl:w-[480px] xl:ml-[8vw] 2xl:w-[560px] 2xl:ml-[10vw]">
      <img :src="lumaLogo" alt="Luma" class="h-10 w-auto self-start object-contain sm:h-12 lg:h-14" />

      <div class="flex flex-1 flex-col justify-center py-8 sm:py-10 lg:py-8">
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
                class="w-full rounded-2xl border border-border bg-surface/80 py-3.5 pl-11 pr-4 text-sm text-text outline-none backdrop-blur-sm transition-theme placeholder:text-text-muted/70 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
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
                class="w-full rounded-2xl border border-border bg-surface/80 py-3.5 pl-11 pr-12 text-sm text-text outline-none backdrop-blur-sm transition-theme placeholder:text-text-muted/70 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
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
 * Full-bleed background, masked (not overlaid) so it dissolves straight into
 * bg-bg-secondary behind the form — no color to keep in sync across themes.
 * Stops are tuned so the image reaches full presence by the horizontal
 * midpoint of the screen (a ~50/50 balance) instead of living only in a
 * narrow strip on the far right.
 */
.login-image {
  background-image: var(--login-image);
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 12%,
    rgba(0, 0, 0, 0.4) 28%,
    rgba(0, 0, 0, 0.85) 42%,
    #000 50%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 12%,
    rgba(0, 0, 0, 0.4) 28%,
    rgba(0, 0, 0, 0.85) 42%,
    #000 50%
  );
}

/* Below lg the two-column balance has no room to work with, so the form
 * takes the full width and the image drops to a faint full-width backdrop
 * instead of fighting the inputs for contrast. */
@media (max-width: 1023px) {
  .login-image {
    -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.65) 55%, #000 100%);
    mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.65) 55%, #000 100%);
    opacity: 0.75;
  }
}

@media (max-width: 639px) {
  .login-image {
    opacity: 0.6;
  }
}

/* The sage pattern is far brighter than the dark page; tone it down to match.
 * Plain descendant selector, not :global(.dark) — the latter swallows the rest
 * of the selector and leaks the filter onto the whole page. */
.dark .login-image {
  filter: brightness(0.55) saturate(0.85);
}

/* Landscape phones / short viewports: min-h-screen + centered content can
 * push the footer line off-screen before the user scrolls. Tighten vertical
 * rhythm instead of relying on scroll alone. */
@media (max-height: 640px) {
  .login-form {
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }
  .login-form > div:nth-child(2) {
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }
}
</style>
