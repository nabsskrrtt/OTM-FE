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
    <!-- Premium Dark Mode Navbar -->
    <header class="bg-gradient-to-r from-paragon-dark via-paragon-dark to-paragon-medium text-white border-b border-paragon-light/10 shadow-2xl">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <!-- Logo Container -->
          <div class="relative">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-paragon-ice to-paragon-light flex items-center justify-center text-paragon-dark font-extrabold text-2xl shadow-lg shadow-paragon-light/20 hover:scale-105 transition-transform">
              P
            </div>
            <div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
          </div>
          <div>
            <h1 class="font-extrabold tracking-wider text-lg md:text-xl uppercase bg-clip-text text-transparent bg-gradient-to-r from-paragon-ice to-white">OTM</h1>
            <span class="text-[9px] md:text-xs text-paragon-light/60 font-bold tracking-widest">OWN THE MORNING</span>
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
              <span class="text-xs font-bold text-paragon-ice tracking-wide">{{ loggedInUser.name }}</span>
            </div>
            <div 
              v-else-if="isAdmin" 
              key="admin"
              class="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10 shadow-lg hover:bg-white/15 transition-all"
            >
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span class="text-xs font-bold text-paragon-ice tracking-wide">Admin / PIC</span>
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
