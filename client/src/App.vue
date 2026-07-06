<template>
  <RouterView />
  <NotificationToast />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import NotificationToast from './components/common/NotificationToast.vue'
</script>
