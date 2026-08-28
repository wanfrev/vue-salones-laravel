import { apiRequest } from '../lib/api'

export interface WhatsAppConfig {
  whatsapp_enabled: boolean
  whatsapp_instance_id: string | null
  whatsapp_instance_status: string | null
  whatsapp_instance_number: string | null
  whatsapp_base_url: string | null
  whatsapp_api_key: string | null
}

export interface WhatsAppStatus {
  status: string
}

export interface WhatsAppQr {
  qr_code: string | null
}

export interface WhatsAppInstanceInfo {
  instance_id: string | null
  instance_status: string | null
  instance_number: string | null
}

export interface WhatsAppInstancesSummary {
  default: WhatsAppInstanceInfo | null
  branches: { branch_id: string; branch_name: string; instance: WhatsAppInstanceInfo | null }[]
}

export interface MessageTemplate {
  id?: string
  business_id?: string
  type: 'appointment_reminder' | 'appointment_confirmation' | 'follow_up'
  name: string
  body: string
  is_active: boolean
  // Horas antes del inicio de la cita (appointment_reminder) u horas después de que termina
  // (follow_up). Sin uso para appointment_confirmation, que se envía al agendar.
  offset_hours?: number | null
  created_at?: string
  updated_at?: string
}

export interface TemplateVariable {
  key: string
  label: string
}

export const whatsappKeys = {
  instances: (businessId: string) => ['whatsapp-instances', businessId] as const,
  config: (businessId: string, branchId: string | null) => ['whatsapp-config', businessId, branchId] as const,
  status: (businessId: string, branchId: string | null) => ['whatsapp-status', businessId, branchId] as const,
  templates: (businessId: string) => ['whatsapp-templates', businessId] as const,
  variables: () => ['whatsapp-variables'] as const,
}

// `branch_id` es opcional en todas estas llamadas — cada negocio tiene un número por defecto
// (compartido entre sucursales) y, si tiene multi-sucursal, puede conectar uno propio por cada
// una; omitir branch_id siempre apunta al número compartido.

export const listWhatsAppInstances = async (): Promise<WhatsAppInstancesSummary> => {
  return apiRequest<WhatsAppInstancesSummary>('GET', '/whatsapp/instances')
}

export const getWhatsAppConfig = async (branchId?: string | null): Promise<WhatsAppConfig> => {
  const qs = branchId ? `?branch_id=${branchId}` : ''
  return apiRequest<WhatsAppConfig>('GET', `/whatsapp/config${qs}`)
}

export const updateWhatsAppConfig = async (data: Partial<WhatsAppConfig>): Promise<void> => {
  return apiRequest<void>('PUT', '/whatsapp/config', data)
}

export const createWhatsAppInstance = async (branchId?: string | null): Promise<{ instance_id: string; qr_code: string | null }> => {
  return apiRequest('POST', '/whatsapp/instance', { branch_id: branchId ?? null })
}

export const getWhatsAppQr = async (branchId?: string | null): Promise<WhatsAppQr> => {
  const qs = branchId ? `?branch_id=${branchId}` : ''
  return apiRequest<WhatsAppQr>('GET', `/whatsapp/qr${qs}`)
}

export const getWhatsAppStatus = async (branchId?: string | null): Promise<WhatsAppStatus> => {
  const qs = branchId ? `?branch_id=${branchId}` : ''
  return apiRequest<WhatsAppStatus>('GET', `/whatsapp/status${qs}`)
}

export const disconnectWhatsApp = async (branchId?: string | null): Promise<void> => {
  return apiRequest<void>('POST', '/whatsapp/disconnect', { branch_id: branchId ?? null })
}

export const sendWhatsAppTest = async (number: string, text: string, branchId?: string | null): Promise<void> => {
  return apiRequest<void>('POST', '/whatsapp/test', { number, text, branch_id: branchId ?? null })
}

export const getMessageTemplates = async (): Promise<MessageTemplate[]> => {
  return apiRequest<MessageTemplate[]>('GET', '/whatsapp/templates')
}

export const saveMessageTemplate = async (template: MessageTemplate): Promise<MessageTemplate> => {
  return apiRequest<MessageTemplate>('POST', '/whatsapp/templates', template)
}

export const deleteMessageTemplate = async (id: string): Promise<void> => {
  return apiRequest<void>('DELETE', `/whatsapp/templates/${id}`)
}

export const getTemplateVariables = async (): Promise<{ variables: TemplateVariable[] }> => {
  return apiRequest<{ variables: TemplateVariable[] }>('GET', '/whatsapp/variables')
}
