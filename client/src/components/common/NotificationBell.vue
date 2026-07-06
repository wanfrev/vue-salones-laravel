<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="relative rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary"
    >
      <Bell :size="20" />
      <span
        v-if="unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>
    <NotificationDropdown v-if="isOpen" @close="isOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useNotifications } from '../../composables/useNotifications'
import NotificationDropdown from './NotificationDropdown.vue'

const { unreadCount } = useNotifications()
const isOpen = ref(false)

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>
