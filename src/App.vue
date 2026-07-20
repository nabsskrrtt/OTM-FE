<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-paragon-light/30 selection:text-paragon-dark">
    <!-- Corporate Top Branding Bar -->
    <header class="bg-paragon-dark text-white border-b border-white/10 shadow-lg">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-paragon-dark font-extrabold text-xl shadow-inner">
            P
          </div>
          <div>
            <h1 class="font-extrabold tracking-wider text-base md:text-lg uppercase">Paragon ETRM</h1>
            <span class="text-[10px] md:text-xs text-slate-400 font-medium tracking-wide">OWN THE MORNING SYSTEM</span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
