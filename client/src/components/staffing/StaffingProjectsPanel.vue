<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { PenIcon, TrashBin2Icon, AddCircleIcon } from '@solar-icons/vue/linear'
import {
  getStaffingProjects,
  createStaffingProject,
  updateStaffingProject,
  deleteStaffingProject,
  staffingCompanyKeys,
  type StaffingProject,
} from '../../services/staffing/staffingService'
import { useNotification } from '../../composables/common/useNotification'
import { useI18n } from '../../i18n'

const props = defineProps<{
  companyId: string
}>()

const { t } = useI18n()
const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const queryKey = computed(() => ['staffing-company-projects', null, props.companyId])

const { data: projects, isLoading } = useQuery({
  queryKey,
  queryFn: () => getStaffingProjects(props.companyId),
})

const invalidate = () => queryClient.invalidateQueries({ queryKey })

const form = ref({
  id: '',
  name: '',
  active: true,
})
const showModal = ref(false)

const openNew = () => {
  form.value = { id: '', name: '', active: true }
  showModal.value = true
}

const openEdit = (p: StaffingProject) => {
  form.value = { id: p.id, name: p.name, active: p.active }
  showModal.value = true
}

const saveMutation = useMutation({
  mutationFn: async () => {
    if (form.value.id) {
      return updateStaffingProject(props.companyId, form.value.id, { name: form.value.name, active: form.value.active })
    }
    return createStaffingProject(props.companyId, { name: form.value.name, active: form.value.active })
  },
  onSuccess: () => {
    invalidate()
    success(t('projects.saved'))
    showModal.value = false
  },
  onError: (err: any) => {
    showError(err.message || t('projects.saveFailed'))
  },
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteStaffingProject(props.companyId, id),
  onSuccess: () => {
    invalidate()
    success(t('projects.deleted'))
  },
  onError: (err: any) => {
    showError(err.message || t('projects.deleteFailed'))
  },
})

const confirmDelete = (p: StaffingProject) => {
  if (confirm(t('projects.confirmDelete', { name: p.name }))) {
    deleteMutation.mutate(p.id)
  }
}
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text">{{ t('projects.title') }}</h3>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/20"
        @click="openNew"
      >
        <AddCircleIcon class="h-4 w-4" />
        <span>{{ t('projects.new') }}</span>
      </button>
    </div>

    <div v-if="isLoading" class="py-4 text-center text-sm text-text-muted">
      {{ t('projects.loading') }}
    </div>
    <div v-else-if="!projects?.length" class="py-4 text-center text-sm text-text-muted">
      {{ t('projects.empty') }}
    </div>
    <div v-else class="space-y-2">
      <div v-for="p in projects" :key="p.id" class="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
        <div>
          <span class="block text-sm font-medium text-text">{{ p.name }}</span>
          <span class="text-xs text-text-muted">{{ p.active ? t('projects.active') : t('projects.inactive') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button :title="t('common.edit')" class="rounded p-1 text-text-muted hover:bg-bg-secondary hover:text-primary" @click="openEdit(p)">
            <PenIcon class="h-4 w-4" />
          </button>
          <button :title="t('common.delete')" class="rounded p-1 text-text-muted hover:bg-danger/10 hover:text-danger" @click="confirmDelete(p)">
            <TrashBin2Icon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showModal = false">
        <div class="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl">
          <h2 class="mb-4 text-lg font-semibold text-text">{{ form.id ? t('projects.edit') : t('projects.new') }}</h2>
          <form @submit.prevent="saveMutation.mutate()" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('projects.name') }}</label>
              <input v-model="form.name" type="text" required class="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                :aria-checked="form.active"
                @click="form.active = !form.active"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2',
                  form.active ? 'bg-primary border-primary' : 'bg-border border-border'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    form.active ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </button>
              <span class="text-sm font-medium text-text">{{ t('projects.isActive') }}</span>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold text-text-muted hover:bg-bg-secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover" :disabled="saveMutation.isPending.value">
                {{ saveMutation.isPending.value ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
