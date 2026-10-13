<template>
  <div>
    <p class="text-sm font-semibold text-text">Mi firma</p>
    <p class="text-xs text-text-muted">
      Dibújala una vez. Se estampa en las nóminas que apruebes (impresa y XLSX). Cambiarla después no altera las semanas ya aprobadas.
    </p>

    <div v-if="isLoading" class="mt-3 text-xs text-text-muted">Cargando...</div>

    <template v-else>
      <div v-if="!editing" class="mt-3 flex flex-wrap items-center gap-3">
        <img v-if="signature" :src="signature" alt="Mi firma" class="h-16 rounded-lg border border-border bg-white p-1" />
        <p v-else class="text-xs text-text-muted">Todavía no has guardado tu firma.</p>
        <button type="button"
          class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="startEditing">
          {{ signature ? 'Cambiar firma' : 'Dibujar firma' }}
        </button>
        <button v-if="signature" type="button" :disabled="removing"
          class="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10 disabled:opacity-60"
          @click="remove">
          Eliminar
        </button>
      </div>

      <div v-else class="mt-3 max-w-md">
        <SignaturePad v-model="drawn" />
        <div class="mt-2 flex gap-2">
          <button type="button" :disabled="!drawn || saving"
            class="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            @click="save">
            {{ saving ? 'Guardando...' : 'Guardar firma' }}
          </button>
          <button type="button"
            class="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            @click="editing = false">
            Cancelar
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import SignaturePad from '../dental/SignaturePad.vue'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { deleteMySignature, getMySignature, saveMySignature, signatureKeys } from '../../services/staffing/signatureService'

const props = defineProps<{ businessId: string | null }>()

const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const queryKey = computed(() => signatureKeys.mine(props.businessId))
const { data: signature, isLoading } = useQuery({
  queryKey,
  queryFn: getMySignature,
  enabled: computed(() => !!props.businessId),
  staleTime: 0,
})

const editing = ref(false)
const drawn = ref<string | null>(null)

const startEditing = () => {
  drawn.value = null
  editing.value = true
}

const saveMutation = useMutation({
  mutationFn: (image: string) => saveMySignature(image),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['staffing-my-signature'], exact: false })
    editing.value = false
    success('Firma guardada')
  },
  onError: (err) => showError(translateError(err, 'No se pudo guardar la firma.')),
})
const saving = computed(() => saveMutation.isPending.value)
const save = () => { if (drawn.value) saveMutation.mutate(drawn.value) }

const removeMutation = useMutation({
  mutationFn: deleteMySignature,
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['staffing-my-signature'], exact: false })
    success('Firma eliminada')
  },
  onError: (err) => showError(translateError(err, 'No se pudo eliminar la firma.')),
})
const removing = computed(() => removeMutation.isPending.value)
const remove = () => {
  if (window.confirm('¿Eliminar tu firma? Las nóminas ya aprobadas conservan la firma con la que se aprobaron.')) removeMutation.mutate()
}
</script>
