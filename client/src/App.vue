<template>
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense @pending="onPending" @resolve="onResolve">
        <component :is="Component" />
        <template #fallback>
          <RouteLoader v-if="showLoader" />
        </template>
      </Suspense>
    </template>
  </RouterView>
  <NotificationToast />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import NotificationToast from './components/common/NotificationToast.vue'
import RouteLoader from './components/common/RouteLoader.vue'

const showLoader = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function onPending() {
  timer = setTimeout(() => { showLoader.value = true }, 200)
}

function onResolve() {
  if (timer) { clearTimeout(timer); timer = null }
  showLoader.value = false
}
</script>
