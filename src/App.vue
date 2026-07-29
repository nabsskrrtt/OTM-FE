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
  <div class="min-h-screen bg-dark-bg text-dark-text antialiased selection:bg-paragon-medium/30 selection:text-paragon-ice">
    <!-- Premium Dark Mode Navbar with Glassmorphism -->
    <header class="glass sticky top-0 z-50 text-white border-b border-paragon-light/10">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <!-- Logo Triangle Mark -->
          <div class="relative group">
            <img src="/paragon-mark.png" alt="Paragon" class="h-10 w-auto object-contain hover:scale-110 transition-transform duration-300 filter brightness-0 invert" />
            <div class="absolute inset-0 bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
          </div>
          <div>
            <h1 class="font-black tracking-wider text-base md:text-lg bg-clip-text text-transparent bg-gradient-to-r from-accent-cyan via-paragon-light to-paragon-ice drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">Own The Morning</h1>
            <span class="text-[8px] md:text-[9px] text-accent-cyan font-bold tracking-widest block leading-none">ETRM</span>
          </div>
        </div>

        <!-- Logged-in User/Role Tag Banner -->
        <div class="flex items-center space-x-3 flex-shrink-0">
          <transition name="fade" mode="out-in">
            <div 
              v-if="loggedInUser" 
              :key="loggedInUser.id"
              class="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10 shadow-lg hover:bg-white/15 transition-all"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-bold text-paragon-ice tracking-wide">{{ loggedInUser.name }} • Participant</span>
            </div>
            <div 
              v-else-if="isAdmin" 
              key="admin"
              class="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10 shadow-lg hover:bg-white/15 transition-all"
            >
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span class="text-xs font-bold text-paragon-ice tracking-wide">Administrator</span>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-8 md:py-12">
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
