<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? 'Editar sucursal' : 'Nueva sucursal'"
    :subtitle="isEditing ? 'Modifica los datos de la sucursal' : 'Agrega una nueva ubicación física'"
    icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    size="sm"
    :is-confirm-disabled="!form.name.trim() || saveMutation.isPending.value"
    confirm-text="Guardar"
    @close="$emit('close')"
    @confirm="$emit('save')"
  >
    <form class="space-y-4" @submit.prevent="$emit('save')">
      <div>
        <label class="mb-1 block text-sm font-medium text-text" for="branch-name">Nombre</label>
        <input
          id="branch-name"
          v-model="form.name"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="Ej: Salón Bella Vista"
          required
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-text" for="branch-address">Dirección</label>
        <input
          id="branch-address"
          v-model="form.address"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="Calle, número, ciudad"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-text" for="branch-phone">Teléfono</label>
        <input
          id="branch-phone"
          v-model="form.phone"
          type="tel"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="+58 414 123 4567"
        />
      </div>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          v-model="form.isDefault"
          type="checkbox"
          class="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <span class="text-sm text-text">Sucursal principal</span>
      </label>
      <p v-if="saveError" class="text-sm text-danger">{{ saveError }}</p>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ModalBase } from '../common'
import type { BranchFormData } from '../../services/branchesService'

defineProps<{
  isOpen: boolean
  isEditing: boolean
  form: BranchFormData
  saveError: string
  saveMutation: { isPending: { value: boolean } }
}>()

defineEmits<{
  close: []
  save: []
}>()
</script>
