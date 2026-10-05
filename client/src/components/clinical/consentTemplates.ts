/**
 * Plantillas de consentimiento informado para psicoterapia. Texto base editable en pantalla antes
 * de firmar — conviene que el profesional del consultorio lo revise y ajuste a su práctica y a la
 * normativa que le aplique (colegio/federación profesional, protección de datos).
 */

export interface ClinicalConsentTemplate {
  id: string
  label: string
  title: string
  content: string
  /** Si la plantilla la firma un tutor/representante en vez del propio paciente. */
  requiresGuardian: boolean
}

const CONFIDENTIALITY = `CONFIDENCIALIDAD Y SUS LÍMITES
Todo lo conversado en sesión es confidencial y no será compartido con terceros sin autorización escrita. La confidencialidad tiene límites legales y éticos: (a) riesgo grave e inminente para la vida o integridad del paciente o de otra persona; (b) sospecha de maltrato o abuso de un menor de edad o persona incapaz; (c) requerimiento de una autoridad judicial competente.`

const FEES = `HONORARIOS, CITAS Y CANCELACIONES
Los honorarios, la duración y la frecuencia de las sesiones se acuerdan al inicio del tratamiento. Las sesiones deben cancelarse o reprogramarse con la anticipación acordada; las inasistencias sin aviso podrán cobrarse según lo convenido.`

const RECORDS = `REGISTRO CLÍNICO
El profesional llevará un expediente con notas de sesión, que se resguarda de forma confidencial y se cifra en el sistema. El paciente puede solicitar información sobre su proceso en cualquier momento.`

const NO_GUARANTEE = `NATURALEZA DEL TRATAMIENTO
La psicoterapia es un proceso colaborativo cuyos resultados dependen de múltiples factores, incluido el compromiso del paciente. Puede implicar temas emocionalmente difíciles y, en ocasiones, malestar transitorio. No se garantizan resultados específicos. El paciente puede interrumpir el tratamiento cuando lo decida.`

const VOLUNTARY = `El paciente declara haber leído y comprendido este documento, haber podido hacer preguntas, y acepta voluntariamente iniciar el proceso terapéutico.`

export const CLINICAL_CONSENT_TEMPLATES: ClinicalConsentTemplate[] = [
  {
    id: 'adult',
    label: 'Psicoterapia individual (adulto)',
    title: 'Consentimiento informado — Psicoterapia individual',
    requiresGuardian: false,
    content: [CONFIDENTIALITY, FEES, RECORDS, NO_GUARANTEE, VOLUNTARY].join('\n\n'),
  },
  {
    id: 'minor',
    label: 'Psicoterapia con menor de edad (tutor)',
    title: 'Consentimiento informado — Psicoterapia con menor de edad',
    requiresGuardian: true,
    content: [
      `El representante legal firmante autoriza la atención psicológica del menor identificado en este expediente.`,
      CONFIDENTIALITY + `\nEn el caso de menores, el profesional podrá compartir con los representantes la información necesaria para el cuidado del menor, procurando preservar el contenido íntimo de las sesiones.`,
      FEES,
      RECORDS,
      NO_GUARANTEE,
      `El representante declara haber leído y comprendido este documento y acepta voluntariamente el tratamiento del menor.`,
    ].join('\n\n'),
  },
  {
    id: 'couple',
    label: 'Terapia de pareja o familiar',
    title: 'Consentimiento informado — Terapia de pareja o familiar',
    requiresGuardian: false,
    content: [
      `En la terapia de pareja o familiar el sistema (pareja o familia) es el paciente. Lo conversado en sesiones conjuntas es confidencial frente a terceros ajenos al proceso. Si el profesional atiende también a un integrante de forma individual, no guardará secretos que perjudiquen el proceso conjunto.`,
      CONFIDENTIALITY,
      FEES,
      RECORDS,
      NO_GUARANTEE,
      VOLUNTARY,
    ].join('\n\n'),
  },
]

export function getClinicalConsentTemplate(id: string): ClinicalConsentTemplate {
  return CLINICAL_CONSENT_TEMPLATES.find(t => t.id === id) ?? CLINICAL_CONSENT_TEMPLATES[0]
}
