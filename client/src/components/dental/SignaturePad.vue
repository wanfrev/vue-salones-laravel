<template>
  <div>
    <canvas
      ref="canvasRef"
      width="500"
      height="180"
      class="w-full touch-none rounded-lg border border-border bg-white"
      style="touch-action: none;"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    />
    <div class="mt-2 flex items-center justify-between">
      <p class="text-xs text-text-muted">Firme dentro del recuadro</p>
      <button type="button" class="text-xs font-medium text-text-secondary hover:underline" @click="clear">
        Limpiar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const drawing = ref(false)
const hasDrawn = ref(false)

function getContext(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') ?? null
}

function setupCanvas() {
  const ctx = getContext()
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function pointerPos(e: PointerEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function onPointerDown(e: PointerEvent) {
  const ctx = getContext()
  if (!ctx) return
  drawing.value = true
  const { x, y } = pointerPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function onPointerMove(e: PointerEvent) {
  if (!drawing.value) return
  const ctx = getContext()
  if (!ctx) return
  const { x, y } = pointerPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  hasDrawn.value = true
}

function onPointerUp() {
  if (!drawing.value) return
  drawing.value = false
  if (hasDrawn.value) {
    emit('update:modelValue', canvasRef.value!.toDataURL('image/png'))
  }
}

function clear() {
  setupCanvas()
  hasDrawn.value = false
  emit('update:modelValue', null)
}

onMounted(setupCanvas)

defineExpose({ clear })
</script>
