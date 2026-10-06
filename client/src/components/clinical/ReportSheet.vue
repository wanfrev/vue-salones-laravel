<template>
  <!-- Hoja tipo carta: fondo blanco y texto negro a propósito (se imprime/guarda como PDF), aunque la app esté en modo oscuro. -->
  <article class="report-sheet mx-auto w-full max-w-[44rem] rounded-lg bg-white p-8 text-[#111] shadow-lg ring-1 ring-black/10 sm:p-12">
    <header class="mb-8 border-b border-black/20 pb-4 text-center">
      <p v-if="businessName" class="text-sm font-bold uppercase tracking-[0.18em]">{{ businessName }}</p>
      <h2 class="mt-3 text-lg font-bold uppercase tracking-wide">{{ title }}</h2>
    </header>

    <div class="space-y-4 text-[13px] leading-6">
      <section v-for="(block, i) in blocks" :key="i">
        <p v-if="block.heading" class="pt-2 text-[12px] font-bold uppercase tracking-wider">{{ block.heading }}</p>
        <p v-if="block.text" class="whitespace-pre-line text-justify" :class="block.heading ? 'mt-1' : ''">{{ block.text }}</p>
        <!-- Encabezado sin texto (p. ej. RECOMENDACIONES): deja espacio para escribir a mano. -->
        <div v-else-if="block.heading" class="h-16"></div>
      </section>
    </div>

    <footer class="mt-14 text-[13px]">
      <p v-if="city || dateText" class="mb-14">{{ [city, dateText].filter(Boolean).join(', ') }}</p>
      <div class="w-64 border-t border-black pt-1">
        <p class="font-semibold">{{ professionalName || ' ' }}</p>
        <p v-if="license" class="text-[12px]">{{ license }}</p>
        <p class="text-[12px]">Firma y sello</p>
      </div>
      <p class="mt-8 text-[11px] italic text-black/60">Documento confidencial. Su contenido es para uso exclusivo del destinatario.</p>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  body: string
  businessName: string
  professionalName: string
  /** Línea libre bajo el nombre: título profesional y N.º de colegiado/matrícula. */
  license: string
  city: string
  dateText: string
}>()

// Los borradores generan bloques "ENCABEZADO EN MAYÚSCULAS\ncuerpo" separados por una línea en blanco:
// la primera línea en mayúsculas se pinta como encabezado de sección y el resto como texto.
const isHeadingLine = (line: string) => /^[A-ZÁÉÍÓÚÑ0-9 .,()/-]{4,}$/.test(line)

const blocks = computed(() =>
  props.body
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const [first, ...rest] = p.split('\n')
      return isHeadingLine(first) ? { heading: first, text: rest.join('\n').trim() } : { heading: '', text: p }
    }),
)
</script>

<style>
@media print {
  @page { margin: 18mm; }
  body * { visibility: hidden !important; }
  .report-sheet, .report-sheet * { visibility: visible !important; }
  .report-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
    --tw-ring-shadow: 0 0 #0000;
  }
}
</style>
