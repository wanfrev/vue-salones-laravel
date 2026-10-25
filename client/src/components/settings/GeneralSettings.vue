<template>
  <SettingsSection :title="t('settings.general.title')" :description="t('settings.general.description')">
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- Apariencia -->
      <div>
        <h3 class="mb-1 text-sm font-semibold text-text">{{ t('settings.theme.title') }}</h3>
        <p class="mb-3.5 text-xs text-text-muted">{{ t('settings.theme.help') }}</p>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="opt in themeOptions" :key="opt.value" type="button"
            class="card-hairline flex min-w-[90px] flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl p-3.5 transition-all duration-200"
            :class="themeStore.mode === opt.value ? 'border-primary' : 'hover:border-border-strong'"
            :style="themeStore.mode === opt.value ? { backgroundColor: 'rgba(134, 156, 132, 0.1)' } : {}"
            @click="themeStore.setMode(opt.value)"
          >
            <component :is="opt.icon" class="h-6 w-6 transition-colors" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text-muted'" />
            <span class="text-xs font-semibold" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text'">{{ t(opt.labelKey) }}</span>
          </button>
        </div>

        <div v-if="canChooseLanguage" class="mt-6 border-t border-border pt-5" data-testid="language-picker">
          <h3 class="mb-1 text-sm font-semibold text-text">{{ t('settings.language.title') }}</h3>
          <p class="mb-3.5 text-xs text-text-muted">{{ t('settings.language.help') }}</p>
          <div class="flex flex-wrap gap-3" role="radiogroup" :aria-label="t('settings.language.title')">
            <button
              v-for="opt in locales" :key="opt.value" type="button" role="radio" :aria-checked="locale === opt.value"
              class="card-hairline flex min-w-[90px] flex-1 cursor-pointer items-center justify-center rounded-xl p-3.5 transition-all duration-200"
              :class="locale === opt.value ? 'border-primary' : 'hover:border-border-strong'"
              :style="locale === opt.value ? { backgroundColor: 'rgba(134, 156, 132, 0.1)' } : {}"
              @click="setLocale(opt.value)"
            >
              <span class="text-xs font-semibold" :class="locale === opt.value ? 'text-primary' : 'text-text'">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <div class="mt-6 border-t border-border pt-5">
          <h3 class="text-sm font-semibold text-text">{{ t('settings.access.title') }}</h3>
          <p class="mb-2.5 text-xs text-text-muted">{{ t('settings.access.help') }}</p>

          <button
            type="button" role="switch" :aria-checked="themeStore.highVisibility"
            class="card-hairline flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl p-3.5 text-left transition-all duration-200"
            :class="themeStore.highVisibility ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:border-border-strong'"
            @click="themeStore.toggleHighVisibility()"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                :class="themeStore.highVisibility ? 'bg-primary text-text-inverse' : 'bg-bg-secondary text-text-muted'"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-text">{{ t('settings.access.highVisibility') }}</span>
                  <span
                    class="rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors"
                    :class="themeStore.highVisibility ? 'border-primary bg-primary text-text-inverse' : 'border-border bg-bg-secondary text-text-muted'"
                  >{{ themeStore.highVisibility ? t('settings.access.on') : t('settings.access.off') }}</span>
                </div>
                <p class="mt-0.5 text-xs text-text-muted">{{ t('settings.access.highVisibilityHelp') }}</p>
              </div>
            </div>
            <div class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200" :class="themeStore.highVisibility ? 'bg-primary' : 'bg-border-strong'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out" :class="themeStore.highVisibility ? 'translate-x-6' : 'translate-x-1'" />
            </div>
          </button>
        </div>
      </div>

      <!-- Seguridad -->
      <div>
        <h3 class="mb-1 text-sm font-semibold text-text">{{ t('settings.password.title') }}</h3>
        <p class="mb-3.5 text-xs text-text-muted">{{ t('settings.password.help') }}</p>
        <form class="space-y-3" @submit.prevent="handleChangePassword">
          <div class="space-y-2.5">
            <div v-for="field in passwordFields" :key="field.model" class="relative">
              <input
                v-model="passwordForm[field.model]"
                :type="field.visible.value ? 'text' : 'password'"
                required :minlength="field.model === 'newPassword' ? 6 : undefined"
                :placeholder="t(field.placeholderKey)" :aria-label="t(field.placeholderKey)"
                :autocomplete="field.model === 'newPassword' ? 'new-password' : 'current-password'"
                :disabled="passwordLoading"
                class="w-full rounded-lg border border-border bg-surface-elevated py-2 pl-9 pr-9 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" :d="field.icon" />
              </svg>
              <button
                type="button" tabindex="-1" :disabled="passwordLoading" :aria-label="field.visible.value ? t('settings.password.hide') : t('settings.password.show')"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:text-text"
                @click="field.visible.value = !field.visible.value"
              >
                <EyeIcon v-if="!field.visible.value" class="h-4 w-4" />
                <EyeClosedIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <p v-if="passwordError" class="text-xs text-danger">{{ passwordError }}</p>
            <p v-else-if="passwordSuccess" class="text-xs font-medium text-success">{{ passwordSuccess }}</p>
            <span v-else></span>
            <button
              type="submit"
              :disabled="passwordLoading || !passwordForm.currentPassword || passwordForm.newPassword.length < 6"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/15 transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg v-if="passwordLoading" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ t('settings.password.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
import { h, reactive, ref } from 'vue'
import { EyeClosedIcon, EyeIcon } from '@solar-icons/vue/linear'
import { apiRequest } from '../../lib/api'
import { useThemeStore, type ThemeMode } from '../../store/theme'
import SettingsSection from './SettingsSection.vue'
import { useI18n, type MessageKey } from '../../i18n'

const themeStore = useThemeStore()
const { t, locale, locales, canChooseLanguage, setLocale } = useI18n()

// ── theme ──────────────────────────────────────────────────────────────────
const themeIcon = (path: string) => () =>
  h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: path }),
  ])

const themeOptions: { value: ThemeMode; labelKey: MessageKey; icon: ReturnType<typeof themeIcon> }[] = [
  { value: 'light', labelKey: 'settings.theme.light', icon: themeIcon('M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z') },
  { value: 'dark', labelKey: 'settings.theme.dark', icon: themeIcon('M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z') },
  { value: 'system', labelKey: 'settings.theme.auto', icon: themeIcon('M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z') },
]

// ── password ───────────────────────────────────────────────────────────────
const passwordForm = reactive({ currentPassword: '', newPassword: '' })
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

const passwordFields = [
  { model: 'currentPassword' as const, placeholderKey: 'settings.password.current' as MessageKey, visible: showCurrentPassword, icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
  { model: 'newPassword' as const, placeholderKey: 'settings.password.new' as MessageKey, visible: showNewPassword, icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z' },
]

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (passwordForm.newPassword.length < 6) {
    passwordError.value = t('settings.password.tooShort')
    return
  }

  passwordLoading.value = true
  try {
    await apiRequest('POST', '/auth/change-password', {
      current_password: passwordForm.currentPassword,
      new_password: passwordForm.newPassword,
    })
    passwordSuccess.value = t('settings.password.updated')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    showCurrentPassword.value = false
    showNewPassword.value = false
    setTimeout(() => { passwordSuccess.value = '' }, 4000)
  } catch (err: any) {
    passwordError.value = err?.message ?? t('settings.password.failed')
  } finally {
    passwordLoading.value = false
  }
}
</script>
