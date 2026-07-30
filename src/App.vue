<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Sun, Moon } from 'lucide-vue-next'

const route = useRoute()
const loggedInUser = ref(null)
const isAdmin = ref(false)
const isDayMode = ref(localStorage.getItem('otm_theme') === 'day')

function toggleTheme() {
  isDayMode.value = !isDayMode.value
  if (isDayMode.value) {
    document.documentElement.classList.add('day-mode')
    localStorage.setItem('otm_theme', 'day')
  } else {
    document.documentElement.classList.remove('day-mode')
    localStorage.setItem('otm_theme', 'dark')
  }
}

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

// Initial theme apply
if (isDayMode.value) {
  document.documentElement.classList.add('day-mode')
} else {
  document.documentElement.classList.remove('day-mode')
}

watch(() => route.path, () => {
  updateUserState()
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-dark-bg text-dark-text antialiased selection:bg-paragon-medium/30 selection:text-paragon-ice">
    <!-- Premium Day/Dark Mode Navbar with Glassmorphism -->
    <header class="glass sticky top-0 z-50 text-dark-text border-b border-paragon-light/10">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <!-- Logo Triangle Mark Wrapper with fixed dimensions to prevent layout shift -->
          <div class="relative group w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img :src="isDayMode ? '/paragon-mark-blue.png' : '/paragon-mark.png'" alt="Paragon" class="h-10 w-auto max-w-full object-contain hover:scale-110 transition-transform duration-300" :class="isDayMode ? '' : 'filter brightness-0 invert'" />
            <div class="absolute inset-0 bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
          </div>
          <div>
            <h1 class="font-black tracking-wider text-base md:text-lg bg-clip-text text-transparent bg-gradient-to-r drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" :class="isDayMode ? 'from-paragon-medium via-paragon-dark to-paragon-medium' : 'from-accent-cyan via-paragon-light to-paragon-ice'">Own The Morning</h1>
            <span class="text-[8px] md:text-[9px] text-accent-cyan font-bold tracking-widest block leading-none">ETRM</span>
          </div>
        </div>

        <!-- Logged-in User/Role Tag Banner & Theme Toggle -->
        <div class="flex items-center space-x-3 flex-shrink-0">
          <!-- Glassmorphic sliding theme toggle switch -->
          <button 
            @click="toggleTheme"
            class="relative w-16 h-8 rounded-full bg-black/20 dark:bg-white/10 backdrop-blur border border-dark-border cursor-pointer transition-all duration-300 p-1 flex items-center justify-between shadow-inner mr-1 flex-shrink-0"
            title="Ubah Tema (Day/Dark)"
          >
            <!-- Background Icons -->
            <Sun class="w-3.5 h-3.5 text-amber-500/60 ml-1.5 select-none pointer-events-none" />
            <Moon class="w-3.5 h-3.5 text-paragon-medium/60 mr-1.5 select-none pointer-events-none" />

            <!-- Sliding Glass Knob -->
            <div 
              class="absolute top-[3px] left-[3px] w-6 h-6 rounded-full bg-white/20 dark:bg-white/30 backdrop-blur border border-white/40 dark:border-white/30 shadow-md flex items-center justify-center transition-transform duration-300 ease-out"
              :style="{ transform: isDayMode ? 'translateX(0px)' : 'translateX(34px)' }"
            >
              <Sun v-if="isDayMode" class="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
              <Moon v-else class="w-3.5 h-3.5 text-paragon-ice fill-paragon-ice/30" />
            </div>
          </button>

          <transition name="fade" mode="out-in">
            <div 
              v-if="loggedInUser" 
              :key="loggedInUser.id"
              class="flex items-center space-x-2 bg-dark-surface-hover px-4 py-2 rounded-full border border-dark-border shadow-lg hover:bg-dark-surface transition-all"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-bold text-dark-text tracking-wide">{{ loggedInUser.name }} • Participant</span>
            </div>
            <div 
              v-else-if="isAdmin" 
              key="admin"
              class="flex items-center space-x-2 bg-dark-surface-hover px-4 py-2 rounded-full border border-dark-border shadow-lg hover:bg-dark-surface transition-all"
            >
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span class="text-xs font-bold text-dark-text tracking-wide">Administrator</span>
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
