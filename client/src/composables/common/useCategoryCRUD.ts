import { ref, computed, type Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import {
  renameBusinessCategory,
  deleteBusinessCategory,
  serviciosKeys,
} from '../../services/serviciosService'
import type { Business } from '../../types/database'

interface UseCategoryCRUDParams<T extends { category: string }> {
  businessId: Ref<string | null>
  services: Ref<T[]>
  businessStore: { updateBusiness: (data: Partial<Business>) => void; serviceCategories: string[] }
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
  extraInvalidations?: Array<() => ReadonlyArray<string | null | undefined>>
}

export function useCategoryCRUD<T extends { category: string }>(params: UseCategoryCRUDParams<T>) {
  const {
    businessId,
    services,
    businessStore,
    success,
    error,
    warning: showWarning,
    extraInvalidations,
  } = params

  const queryClient = useQueryClient()

  const isUpdatingCategory = ref(false)
  const activeCategory = ref('all')
  const categoryToEdit = ref('')
  const newCategoryName = ref('')
  const isRenameCategoryOpen = ref(false)
  const categoryToDelete = ref('')
  const replacementCategory = ref('')
  const isDeleteCategoryOpen = ref(false)

  const categories = computed(() => {
    const serviceCats = services.value.map(s => s.category).filter(Boolean)
    const bizCats = (businessStore.serviceCategories ?? []).map(c =>
      typeof c === 'string' ? c : (c as any)?.name ?? ''
    ).filter(Boolean)
    const unique = Array.from(new Set([...bizCats, ...serviceCats]))
    return [{ id: 'all', name: 'Todos' }, ...unique.map(cat => ({ id: cat, name: cat }))]
  })

  const deleteCategoryOptions = computed(() =>
    categories.value.filter(item => item.id !== 'all' && item.id !== categoryToDelete.value)
  )

  const filteredByCategory = computed(() => {
    if (activeCategory.value === 'all') return services.value
    return services.value.filter(s => s.category === activeCategory.value)
  })

  async function invalidateCategoryQueries(bid: string) {
    const promises = [
      queryClient.invalidateQueries({ exact: false, queryKey: serviciosKeys.all(bid) }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['business', bid] }),
    ]
    if (extraInvalidations) {
      for (const keyFn of extraInvalidations) {
        promises.push(queryClient.invalidateQueries({ exact: false, queryKey: keyFn() as string[] }))
      }
    }
    await Promise.allSettled(promises)
    await queryClient.refetchQueries({ exact: false, queryKey: serviciosKeys.all(bid) })
  }

  function openRenameCategoryModal(cat: string) {
    categoryToEdit.value = cat
    newCategoryName.value = cat
    isRenameCategoryOpen.value = true
  }

  function closeRenameCategoryModal() {
    isRenameCategoryOpen.value = false
    categoryToEdit.value = ''
    newCategoryName.value = ''
  }

  async function confirmRenameCategory() {
    const bid = businessId.value
    if (!bid) return
    const cur = categoryToEdit.value
    const next = newCategoryName.value.trim()
    if (!cur || !next || next === cur) { closeRenameCategoryModal(); return }
    try {
      isUpdatingCategory.value = true
      const updated = await renameBusinessCategory(bid, cur, next)
      businessStore.updateBusiness({ service_categories: updated })
      await invalidateCategoryQueries(bid)
      activeCategory.value = next
      closeRenameCategoryModal()
      success('Categoría actualizada')
    } catch (err) {
      console.error(err)
      error('No se pudo actualizar la categoría')
    } finally {
      isUpdatingCategory.value = false
    }
  }

  function openDeleteCategoryModal(cat: string) {
    categoryToDelete.value = cat
    replacementCategory.value = ''
    isDeleteCategoryOpen.value = true
  }

  function closeDeleteCategoryModal() {
    isDeleteCategoryOpen.value = false
    categoryToDelete.value = ''
    replacementCategory.value = ''
  }

  async function confirmDeleteCategory() {
    const bid = businessId.value
    if (!bid) return
    const cat = categoryToDelete.value
    const repl = replacementCategory.value.trim() || undefined
    if (!cat) { closeDeleteCategoryModal(); return }
    try {
      isUpdatingCategory.value = true
      const updated = await deleteBusinessCategory(bid, cat, repl)
      businessStore.updateBusiness({ service_categories: updated })
      await invalidateCategoryQueries(bid)
      if (activeCategory.value === cat) activeCategory.value = 'all'
      closeDeleteCategoryModal()
      success('Categoría eliminada')
    } catch (err) {
      console.error(err)
      error('No se pudo eliminar la categoría')
    } finally {
      isUpdatingCategory.value = false
    }
  }

  return {
    isUpdatingCategory,
    activeCategory,
    categoryToEdit,
    newCategoryName,
    isRenameCategoryOpen,
    categoryToDelete,
    replacementCategory,
    isDeleteCategoryOpen,
    categories,
    deleteCategoryOptions,
    filteredByCategory,
    openRenameCategoryModal,
    closeRenameCategoryModal,
    confirmRenameCategory,
    openDeleteCategoryModal,
    closeDeleteCategoryModal,
    confirmDeleteCategory,
    invalidateCategoryQueries,
  }
}
