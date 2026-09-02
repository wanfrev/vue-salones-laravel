<template>
  <!-- Estado explícito: dónde estás parado y qué falta -->
  <div class="mb-6 rounded-xl border p-4"
    :class="statusLevel === 'ready' ? 'border-success/30 bg-success/5' : 'border-border bg-bg-secondary/30'">
    <div class="flex items-start gap-3">
      <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        :class="statusLevel === 'ready' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'">
        <svg v-if="statusLevel === 'ready'" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span v-else class="text-xs font-bold">!</span>
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-sm font-semibold text-text">{{ statusHeadline }}</p>
        <ul class="space-y-1 text-xs text-text-secondary">
          <li class="flex items-center gap-1.5">
            <span :class="isConnected ? 'text-success' : 'text-text-muted'">{{ isConnected ? '✓' : '○' }}</span>
            Número de WhatsApp conectado
          </li>
          <li class="flex items-center gap-1.5">
            <span :class="hasActiveReminderTemplate ? 'text-success' : 'text-text-muted'">{{ hasActiveReminderTemplate ? '✓' : '○' }}</span>
            Plantilla de recordatorio activa
          </li>
        </ul>
        <p v-if="statusLevel === 'ready'" class="text-xs text-text-secondary">
          Tus clientes reciben un WhatsApp automático <strong>{{ offsetsLabel }}</strong> antes de cada cita. Personaliza el mensaje abajo, o cambia el tiempo de aviso en Ajustes → Notificaciones.
        </p>
      </div>
    </div>
  </div>

  <SectionCard
    title="WhatsApp"
    subtitle="Conecta tu número de WhatsApp para enviar recordatorios de cita"
    icon="M3 21l1.65-3.8a9 9 0 113.55 2.66L3 21zM8.5 8.5l.81.625a3 3 0 004.37.82L15 9m-1 7a5 5 0 005-5M2 12a5 5 0 015-5"
  >
    <div class="space-y-4">
      <!-- Enable/Disable Toggle -->
      <FormToggle
        :model-value="config.whatsapp_enabled ?? false"
        @update:model-value="handleToggleEnabled"
        label="Activar WhatsApp"
        hint="Envía recordatorios de cita por WhatsApp a tus clientes"
        :disabled="loading"
      />

      <!-- Sucursal a conectar — cada una puede tener su propio número, o compartir el de arriba -->
      <div v-if="config.whatsapp_enabled && businessStore.isMultiBranch">
        <label class="block text-sm font-medium text-text-secondary mb-1.5">Número a gestionar</label>
        <select v-model="selectedBranchIdModel"
          class="w-full max-w-xs rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
          <option value="">Compartido (todas las sucursales)</option>
          <option v-for="b in businessStore.branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <p class="text-xs text-text-muted mt-1.5">
          Una sucursal sin número propio conectado usa el compartido automáticamente.
        </p>
      </div>

      <template v-if="config.whatsapp_enabled">
        <!-- Instance Management -->
        <div class="border-t border-border pt-4 space-y-3">
          <!-- Not Connected / Create -->
          <div v-if="!config.whatsapp_instance_id || isDisconnectedState">
            <p class="text-sm font-medium text-text mb-2">Conectar WhatsApp</p>
            <button @click="createInstance" :disabled="loading"
              class="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-theme">
              Generar código QR
            </button>
          </div>

          <!-- QR Code -->
          <div v-if="config.whatsapp_instance_id && (isPendingState || isDisconnectedState)"
            class="flex flex-col items-center gap-3 p-4 rounded-lg bg-bg-secondary/30">
            <p class="text-sm font-medium text-text">Escanea el código QR con WhatsApp</p>
            <div v-if="qrCode" class="bg-white p-3 rounded-xl">
              <img :src="qrCode" alt="QR WhatsApp" class="w-52 h-52" />
            </div>
            <div v-else class="flex items-center justify-center w-52 h-52">
              <svg class="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <button @click="checkStatus" :disabled="loading"
              class="text-xs font-medium text-primary hover:text-primary-hover transition-theme">
              Verificar conexión
            </button>
          </div>

          <!-- Connected -->
          <div v-if="isConnected"
            class="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-text">WhatsApp conectado</p>
                <p class="text-xs text-text-muted">Instancia: {{ config.whatsapp_instance_id }}</p>
                <p v-if="config.whatsapp_instance_number" class="text-xs text-text-muted">
                  Número: {{ config.whatsapp_instance_number }}
                </p>
              </div>
            </div>
            <button @click="handleDisconnect" :disabled="loading"
              class="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-theme">
              Desconectar
            </button>
          </div>
        </div>

        <!-- Test Message -->
        <div v-if="config.whatsapp_instance_status === 'connected' || config.whatsapp_instance_status === 'open'"
          class="border-t border-border pt-4 space-y-3">
          <p class="text-sm font-medium text-text">Enviar mensaje de prueba</p>
          <div class="flex items-end gap-3">
            <div class="w-40">
              <label class="block text-xs font-medium text-text-secondary mb-1">Número</label>
              <input v-model="testNumber" type="text" placeholder="584121234567"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div class="flex-1">
              <label class="block text-xs font-medium text-text-secondary mb-1">Mensaje</label>
              <input v-model="testMessage" type="text" placeholder="Mensaje de prueba..."
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <button @click="handleSendTest" :disabled="!testNumber || !testMessage || loading"
              class="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-text-inverse hover:bg-primary-hover disabled:opacity-50 transition-theme">
              Enviar
            </button>
          </div>
        </div>
      </template>
    </div>
  </SectionCard>

  <!-- Message Templates -->
  <SectionCard
    v-if="config.whatsapp_enabled"
    class="mb-6"
    title="Plantillas de mensajes"
    subtitle="Personaliza los mensajes que se envían a tus clientes"
    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  >
    <template #header-actions>
      <button @click="openNewTemplate"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse hover:bg-primary-hover transition-theme">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva plantilla
      </button>
    </template>

    <div v-if="templates.length === 0" class="py-8 text-center">
      <EmptyState
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        title="Sin plantillas"
        subtitle="Crea tu primera plantilla de mensaje"
        action-label="Nueva plantilla"
        @action="openNewTemplate" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="tpl in templates" :key="tpl.id"
        class="flex items-start justify-between gap-4 rounded-lg border border-border bg-bg-secondary/30 p-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-semibold text-text truncate">{{ tpl.name }}</span>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="tpl.type === 'appointment_reminder' ? 'bg-primary/10 text-primary' : tpl.type === 'appointment_confirmation' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
              {{ typeLabel(tpl.type) }}
            </span>
            <span v-if="offsetLabel(tpl)" class="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
              {{ offsetLabel(tpl) }}
            </span>
            <span v-if="!tpl.is_active" class="rounded-full bg-text-muted/10 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
              Inactiva
            </span>
          </div>
          <p class="text-xs text-text-muted line-clamp-2">{{ tpl.body }}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button @click="editTemplate(tpl)"
            class="rounded-lg p-1.5 text-text-muted hover:text-primary hover:bg-bg-secondary transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button @click="confirmDeleteTemplate(tpl)"
            class="rounded-lg p-1.5 text-text-muted hover:text-danger hover:bg-bg-secondary transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </SectionCard>

  <!-- Template Editor Modal -->
  <ModalBase
    :is-open="showTemplateEditor"
    :title="editingTemplateId ? 'Editar plantilla' : 'Nueva plantilla'"
    subtitle="Personaliza el mensaje usando las variables disponibles"
    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    size="lg"
    :is-loading="templateSaving"
    :confirm-text="'Guardar plantilla'"
    @close="showTemplateEditor = false"
    @confirm="saveTemplate"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput v-model="templateForm.name" label="Nombre" placeholder="Ej: Recordatorio de cita" required />
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Tipo</label>
          <select v-model="templateForm.type"
            class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="appointment_reminder">Recordatorio de cita</option>
            <option value="appointment_confirmation">Confirmación de cita</option>
            <option value="follow_up">Seguimiento post-cita</option>
          </select>
        </div>
      </div>
      <div v-if="templateForm.type !== 'appointment_confirmation'">
        <label class="block text-sm font-medium text-text-secondary mb-1.5">
          {{ templateForm.type === 'follow_up' ? 'Horas después de terminar la cita' : 'Horas antes de la cita' }}
        </label>
        <input v-model.number="templateForm.offset_hours" type="number" min="0" max="720" step="0.5"
          :placeholder="templateForm.type === 'follow_up' ? 'Ej: 2' : 'Ej: 24'"
          class="w-32 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <p class="text-xs text-text-muted mt-1.5">
          {{ templateForm.type === 'follow_up'
            ? 'Se envía cuando pasan estas horas desde el fin programado de la cita — ej. "ven a recoger a tu mascota".'
            : 'Se envía cuando faltan estas horas para el inicio de la cita. Puedes crear varias plantillas con distintos tiempos (24h antes, 1h antes, etc).' }}
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1.5">Mensaje</label>
        <textarea v-model="templateForm.body" rows="5" placeholder="Escribe tu mensaje... usa {cliente}, {servicio}, {fecha}, etc."
          class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"></textarea>
        <p class="text-xs text-text-muted mt-1.5">
          <span class="font-medium">Variables disponibles:</span>
          <span v-for="v in availableVariables" :key="v.key"
            @click="insertVariable(v.key)"
            class="ml-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary cursor-pointer hover:bg-primary/20 transition-colors">
            {{ v.key }}
          </span>
        </p>
      </div>
      <FormToggle v-model="templateForm.is_active" label="Plantilla activa" hint="Solo las plantillas activas se usarán para enviar mensajes" />
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useNotification } from '../../composables/common/useNotification'
import { useBusinessStore } from '../../store/business'
import { SectionCard, EmptyState } from '../common'
import { FormToggle, FormInput } from '../forms'
import ModalBase from '../common/ModalBase.vue'
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  createWhatsAppInstance,
  getWhatsAppQr,
  getWhatsAppStatus,
  disconnectWhatsApp,
  sendWhatsAppTest,
  getMessageTemplates,
  saveMessageTemplate,
  deleteMessageTemplate,
  getTemplateVariables,
  type WhatsAppConfig,
  type MessageTemplate,
  type TemplateVariable,
} from '../../services/whatsappService'

const { success, error: showError } = useNotification()
const businessStore = useBusinessStore()

const loading = ref(false)
const selectedBranchId = ref<string | null>(null)
// <select> solo trabaja con strings — '' representa el número compartido (branch_id null).
const selectedBranchIdModel = computed({
  get: () => selectedBranchId.value ?? '',
  set: (v: string) => { selectedBranchId.value = v || null },
})
const config = ref<WhatsAppConfig>({
  whatsapp_enabled: false,
  whatsapp_instance_id: null,
  whatsapp_instance_status: 'disconnected',
  whatsapp_instance_number: null,
  whatsapp_base_url: null,
  whatsapp_api_key: null,
})

const qrCode = ref<string | null>(null)

const testNumber = ref('')
const testMessage = ref('Hola, este es un mensaje de prueba desde Luma')

const templates = ref<MessageTemplate[]>([])
const showTemplateEditor = ref(false)
const editingTemplateId = ref<string | null>(null)
const templateSaving = ref(false)
const templateForm = reactive<MessageTemplate>({
  type: 'appointment_reminder',
  name: '',
  body: '',
  is_active: true,
  offset_hours: 24,
})

const availableVariables = ref<TemplateVariable[]>([])

const isConnected = computed(() =>
  config.value.whatsapp_enabled &&
  (config.value.whatsapp_instance_status === 'connected' || config.value.whatsapp_instance_status === 'open')
)

// Evolution API devuelve el vocabulario crudo de Baileys ('close', 'connecting'),
// no los nombres que usamos nosotros — hay que reconocer ambos.
const isDisconnectedState = computed(() =>
  config.value.whatsapp_instance_status === 'disconnected' || config.value.whatsapp_instance_status === 'close'
)
const isPendingState = computed(() =>
  config.value.whatsapp_instance_status === 'pending' || config.value.whatsapp_instance_status === 'connecting'
)

const hasActiveReminderTemplate = computed(() =>
  templates.value.some(t => t.type === 'appointment_reminder' && t.is_active)
)

const statusLevel = computed<'ready' | 'pending'>(() =>
  isConnected.value && hasActiveReminderTemplate.value ? 'ready' : 'pending'
)

const statusHeadline = computed(() => {
  if (statusLevel.value === 'ready') return 'Todo listo — los recordatorios se están enviando automáticamente.'
  if (!isConnected.value) return 'Falta conectar tu número de WhatsApp para empezar.'
  return 'Falta activar una plantilla de recordatorio.'
})

const offsetsLabel = computed(() => {
  const raw = businessStore.features.appointment_reminder_offsets_hours
  const offsets: number[] = Array.isArray(raw) && raw.length > 0 ? raw : [24, 1]
  const sorted = [...offsets].sort((a, b) => b - a)
  const parts = sorted.map(h => h === 1 ? '1 hora' : h < 1 ? `${Math.round(h * 60)} minutos` : `${h} horas`)
  if (parts.length === 1) return parts[0]
  return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1]
})

const typeLabel = (type: string) => {
  const labels: Record<string, string> = {
    appointment_reminder: 'Recordatorio',
    appointment_confirmation: 'Confirmación',
    follow_up: 'Seguimiento',
  }
  return labels[type] ?? type
}

const offsetLabel = (tpl: MessageTemplate): string | null => {
  if (tpl.type === 'appointment_confirmation' || tpl.offset_hours == null) return null
  const h = tpl.offset_hours
  const hLabel = Number.isInteger(h) ? String(h) : h.toFixed(1)
  return tpl.type === 'follow_up' ? `${hLabel}h después` : `${hLabel}h antes`
}

// Cambiar el tipo con el editor abierto reinicia el offset a un default sensato para ese
// tipo — sin esto, elegir "Seguimiento" dejaba el valor de "Recordatorio" (24h) puesto, que
// no tiene sentido para un mensaje que se manda después de terminar la cita.
watch(() => templateForm.type, (type) => {
  if (type === 'appointment_confirmation') {
    templateForm.offset_hours = null
  } else if (templateForm.offset_hours == null) {
    templateForm.offset_hours = type === 'follow_up' ? 2 : 24
  }
})

// Cada operación async (poll de QR, chequeo de estado, carga de config) queda "anclada" a la
// sucursal con la que arrancó. Si el usuario cambia la sucursal seleccionada mientras una de
// estas sigue en vuelo (p.ej. el poll de QR de la sucursal A, que reintenta hasta 16s), sin esto
// esa operación seguía leyendo `selectedBranchId.value` en vivo en cada iteración y terminaba
// escribiendo el QR/estado de una sucursal sobre la pantalla de otra — causaba que el check de
// "conectado" nunca prendiera para la sucursal correcta y que pareciera conectada en ambas.
let requestToken = 0

const loadConfig = async (branchId: string | null = selectedBranchId.value, token = requestToken) => {
  try {
    const result = await getWhatsAppConfig(branchId)
    if (token !== requestToken) return
    config.value = result
  } catch { /* silently fail */ }
}

watch(selectedBranchId, async (branchId) => {
  const token = ++requestToken
  qrCode.value = null
  await loadConfig(branchId, token)
  if (token !== requestToken) return
  if (config.value.whatsapp_instance_id && (isDisconnectedState.value || isPendingState.value)) {
    pollForQr(branchId, token)
  }
})

const handleToggleEnabled = async (val: boolean) => {
  loading.value = true
  try {
    await updateWhatsAppConfig({ whatsapp_enabled: val })
    config.value.whatsapp_enabled = val
    success(val ? 'WhatsApp activado' : 'WhatsApp desactivado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar')
  } finally {
    loading.value = false
  }
}

// El QR se genera de forma asíncrona en el servidor de WhatsApp (Baileys aún está
// conectando) — puede tardar más de un par de segundos, así que reintentamos en vez
// de rendirnos con el primer intento vacío.
const pollForQr = async (branchId: string | null = selectedBranchId.value, token = requestToken): Promise<boolean> => {
  for (let attempt = 0; !qrCode.value && attempt < 8; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (token !== requestToken) return false
    try {
      const qrResult = await getWhatsAppQr(branchId)
      if (token !== requestToken) return false
      qrCode.value = qrResult.qr_code ?? null
    } catch {
      // seguimos reintentando aunque un intento puntual falle
    }
  }
  return !!qrCode.value
}

const createInstance = async () => {
  loading.value = true
  const token = ++requestToken
  const branchId = selectedBranchId.value
  try {
    const result = await createWhatsAppInstance(branchId)
    if (token !== requestToken) return
    config.value.whatsapp_instance_id = result.instance_id
    config.value.whatsapp_instance_status = 'pending'
    qrCode.value = result.qr_code ?? null

    const gotQr = qrCode.value ? true : await pollForQr(branchId, token)
    if (token !== requestToken) return

    if (gotQr) {
      success('Instancia creada. Escanea el código QR con WhatsApp')
    } else {
      showError('El QR está tardando más de lo normal — espera unos segundos y dale a "Verificar conexión"')
    }
  } catch (err: any) {
    if (token === requestToken) showError(err?.message ?? 'Error al crear la instancia')
  } finally {
    loading.value = false
  }
}

const checkStatus = async () => {
  loading.value = true
  const token = requestToken
  const branchId = selectedBranchId.value
  try {
    const result = await getWhatsAppStatus(branchId)
    if (token !== requestToken) return
    config.value.whatsapp_instance_status = result.status
    if (result.instance_number) {
      config.value.whatsapp_instance_number = result.instance_number
    }
    if (result.status === 'connected' || result.status === 'open') {
      success('¡WhatsApp conectado correctamente!')
      qrCode.value = null
    } else {
      showError('WhatsApp aún no está conectado. Escanea el QR.')
    }
  } catch (err: any) {
    if (token === requestToken) showError(err?.message ?? 'Error al verificar')
  } finally {
    loading.value = false
  }
}

const handleDisconnect = async () => {
  if (!confirm('¿Desconectar WhatsApp? Dejarás de enviar recordatorios por este canal.')) return
  loading.value = true
  const token = ++requestToken
  const branchId = selectedBranchId.value
  try {
    await disconnectWhatsApp(branchId)
    if (token !== requestToken) return
    config.value.whatsapp_instance_id = null
    config.value.whatsapp_instance_status = 'disconnected'
    config.value.whatsapp_instance_number = null
    qrCode.value = null
    success('WhatsApp desconectado')
  } catch (err: any) {
    if (token === requestToken) showError(err?.message ?? 'Error al desconectar')
  } finally {
    loading.value = false
  }
}

const handleSendTest = async () => {
  if (!testNumber.value || !testMessage.value) return
  loading.value = true
  try {
    await sendWhatsAppTest(testNumber.value, testMessage.value, selectedBranchId.value)
    success('Mensaje de prueba enviado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al enviar')
  } finally {
    loading.value = false
  }
}

const loadTemplates = async () => {
  try {
    templates.value = await getMessageTemplates()
  } catch { /* silently fail */ }
}

const loadVariables = async () => {
  try {
    const result = await getTemplateVariables()
    availableVariables.value = result.variables
  } catch { /* silently fail */ }
}

const openNewTemplate = () => {
  editingTemplateId.value = null
  templateForm.type = 'appointment_reminder'
  templateForm.name = ''
  templateForm.body = ''
  templateForm.is_active = true
  templateForm.offset_hours = 24
  showTemplateEditor.value = true
}

const editTemplate = (tpl: MessageTemplate) => {
  editingTemplateId.value = tpl.id ?? null
  templateForm.id = tpl.id
  templateForm.type = tpl.type
  templateForm.name = tpl.name
  templateForm.body = tpl.body
  templateForm.is_active = tpl.is_active
  templateForm.offset_hours = tpl.offset_hours ?? null
  showTemplateEditor.value = true
}

const insertVariable = (key: string) => {
  templateForm.body += ` ${key} `
}

const saveTemplate = async () => {
  if (!templateForm.name || !templateForm.body) {
    showError('Nombre y mensaje son requeridos')
    return
  }
  if (templateForm.type !== 'appointment_confirmation' && (templateForm.offset_hours == null || templateForm.offset_hours < 0)) {
    showError('Indica cuántas horas antes/después se envía este mensaje')
    return
  }
  templateSaving.value = true
  try {
    const saved = await saveMessageTemplate({ ...templateForm })
    if (!editingTemplateId.value) {
      templates.value.push(saved)
    } else {
      const idx = templates.value.findIndex(t => t.id === saved.id)
      if (idx >= 0) templates.value[idx] = saved
    }
    showTemplateEditor.value = false
    success('Plantilla guardada')
  } catch (err: any) {
    showError(err?.message ?? 'Error al guardar')
  } finally {
    templateSaving.value = false
  }
}

const confirmDeleteTemplate = (tpl: MessageTemplate) => {
  if (!confirm(`¿Eliminar la plantilla "${tpl.name}"?`)) return
  deleteTemplateHandler(tpl.id!)
}

const deleteTemplateHandler = async (id: string) => {
  try {
    await deleteMessageTemplate(id)
    templates.value = templates.value.filter(t => t.id !== id)
    success('Plantilla eliminada')
  } catch (err: any) {
    showError(err?.message ?? 'Error al eliminar')
  }
}

onMounted(async () => {
  await loadConfig()
  loadTemplates()
  loadVariables()

  // Si ya existía una instancia sin conectar (ej. cerraron la pestaña a medio
  // escanear), pedimos el QR de una vez en vez de dejar el spinner girando sin
  // ninguna petición real detrás.
  if (config.value.whatsapp_instance_id && (isDisconnectedState.value || isPendingState.value)) {
    pollForQr()
  }
})
</script>
