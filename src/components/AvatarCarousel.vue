<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  avatars: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Carousel state
const scrollContainer = ref(null)
const currentIndex = ref(0)

// Avatar items with proper wrapping for circular scrolling
const extendedAvatars = computed(() => {
  if (props.avatars.length <= 3) return props.avatars
  return [
    props.avatars[props.avatars.length - 1],
    ...props.avatars,
    props.avatars[0],
    props.avatars[1]
  ]
})

// Get the selected avatar - accounting for the extended array
const selectedAvatarIndex = computed(() => {
  if (props.avatars.length <= 3) {
    return props.modelValue ? props.avatars.findIndex(a => a.id === props.modelValue) : 0
  }
  // In extended mode, add 1 because we prepended one item
  return (props.avatars.findIndex(a => a.id === props.modelValue) ?? 0) + 1
})

const visibleAvatars = computed(() => {
  const start = Math.max(0, selectedAvatarIndex.value - 1)
  const end = Math.min(extendedAvatars.value.length, selectedAvatarIndex.value + 2)
  return extendedAvatars.value.slice(start, end)
})

function handleScroll(direction) {
  if (direction === 'left') {
    currentIndex.value = (currentIndex.value - 1 + props.avatars.length) % props.avatars.length
  } else {
    currentIndex.value = (currentIndex.value + 1) % props.avatars.length
  }
  const avatar = props.avatars[currentIndex.value]
  emit('update:modelValue', avatar.id)
}

function selectAvatar(avatar) {
  const index = props.avatars.findIndex(a => a.id === avatar.id)
  if (index !== -1) {
    currentIndex.value = index
    emit('update:modelValue', avatar.id)
  }
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-sm font-bold text-paragon-light uppercase tracking-widest">Choose Your Avatar</h3>
    
    <div class="flex items-center justify-between gap-4">
      <!-- Left Arrow -->
      <button
        @click="handleScroll('left')"
        class="p-2 rounded-xl bg-dark-surface-hover border border-dark-border hover:border-paragon-light/30 text-paragon-light transition-all flex-shrink-0"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>

      <!-- Avatar Carousel Container -->
      <div class="flex-1 overflow-hidden">
        <div class="flex gap-4 justify-center">
          <div
            v-for="(avatar, idx) in visibleAvatars"
            :key="`${avatar.id}-${idx}`"
            @click="selectAvatar(avatar)"
            class="flex-shrink-0 transition-all duration-300"
            :class="avatar.id === modelValue ? 'scale-125 z-10' : 'scale-75 opacity-50'"
          >
            <div
              class="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl font-bold cursor-pointer transition-all"
              :class="avatar.id === modelValue
                ? 'bg-gradient-to-br from-paragon-medium to-paragon-dark ring-2 ring-paragon-light shadow-lg shadow-paragon-medium/50'
                : 'bg-dark-surface-hover border border-dark-border hover:border-paragon-light/30'
              "
            >
              {{ avatar.emoji }}
            </div>
            <p class="text-xs font-bold text-dark-text-secondary text-center mt-2">
              {{ avatar.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Right Arrow -->
      <button
        @click="handleScroll('right')"
        class="p-2 rounded-xl bg-dark-surface-hover border border-dark-border hover:border-paragon-light/30 text-paragon-light transition-all flex-shrink-0"
      >
        <ChevronRight class="w-5 h-5" />
      </button>
    </div>

    <!-- Indicator Dots -->
    <div class="flex justify-center gap-2">
      <button
        v-for="(avatar, idx) in avatars"
        :key="avatar.id"
        @click="selectAvatar(avatar)"
        class="w-2 h-2 rounded-full transition-all"
        :class="avatar.id === modelValue
          ? 'bg-paragon-light w-6'
          : 'bg-dark-border hover:bg-dark-text-secondary'
        "
      />
    </div>
  </div>
</template>
