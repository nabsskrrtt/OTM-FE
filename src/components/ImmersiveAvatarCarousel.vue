<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: Number,
  avatars: Array
})

const emit = defineEmits(['update:modelValue'])

const carouselRef = ref(null)
const scrollPos = ref(0)
const isDragging = ref(false)
const startX = ref(0)

const avatarList = computed(() => props.avatars || [])

const handleScroll = (e) => {
  scrollPos.value = e.target.scrollLeft
}

const handleMouseDown = (e) => {
  isDragging.value = true
  startX.value = e.clientX
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleTouchStart = (e) => {
  isDragging.value = true
  startX.value = e.touches[0].clientX
}

const handleTouchEnd = () => {
  isDragging.value = false
}

const selectAvatar = (avatarId) => {
  emit('update:modelValue', avatarId)
  // Play selection sound
  const audio = new Audio('/assets/sounds/select.mp3')
  audio.volume = 0.5
  audio.play().catch(() => {})
}

const scrollCarousel = (direction) => {
  if (!carouselRef.value) return
  const scrollAmount = 180
  carouselRef.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-4">
      <label class="block text-sm font-bold text-paragon-light">Pilih Avatar Kamu</label>
      <span class="text-xs text-dark-text-secondary">Swipe atau klik untuk memilih</span>
    </div>

    <div class="relative group">
      <!-- Left scroll button -->
      <button
        @click="scrollCarousel('left')"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-paragon-dark to-transparent p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Carousel container -->
      <div
        ref="carouselRef"
        @scroll="handleScroll"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-12 py-2 no-scrollbar"
      >
        <div
          v-for="avatar in avatarList"
          :key="avatar.id"
          class="flex-shrink-0 snap-center"
        >
          <button
            @click="selectAvatar(avatar.id)"
            :class="{
              'ring-4 ring-accent-cyan scale-110': props.modelValue === avatar.id,
              'hover:scale-105': props.modelValue !== avatar.id
            }"
            class="relative w-24 h-24 rounded-full bg-gradient-to-br from-dark-surface to-dark-surface-hover border-2 border-dark-border overflow-hidden transition-all duration-300 shadow-lg hover:glow-cyan"
          >
            <img
              :src="`/assets/avatars/${avatar.filename}`"
              :alt="avatar.name"
              class="w-full h-full object-cover"
            />
            <!-- Selection glow -->
            <div
              v-if="props.modelValue === avatar.id"
              class="absolute inset-0 bg-gradient-to-t from-accent-cyan/30 to-transparent pointer-events-none animate-pulse"
            />
          </button>
          <p class="text-center text-xs font-semibold text-dark-text-secondary mt-2">{{ avatar.name }}</p>
        </div>
      </div>

      <!-- Right scroll button -->
      <button
        @click="scrollCarousel('right')"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-paragon-dark to-transparent p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Indicator dots -->
      <div class="flex justify-center gap-2 mt-4">
        <div
          v-for="(avatar, idx) in avatarList"
          :key="avatar.id"
          :class="props.modelValue === avatar.id ? 'bg-accent-cyan w-6' : 'bg-dark-border w-2'"
          class="h-2 rounded-full transition-all duration-300"
        />
      </div>
    </div>

    <!-- Hidden error message -->
    <div v-if="!props.modelValue" class="text-xs text-red-400 font-semibold mt-3">
      Pilih avatar terlebih dahulu
    </div>

    <!-- Custom no-scrollbar style -->
    <style scoped>
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
    </style>
  </div>
</template>
