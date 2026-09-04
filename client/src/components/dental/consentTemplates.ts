export interface ConsentTemplate {
  id: string
  label: string
  procedureDescriptionPlaceholder: string
  risksText: string
}

export const CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'exodoncia',
    label: 'Exodoncia (extracción dental)',
    procedureDescriptionPlaceholder: 'Ej: Exodoncia del diente 18',
    risksText:
      'Riesgos y complicaciones de la anestesia: fractura de la aguja, hematoma, dolor, equimosis, parestesia, ' +
      'reacciones alérgicas al anestésico, inyección intravascular, mareo, palpitaciones, trismus.\n\n' +
      'Riesgos y complicaciones de la extracción: lipotimia, inflamación, dolor, hemorragia alveolar, desgarro o ' +
      'dehiscencia de tejidos blandos, fractura de instrumentos, fractura radicular, fractura o luxación de dientes ' +
      'adyacentes, fractura de la tabla ósea, hematoma, laceración, comunicación oro-sinusal.\n\n' +
      'Riesgos y complicaciones posteriores: dolor, inflamación, dificultad para abrir/cerrar la boca, alveolitis, ' +
      'hematoma, tumefacción de los tejidos involucrados.',
  },
  {
    id: 'endodoncia',
    label: 'Endodoncia (tratamiento de conducto)',
    procedureDescriptionPlaceholder: 'Ej: Tratamiento de conducto radicular del diente 12',
    risksText:
      'Riesgos y complicaciones: dolor o inflamación post-tratamiento, fractura de instrumentos dentro del conducto, ' +
      'perforación radicular, sobreobturación o subobturación, necesidad de retratamiento, persistencia de la ' +
      'infección o absceso, fractura dental que requiera extracción posterior, reacción alérgica a materiales de ' +
      'obturación.',
  },
  {
    id: 'cirugia_periodontal',
    label: 'Cirugía periodontal',
    procedureDescriptionPlaceholder: 'Ej: Raspado y alisado radicular a campo abierto, cuadrante superior derecho',
    risksText:
      'Riesgos y complicaciones: dolor, inflamación, sangrado, sensibilidad dental post-operatoria, recesión ' +
      'gingival, exposición radicular, movilidad temporal, infección, retraso en la cicatrización, resultado ' +
      'estético variable según la condición periodontal previa.',
  },
  {
    id: 'terceros_molares',
    label: 'Cirugía de terceros molares (cordales)',
    procedureDescriptionPlaceholder: 'Ej: Extracción quirúrgica del diente 38 (tercer molar retenido)',
    risksText:
      'Riesgos y complicaciones: inflamación y dolor prolongado, trismus, parestesia o hipoestesia del nervio ' +
      'dentario inferior o lingual (temporal o permanente), alveolitis, hemorragia, infección, comunicación ' +
      'oro-sinusal (en piezas superiores), fractura mandibular (infrecuente), lesión a dientes adyacentes.',
  },
  {
    id: 'general',
    label: 'Procedimiento odontológico general',
    procedureDescriptionPlaceholder: 'Describe el procedimiento a realizar',
    risksText:
      'Riesgos y complicaciones generales: molestia o dolor durante y después del procedimiento, sensibilidad ' +
      'dental, reacción alérgica a materiales o anestésicos utilizados, necesidad de tratamiento adicional según ' +
      'la evolución del caso.',
  },
]

export const CONSENT_LEGAL_TEXT = `A continuación se brinda información sobre el tratamiento que se realizará de acuerdo a su condición clínica. Se solicita tener en cuenta lo siguiente:

1. Se le ha dado a conocer su diagnóstico y se le ha explicado en términos generales a qué se refiere.
2. Teniendo en cuenta el diagnóstico, se le ha recomendado el tratamiento consignado en este consentimiento.
3. Se le han explicado las indicaciones, contraindicaciones, ventajas, desventajas y complicaciones posibles del procedimiento.
4. Ha tenido conocimiento de otras alternativas de tratamiento de acuerdo a su diagnóstico y condición individual, así como sus ventajas, desventajas y riesgos.
5. Comprende y acepta que durante el procedimiento pueden surgir circunstancias imprevistas que requieran una extensión del procedimiento original u otro procedimiento no mencionado aquí.
6. Se le ha informado que la odontología no es una ciencia exacta y no se pueden garantizar los resultados esperados — es una obligación de medio, no de resultado.
7. Tiene derecho a recibir información completa, veraz, transparente, oportuna, verificable, comprensible, precisa e idónea respecto a su tratamiento y sus riesgos.
8. Se le han explicado sus derechos y deberes como paciente de esta clínica.
9. Entiende que existen riesgos inherentes a la atención en salud, y que puede presentarse un incidente, evento adverso o complicación de acuerdo a su condición clínica individual.
10. Al firmar este consentimiento reconoce que lo ha leído, o que le ha sido leído y explicado, que lo comprende, que tuvo tiempo suficiente para hacerlo, que pudo formular preguntas y que estas fueron respondidas satisfactoriamente antes de firmar.`
