import type { MedicalSystemKey } from '../../types/database'

export const MEDICAL_SYSTEM_LABELS: Record<MedicalSystemKey, string> = {
  sistema_nervioso: 'Sistema Nervioso', sistema_endocrino: 'Sistema Endocrino',
  sistema_osteomuscular: 'Sistema Osteomuscular', sistema_cardiovascular: 'Sistema Cardiovascular',
  sistema_respiratorio: 'Sistema Respiratorio', sistema_inmunologico: 'Sistema Inmunológico',
  sistema_dermatologico: 'Sistema Dermatológico', ginecobstetricos: 'Ginecobstétricos',
  sistema_hematologico: 'Sistema Hematológico', sistema_digestivo: 'Sistema Digestivo',
  sistema_renal: 'Sistema Renal', hereditarios: 'Hereditarios', perinatales: 'Perinatales',
  toxico_alergicos: 'Tóxico-Alérgicos', farmacologicos: 'Farmacológicos', quirurgicos: 'Quirúrgicos',
  hospitalarios: 'Hospitalarios', familiares: 'Familiares', psicosociales: 'Psicosociales', otros: 'Otros',
}

/**
 * Subset of MEDICAL_SYSTEMS that changes what a dentist does chairside — anesthesia choice,
 * bleeding risk, infection/healing risk, drug interactions. Drives the red alert badges in
 * PatientDentalShell's header. The remaining systems (hereditarios, quirúrgicos, familiares,
 * etc.) stay important background in Historia Clínica but aren't urgent enough to interrupt
 * every visit with.
 */
export const HIGH_RISK_MEDICAL_SYSTEMS: MedicalSystemKey[] = [
  'toxico_alergicos', 'farmacologicos', 'sistema_cardiovascular', 'sistema_respiratorio',
  'sistema_endocrino', 'sistema_hematologico', 'sistema_inmunologico', 'ginecobstetricos',
]
