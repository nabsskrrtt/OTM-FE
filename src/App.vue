<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const loggedInUser = ref(null)
const isAdmin = ref(false)

function updateUserState() {
  const saved = localStorage.getItem('otm_participant')
  if (saved) {
    try {
      loggedInUser.value = JSON.parse(saved)
    } catch (e) {
      loggedInUser.value = null
    }
  } else {
    loggedInUser.value = null
  }
  isAdmin.value = !!localStorage.getItem('otm_admin_token')
}

watch(() => route.path, () => {
  updateUserState()
}, { immediate: true })
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

        <!-- Logged-in User/Role Tag Banner -->
        <div class="flex items-center space-x-3 flex-shrink-0">
          <transition name="fade" mode="out-in">
            <div 
              v-if="loggedInUser" 
              :key="loggedInUser.id"
              class="flex items-center space-x-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 shadow-inner animate-fade-in"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-bold text-slate-200 tracking-wide">{{ loggedInUser.name }}</span>
            </div>
            <div 
              v-else-if="isAdmin" 
              key="admin"
              class="flex items-center space-x-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 shadow-inner animate-fade-in"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span class="text-xs font-bold text-slate-200 tracking-wide">Administrator / PIC</span>
            </div>
          </transition>
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
