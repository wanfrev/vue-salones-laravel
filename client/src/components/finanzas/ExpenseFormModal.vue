<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="$emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ isEditing ? 'Editar gasto' : 'Registrar gasto' }}</h2>
          <p class="text-sm text-text-muted">{{ isEditing ? 'Modifica los datos del egreso' : 'Agrega un egreso al negocio' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="$emit('save')">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-name">Concepto</label>
            <input id="exp-name" v-model="form.name" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Renta del local" required />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-category">Categoría</label>
              <select id="exp-category" v-model="form.category"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="Fijos">Fijos</option>
                <option value="Insumos">Insumos</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-amount">Monto</label>
              <input id="exp-amount" v-model.number="form.amount" type="number" min="0" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-currency">Moneda</label>
              <select id="exp-currency" v-model="form.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-date">Fecha</label>
            <input id="exp-date" v-model="form.date" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-notes">Notas</label>
            <textarea id="exp-notes" v-model="form.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional" />
          </div>
          <p v-if="saveError" class="text-sm text-danger">{{ saveError }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="$emit('close')">Cancelar</button>
            <button type="submit" :disabled="isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean
  isEditing: boolean
  form: Record<string, string | number>
  saveError: string
  isSaving: boolean
}>()

defineEmits<{
  close: []
  save: []
}>()
</script>
