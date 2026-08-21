import { ref, watch } from 'vue'

export type NotifType = 'reminder' | 'status_change' | 'new_appointment' | 'unpaid_alert' | 'low_stock' | 'pet_birthday'

const STORAGE_KEY = 'luma_notif_prefs'

const DEFAULTS: Record<NotifType, boolean> = {
  reminder: true,
  status_change: true,
  new_appointment: true,
  unpaid_alert: true,
  low_stock: true,
  pet_birthday: true,
}

const TYPE_LABELS: Record<NotifType, string> = {
  reminder: 'Recordatorios (24h)',
  status_change: 'Cambios de estado',
  new_appointment: 'Nuevas citas',
  unpaid_alert: 'Citas sin cobrar',
  low_stock: 'Stock bajo',
  pet_birthday: 'Cumpleaños mascotas',
}

const SOUND_MAP: Partial<Record<NotifType, string>> = {
  reminder: '/sounds/recordatorio.mp3',
  status_change: '/sounds/nuevacita.mp3',
  new_appointment: '/sounds/nuevacita.mp3',
  unpaid_alert: '/sounds/error.mp3',
  low_stock: '/sounds/error.mp3',
  pet_birthday: '/sounds/cumple.mp3',
}

interface StoredPrefs {
  types: Record<NotifType, boolean>
  soundEnabled: boolean
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        types: { ...DEFAULTS, ...(parsed.types || {}) },
        soundEnabled: parsed.soundEnabled ?? true,
      }
    }
  } catch { /* corrupted */ }
  return { types: { ...DEFAULTS }, soundEnabled: true }
}

function savePrefs(prefs: StoredPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function useNotificationPrefs() {
  const stored = ref<StoredPrefs>(loadPrefs())

  watch(stored, (val) => savePrefs(val), { deep: true })

  const soundEnabled = ref(stored.value.soundEnabled)
  watch(soundEnabled, (val) => {
    stored.value.soundEnabled = val
  })

  function toggleType(type: NotifType) {
    stored.value.types = { ...stored.value.types, [type]: !stored.value.types[type] }
  }

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }

  function isTypeEnabled(type: string): boolean {
    return stored.value.types[type as NotifType] ?? true
  }

  function getSoundForType(type: string): string | null {
    if (!soundEnabled.value) return null
    return SOUND_MAP[type as NotifType] ?? null
  }

  return {
    prefs: stored,
    soundEnabled,
    toggleType,
    toggleSound,
    isTypeEnabled,
    getSoundForType,
    TYPE_LABELS,
  }
}
