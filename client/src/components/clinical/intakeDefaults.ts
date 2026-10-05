import type { ClinicalIntake, ClinicalIntakeData } from '../../types/database'

export function emptyIntakeData(): ClinicalIntakeData {
  return {
    consulta: { motivo: '', historia_problema: '', expectativas: '', derivado_por: '' },
    antecedentes: {
      personales: '', familiares: '', psiquiatricos: '', tratamientos_previos: '', medicacion_actual: '', condiciones_medicas: '',
    },
    areas: { sueno: '', apetito: '', consumo_sustancias: '', vida_social: '', laboral_academico: '', pareja_familia: '' },
    riesgo: {
      ideacion_suicida: '', intentos_previos: false, autolesiones: false, riesgo_hacia_otros: false,
      factores_proteccion: '', observaciones: '',
    },
    examen_mental: { apariencia_conducta: '', animo_afecto: '', pensamiento_lenguaje: '', orientacion_cognicion: '' },
    impresion: { hipotesis: '', diagnostico: '', codigo_cie10: '' },
  }
}

/**
 * Mezcla lo guardado sobre los valores por defecto, sección por sección: una historia guardada con
 * menos campos (versión anterior del formulario) o `null` (paciente sin historia) siempre produce
 * un objeto completo y seguro de enlazar a los inputs.
 */
export function mergeIntakeData(saved: Partial<ClinicalIntakeData> | null | undefined): ClinicalIntakeData {
  const base = emptyIntakeData()
  if (!saved) return base
  const out = base as unknown as Record<string, Record<string, unknown>>
  for (const section of Object.keys(out)) {
    const incoming = (saved as Record<string, unknown>)[section]
    if (incoming && typeof incoming === 'object') {
      out[section] = { ...out[section], ...(incoming as Record<string, unknown>) }
    }
  }
  return base
}

export const intakeFromRecord = (record: ClinicalIntake | null | undefined): ClinicalIntakeData => mergeIntakeData(record?.data)

export const IDEATION_OPTIONS = [
  { value: '', label: 'Sin evaluar' },
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'pasiva', label: 'Pasiva (deseo de no estar vivo, sin plan)' },
  { value: 'activa', label: 'Activa (con idea, plan o intención)' },
]
