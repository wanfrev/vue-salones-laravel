<template>
  <div class="absolute top-0 left-0 right-0 h-[2px] w-full bg-transparent overflow-hidden z-50">
    <div class="h-full bg-[var(--color-primary)] rounded-full animate-infinite-loading" />
  </div>
</template>

<style scoped>
@keyframes loading-slide {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}

.animate-infinite-loading {
  width: 50%;
  animation: loading-slide 1.5s infinite ease-in-out;
}
</style>
