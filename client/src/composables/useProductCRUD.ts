import { ref, computed } from 'vue'
import { useCrud } from './useCrud'
import { useAuth } from './useAuth'
import { useCurrency } from './useCurrency'
import { useBusinessStore } from '../store/business'
import { listProductos, productosKeys, saveProducto, deleteProducto, deleteProductoPermanently } from '../services/productosService'
import { posKeys } from '../services/posService'
import type { Producto, ProductoFormData } from '../types/producto'

export function useProductCRUD() {
  const { authStore } = useAuth()
  const { formatUSD, formatVESInline } = useCurrency()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const productoModalRef = ref<{ open: (data?: any) => void; close: () => void } | null>(null)

  const crud = useCrud<Producto, ProductoFormData>({
    businessId,
    branchId,
    queryKey: (id, brId) => productosKeys.all(id, brId),
    queryFn: (id, brId) => listProductos(id, brId),
    saveFn: (id, data, brId) => saveProducto(id, data, brId),
    deleteFn: (id) => deleteProducto(id),
    entityName: 'Producto',
    modalRef: productoModalRef,
    extraInvalidations: [
      (id, brId) => ['inventario', id, brId],
      (id, brId) => posKeys.products(id, brId),
    ],
  })

  const totalProductos = computed(() => crud.items.value.filter(p => p.status === 'Activo').length)
  const totalCategorias = computed(() => {
    const cats = new Set(crud.items.value.map(p => p.categoryName).filter(Boolean))
    return cats.size
  })
  const stockBajo = computed(() => crud.items.value.filter(p => p.stockTotal <= p.reorderPoint && p.status === 'Activo').length)
  const valorInventarioNumerico = computed(() =>
    crud.items.value.reduce((sum, p) => sum + p.unitCost * p.stockTotal, 0)
  )
  const valorUSD = computed(() => formatUSD(valorInventarioNumerico.value))
  const valorVES = computed(() => formatVESInline(valorInventarioNumerico.value))

  const searchQuery = ref('')
  const activeTab = ref('todos')

  const filteredProductos = computed(() => {
    let result = crud.items.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    }
    if (activeTab.value === 'activos') result = result.filter(p => p.status === 'Activo')
    if (activeTab.value === 'inactivos') result = result.filter(p => p.status === 'Inactivo')
    return result
  })

  const isDeleteModalOpen = ref(false)
  const productoToDelete = ref<Producto | null>(null)

  const openDeleteModal = (producto: Producto) => {
    productoToDelete.value = producto
    isDeleteModalOpen.value = true
  }

  const closeDeleteModal = () => {
    isDeleteModalOpen.value = false
    productoToDelete.value = null
  }

  const confirmDelete = async () => {
    if (!productoToDelete.value) return
    await crud.deleteMutation!.mutateAsync(productoToDelete.value.id)
    productoToDelete.value = null
    isDeleteModalOpen.value = false
  }

  const isPermanentDeleteModalOpen = ref(false)
  const productoToDeletePermanently = ref<Producto | null>(null)
  const isPermanentDeleting = ref(false)

  const openPermanentDeleteModal = (producto: Producto) => {
    productoToDeletePermanently.value = producto
    isPermanentDeleteModalOpen.value = true
  }

  const closePermanentDeleteModal = () => {
    isPermanentDeleteModalOpen.value = false
    productoToDeletePermanently.value = null
  }

  const confirmPermanentDelete = async () => {
    if (!productoToDeletePermanently.value) return
    isPermanentDeleting.value = true
    try {
      await deleteProductoPermanently(productoToDeletePermanently.value.id)
      productoToDeletePermanently.value = null
      isPermanentDeleteModalOpen.value = false
      await crud.invalidateAll()
    } finally {
      isPermanentDeleting.value = false
    }
  }

  return {
    productoModalRef,
    productos: crud.items,
    saveProductoMutation: crud.saveMutation,
    deleteMutation: crud.deleteMutation,
    handleSaveProducto: crud.handleSave,
    totalProductos,
    totalCategorias,
    stockBajo,
    valorUSD,
    valorVES,
    searchQuery,
    activeTab,
    filteredProductos,
    isDeleteModalOpen,
    productoToDelete,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    isPermanentDeleteModalOpen,
    productoToDeletePermanently,
    isPermanentDeleting,
    openPermanentDeleteModal,
    closePermanentDeleteModal,
    confirmPermanentDelete,
    formatUSD,
    formatVESInline,
  }
}
