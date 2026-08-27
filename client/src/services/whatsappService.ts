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
  config: (businessId: string) => ['whatsapp-config', businessId] as const,
  status: (businessId: string) => ['whatsapp-status', businessId] as const,
  templates: (businessId: string) => ['whatsapp-templates', businessId] as const,
  variables: () => ['whatsapp-variables'] as const,
}

export const getWhatsAppConfig = async (): Promise<WhatsAppConfig> => {
  return apiRequest<WhatsAppConfig>('GET', '/whatsapp/config')
}

export const updateWhatsAppConfig = async (data: Partial<WhatsAppConfig>): Promise<void> => {
  return apiRequest<void>('PUT', '/whatsapp/config', data)
}

export const createWhatsAppInstance = async (): Promise<{ instance_id: string; qr_code: string | null }> => {
  return apiRequest('POST', '/whatsapp/instance', {})
}

export const getWhatsAppQr = async (): Promise<WhatsAppQr> => {
  return apiRequest<WhatsAppQr>('GET', '/whatsapp/qr')
}

export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  return apiRequest<WhatsAppStatus>('GET', '/whatsapp/status')
}

export const disconnectWhatsApp = async (): Promise<void> => {
  return apiRequest<void>('POST', '/whatsapp/disconnect')
}

export const sendWhatsAppTest = async (number: string, text: string): Promise<void> => {
  return apiRequest<void>('POST', '/whatsapp/test', { number, text })
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
