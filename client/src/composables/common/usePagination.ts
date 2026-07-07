import { ref, computed, type Ref } from 'vue'

export interface PaginationOptions<T> {
  data: Ref<T[]>
  pageSize?: number
  initialPage?: number
}

export interface PaginationResult<T> {
  currentPage: Ref<number>
  pageSize: Ref<number>
  totalPages: Ref<number>
  totalItems: Ref<number>
  paginatedData: Ref<T[]>
  paginationStart: Ref<number>
  paginationEnd: Ref<number>
  hasNextPage: Ref<boolean>
  hasPreviousPage: Ref<boolean>
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
  setPageSize: (size: number) => void
  pageNumbers: Ref<(number | string)[]>
}

export function usePagination<T>(options: PaginationOptions<T>): PaginationResult<T> {
  const { data, pageSize: initialPageSize = 10, initialPage = 1 } = options

  const currentPage = ref(initialPage)
  const pageSize = ref(initialPageSize)

  const totalItems = computed(() => data.value.length)
  const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return data.value.slice(start, end)
  })

  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPreviousPage = computed(() => currentPage.value > 1)
  const paginationStart = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
  const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, totalItems.value))

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => {
    if (hasNextPage.value) {
      currentPage.value++
    }
  }

  const previousPage = () => {
    if (hasPreviousPage.value) {
      currentPage.value--
    }
  }

  const firstPage = () => {
    currentPage.value = 1
  }

  const lastPage = () => {
    currentPage.value = totalPages.value
  }

  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
  }

  const pageNumbers = computed(() => {
    const pages: (number | string)[] = []
    const total = totalPages.value
    const current = currentPage.value

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      } else if (current >= total - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = total - 4; i <= total; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      }
    }

    return pages
  })

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    paginationStart,
    paginationEnd,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    pageNumbers,
  }
}
