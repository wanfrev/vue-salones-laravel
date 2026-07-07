<template>
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <RouteLoader />
        </template>
      </Suspense>
    </template>
  </RouterView>
  <NotificationToast />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import NotificationToast from './components/common/NotificationToast.vue'
import RouteLoader from './components/common/RouteLoader.vue'
</script>
