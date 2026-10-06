import { apiRequest } from '../../lib/api'
import type { ClinicalDiagram, DiagramType, GenogramData, LifeLineData } from '../../types/database'

/** De un paciente o de un caso (familia/pareja). */
export type DiagramScope = { kind: 'client' | 'case'; id: string }

const base = (scope: DiagramScope, type: DiagramType) =>
  `${scope.kind === 'case' ? '/clinical-cases' : '/clients'}/${scope.id}/diagrams/${type}`

/** `null` (el backend responde 204) cuando todavía no existe ese diagrama. */
export const getDiagram = async <T extends GenogramData | LifeLineData>(scope: DiagramScope, type: DiagramType) =>
  apiRequest<ClinicalDiagram<T> | null>('GET', base(scope, type))

export const saveDiagram = async <T extends GenogramData | LifeLineData>(scope: DiagramScope, type: DiagramType, data: T) =>
  apiRequest<ClinicalDiagram<T>>('PUT', base(scope, type), { data })
