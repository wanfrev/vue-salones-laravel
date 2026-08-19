<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
      <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">Editar vendedor</h2>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-vend-name">Nombre</label>
            <input id="edit-vend-name" v-model="form.name" type="text" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-vend-phone">Teléfono</label>
            <input id="edit-vend-phone" v-model="form.phone" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-vend-email">Correo electrónico</label>
            <input id="edit-vend-email" v-model="form.email" type="email" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-vend-password">Nueva contraseña</label>
            <input id="edit-vend-password" v-model="form.password" type="password" minlength="6"
              placeholder="Dejar vacío para mantener la actual" :class="inputClass" />
          </div>

          <p v-if="error" class="text-sm text-danger">{{ error }}</p>

          <div class="flex justify-end pt-1">
            <button type="submit" :disabled="saving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </form>

        <div class="mt-6 border-t border-border pt-4">
          <h3 class="mb-3 text-sm font-semibold text-text">Bienes asignados</h3>

          <p v-if="!assetsCtx.isLoading.value && assetsCtx.assets.value.length === 0" class="rounded-lg bg-bg-secondary/60 p-2.5 text-center text-xs text-text-muted">
            Sin bienes asignados
          </p>

          <ul v-else class="mb-3 space-y-1.5">
            <li v-for="a in assetsCtx.assets.value" :key="a.id"
              class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 px-2.5 py-2">
              <div v-if="editingAssetId === a.id" class="flex flex-wrap items-end gap-2">
                <div class="w-28 shrink-0">
                  <label class="mb-1 block text-[10px] font-medium text-text-muted" :for="`edit-asset-type-${a.id}`">Tipo</label>
                  <select :id="`edit-asset-type-${a.id}`" v-model="editDraft.assetType" :class="inputClass">
                    <option v-for="opt in ASSET_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="min-w-0 flex-1">
                  <label class="mb-1 block text-[10px] font-medium text-text-muted" :for="`edit-asset-desc-${a.id}`">Detalle</label>
                  <input :id="`edit-asset-desc-${a.id}`" v-model="editDraft.description" type="text" :class="inputClass" />
                </div>
                <button type="button" :disabled="!editDraft.description.trim() || assetsCtx.updateMutation.isPending.value"
                  class="shrink-0 rounded-md bg-primary px-2.5 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  @click="saveAssetEdit(a.id)">
                  Guardar
                </button>
                <button type="button" class="shrink-0 rounded-md border border-border px-2.5 py-2 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                  @click="cancelAssetEdit">
                  Cancelar
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {{ assetTypeLabel(a.assetType) }}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm text-text">{{ a.description }}</span>
                <button type="button" class="shrink-0 rounded-md p-1 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
                  title="Editar bien" @click="startAssetEdit(a)">
                  <PenIcon class="h-4 w-4" />
                </button>
                <button type="button" class="shrink-0 rounded-md p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                  title="Quitar bien" @click="assetsCtx.deleteMutation.mutate(a.id)">
                  <TrashBin2Icon class="h-4 w-4" />
                </button>
              </div>
            </li>
          </ul>

          <form class="flex items-end gap-2" @submit.prevent="addAsset">
            <div class="w-32 shrink-0">
              <label class="mb-1 block text-xs font-medium text-text-muted" for="asset-type">Tipo</label>
              <select id="asset-type" v-model="newAsset.assetType" :class="inputClass">
                <option v-for="opt in ASSET_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="min-w-0 flex-1">
              <label class="mb-1 block text-xs font-medium text-text-muted" for="asset-description">Detalle</label>
              <input id="asset-description" v-model="newAsset.description" type="text" placeholder="Ej: Toyota Corolla placa ABC123" :class="inputClass" />
            </div>
            <button type="submit" :disabled="!newAsset.description.trim() || assetsCtx.createMutation.isPending.value"
              class="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
              Agregar
            </button>
          </form>
        </div>

        <div class="mt-6 flex items-center justify-between border-t border-border pt-4">
          <button type="button"
            class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10"
            @click="confirmDelete">
            Eliminar vendedor
          </button>
          <button type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            @click="emit('close')">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, toRef } from 'vue'
import { adminUpdateEmployee } from '../../services/adminService'
import { deleteEmpleado } from '../../services/equipoService'
import { useNotification } from '../../composables/common/useNotification'
import { useEmployeeAssets } from '../../composables/staffing/useEmployeeAssets'
import { ASSET_TYPE_OPTIONS, type AssetType, type EmployeeAsset } from '../../services/staffing/employeeAssetsService'
import { translateError } from '../../lib/errors'
import { TrashBin2Icon, PenIcon } from '@solar-icons/vue/linear'
import type { VendedoraRow } from '../../services/leadsService'

const props = defineProps<{ vendedor: VendedoraRow }>()
const emit = defineEmits<{ close: []; updated: []; deleted: [] }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const { success, error: showError } = useNotification()

const form = reactive({
  name: props.vendedor.name,
  phone: props.vendedor.phone ?? '',
  email: props.vendedor.email ?? '',
  password: '',
})
const saving = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  saving.value = true
  try {
    await adminUpdateEmployee(props.vendedor.id, {
      full_name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      // Write-only, like everywhere else this pattern is used (bank numbers, SSN) — omit the
      // key entirely rather than sending '', so leaving it blank never clobbers the password.
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    })
    success('Vendedor actualizado')
    form.password = ''
    emit('updated')
  } catch (err) {
    error.value = translateError(err)
    showError(error.value)
  } finally {
    saving.value = false
  }
}

const assetsCtx = useEmployeeAssets(toRef(() => props.vendedor.id))
const newAsset = reactive({ assetType: 'vehiculo' as AssetType, description: '' })
const assetTypeLabel = (type: AssetType) => ASSET_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type

const addAsset = () => {
  if (!newAsset.description.trim()) return
  assetsCtx.createMutation.mutate(
    { assetType: newAsset.assetType, description: newAsset.description.trim() },
    { onSuccess: () => { newAsset.description = '' } },
  )
}

const editingAssetId = ref<string | null>(null)
const editDraft = reactive({ assetType: 'vehiculo' as AssetType, description: '' })

const startAssetEdit = (asset: EmployeeAsset) => {
  editingAssetId.value = asset.id
  editDraft.assetType = asset.assetType
  editDraft.description = asset.description
}
const cancelAssetEdit = () => {
  editingAssetId.value = null
}
const saveAssetEdit = (id: string) => {
  if (!editDraft.description.trim()) return
  assetsCtx.updateMutation.mutate(
    { id, assetType: editDraft.assetType, description: editDraft.description.trim() },
    { onSuccess: () => { editingAssetId.value = null } },
  )
}

const confirmDelete = () => {
  const msg = `¿Eliminar a "${props.vendedor.name}"?\n\nEl vendedor perderá el acceso al sistema. Esta acción no se puede deshacer.`
  if (!window.confirm(msg)) return
  deleteEmpleado(props.vendedor.id)
    .then(() => {
      success('Vendedor eliminado')
      emit('deleted')
      emit('close')
    })
    .catch((err) => showError(translateError(err)))
}
</script>
