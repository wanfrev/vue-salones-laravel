<template>
  <SettingsSection :title="section.title" :description="section.description">
    <WhatsAppSettings />
  </SettingsSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBusinessStore } from '../../store/business'
import WhatsAppSettings from './WhatsAppSettings.vue'
import SettingsSection from './SettingsSection.vue'
import { sectionCopy, termsFrom } from './featureCopy'

const businessStore = useBusinessStore()
const section = computed(() => sectionCopy(termsFrom(businessStore.terminology)).whatsapp)
</script>
