<template>
  <div class="space-y-6 animate-pulse">
    <slot>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="'sk-' + i" class="rounded-xl border border-zinc-800 bg-[#161619] p-4 flex items-center gap-4">
          <div class="h-10 w-10 rounded-lg bg-zinc-800" />
          <div class="space-y-2 flex-1">
            <div class="h-3 w-1/3 bg-zinc-800 rounded" />
            <div class="h-5 w-1/2 bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    </slot>
  </div>
</template>
