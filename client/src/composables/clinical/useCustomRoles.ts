import { ref } from 'vue'
import { normalizeRole } from '../../components/clinical/cases'

const KEY = 'luma.clinical.case-roles'
const MAX_SAVED = 30

// Conveniencia por navegador (como la ciudad de los informes): si el almacenamiento no está
// disponible el selector sigue funcionando, solo que no recuerda los roles creados.
function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string').map(normalizeRole).filter(Boolean) : []
  } catch {
    return []
  }
}

// Compartido a nivel de módulo: al crear un rol en un selector, todos los demás lo ofrecen al instante.
const customRoles = ref<string[]>(load())

export function useCustomRoles() {
  /** Guarda un rol nuevo (sin duplicar, ignorando mayúsculas) y devuelve el rol normalizado, o '' si no era válido. */
  function addCustomRole(raw: string): string {
    const role = normalizeRole(raw)
    if (!role) return ''
    if (!customRoles.value.some(r => r.toLowerCase() === role.toLowerCase())) {
      customRoles.value = [...customRoles.value, role].slice(-MAX_SAVED)
      try { localStorage.setItem(KEY, JSON.stringify(customRoles.value)) } catch { /* sin almacenamiento: no se recuerda */ }
    }
    return role
  }

  return { customRoles, addCustomRole }
}
