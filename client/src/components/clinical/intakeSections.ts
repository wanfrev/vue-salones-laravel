import type { ClinicalIntakeData } from '../../types/database'

/** Secciones de texto libre de la historia clínica psicológica — la vista las recorre con v-for. */
export type IntakeTextSectionKey = 'consulta' | 'antecedentes' | 'areas' | 'examen_mental'

export interface IntakeTextField {
  key: string
  label: string
  rows: number
  placeholder?: string
}

export interface IntakeTextSection {
  key: IntakeTextSectionKey
  title: string
  description: string
  fields: IntakeTextField[]
}

export const INTAKE_TEXT_SECTIONS: IntakeTextSection[] = [
  {
    key: 'consulta',
    title: 'Motivo de consulta',
    description: 'Por qué consulta, cómo llegó y qué espera del proceso.',
    fields: [
      { key: 'motivo', label: 'Motivo de consulta', rows: 2, placeholder: 'En palabras del paciente...' },
      { key: 'historia_problema', label: 'Historia del problema', rows: 4, placeholder: 'Inicio, evolución, desencadenantes, intentos previos de solución...' },
      { key: 'expectativas', label: 'Expectativas del tratamiento', rows: 2 },
      { key: 'derivado_por', label: 'Derivado por', rows: 1, placeholder: 'Médico, familiar, institución, por cuenta propia...' },
    ],
  },
  {
    key: 'antecedentes',
    title: 'Antecedentes',
    description: 'Historia personal, familiar y clínica relevante.',
    fields: [
      { key: 'personales', label: 'Antecedentes personales', rows: 3, placeholder: 'Desarrollo, escolaridad, eventos significativos...' },
      { key: 'familiares', label: 'Antecedentes familiares', rows: 3, placeholder: 'Composición familiar, antecedentes psiquiátricos o médicos en la familia...' },
      { key: 'psiquiatricos', label: 'Antecedentes psiquiátricos', rows: 2, placeholder: 'Diagnósticos previos, hospitalizaciones...' },
      { key: 'tratamientos_previos', label: 'Tratamientos psicológicos previos', rows: 2 },
      { key: 'medicacion_actual', label: 'Medicación actual', rows: 2, placeholder: 'Fármaco, dosis, prescriptor...' },
      { key: 'condiciones_medicas', label: 'Condiciones médicas relevantes', rows: 2 },
    ],
  },
  {
    key: 'areas',
    title: 'Áreas de funcionamiento',
    description: 'Cómo está el paciente en su vida diaria.',
    fields: [
      { key: 'sueno', label: 'Sueño', rows: 2 },
      { key: 'apetito', label: 'Alimentación / apetito', rows: 2 },
      { key: 'consumo_sustancias', label: 'Consumo de sustancias (alcohol, tabaco, otras)', rows: 2 },
      { key: 'vida_social', label: 'Vida social y red de apoyo', rows: 2 },
      { key: 'laboral_academico', label: 'Ámbito laboral / académico', rows: 2 },
      { key: 'pareja_familia', label: 'Pareja y familia', rows: 2 },
    ],
  },
  {
    key: 'examen_mental',
    title: 'Examen mental',
    description: 'Observaciones del terapeuta en la primera entrevista.',
    fields: [
      { key: 'apariencia_conducta', label: 'Apariencia y conducta', rows: 2 },
      { key: 'animo_afecto', label: 'Estado de ánimo y afecto', rows: 2 },
      { key: 'pensamiento_lenguaje', label: 'Pensamiento y lenguaje', rows: 2 },
      { key: 'orientacion_cognicion', label: 'Orientación y cognición', rows: 2 },
    ],
  },
]

export function getIntakeText(form: ClinicalIntakeData, section: IntakeTextSectionKey, key: string): string {
  return ((form[section] as unknown as Record<string, string>)[key]) ?? ''
}

export function setIntakeText(form: ClinicalIntakeData, section: IntakeTextSectionKey, key: string, value: string): void {
  ;(form[section] as unknown as Record<string, string>)[key] = value
}
