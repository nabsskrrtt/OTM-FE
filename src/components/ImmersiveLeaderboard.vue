<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  leaderboard: Array,
  currentParticipantId: [Number, String],
  disableAudio: {
    type: Boolean,
    default: false
  },
  hideOthers: {
    type: Boolean,
    default: false
  },
  revealAnimation: {
    type: Boolean,
    default: false
  }
})

let leaderboardAudio = null

const isNotInTopThree = computed(() => {
  if (!props.currentParticipantId || !props.leaderboard) return false
  const idx = props.leaderboard.findIndex(p => p.participant_id == props.currentParticipantId || p.id == props.currentParticipantId)
  return idx >= 3
})

const myRow = computed(() => {
  if (!props.currentParticipantId || !props.leaderboard) return null
  const idx = props.leaderboard.findIndex(p => p.participant_id == props.currentParticipantId || p.id == props.currentParticipantId)
  if (idx >= 3) {
    return {
      rank: idx + 1,
      participant: props.leaderboard[idx]
    }
  }
  return null
})

const avatarFilenames = {
  1: 'panda.png',
  2: 'penguin.png',
  3: 'bee.png',
  4: 'monkey.png',
  5: 'fox.png'
}

import { soundEffects } from '../utils/soundEffects'

let ambientInstance = null
const revealedIndex = ref(props.revealAnimation ? 3 : 0) // 3 = none, 2 = 3rd, 1 = 2nd, 0 = all

onMounted(() => {
  if (props.revealAnimation) {
    // 1. Reveal 3rd place after 1.5s
    setTimeout(() => {
      if (props.leaderboard && props.leaderboard[2]) {
        revealedIndex.value = 2
        if (!props.disableAudio) soundEffects.podiumReveal(3)
      } else {
        revealedIndex.value = 1
      }
      
      // 2. Reveal 2nd place after 4.2s (2.7s after 3rd)
      setTimeout(() => {
        if (props.leaderboard && props.leaderboard[1]) {
          revealedIndex.value = 1
          if (!props.disableAudio) soundEffects.podiumReveal(2)
        } else {
          revealedIndex.value = 0
        }
        
        // 3. Reveal 1st place after 7.0s (2.8s after 2nd)
        setTimeout(() => {
          revealedIndex.value = 0
          if (!props.disableAudio) soundEffects.epicVictory()
        }, 2800)
      }, 2700)
    }, 1500)
  }

  if (props.disableAudio) return
  try {
    ambientInstance = soundEffects.leaderboardAmbience()
  } catch (e) {
    console.log('[v0] Leaderboard audio unavailable')
  }
})

onUnmounted(() => {
  if (ambientInstance) {
    ambientInstance.pause()
    ambientInstance = null
  }
})

const getAvatarFileName = (participant) => {
  if (!participant) return 'panda.png'
  if (participant.avatar_id && avatarFilenames[participant.avatar_id]) {
    return avatarFilenames[participant.avatar_id]
  }
  if (participant.avatar?.filename) {
    return participant.avatar.filename
  }
  if (participant.avatar?.id && avatarFilenames[participant.avatar.id]) {
    return avatarFilenames[participant.avatar.id]
  }
  return 'panda.png' // default
}
</script>

<template>
  <div class="space-y-8">
    <!-- Podium Top 3 Layout -->
    <div class="grid grid-cols-3 gap-3 items-end pt-6 pb-8 max-w-md mx-auto min-h-[220px]">
      <!-- 2nd Place -->
      <div class="flex flex-col items-center">
        <div v-if="leaderboard[1]">
          <!-- Revealed State -->
          <div v-if="revealedIndex <= 1" class="flex flex-col items-center animate-[bounce_0.8s_ease-out_1] transform scale-100 opacity-100 transition-all duration-500">
            <div class="relative mb-3">
              <div class="w-12 h-12 rounded-full bg-gray-600 border-2 border-gray-400 overflow-hidden shadow-lg">
                <img
                  :src="`/assets/avatars/${getAvatarFileName(leaderboard[1])}`"
                  :alt="leaderboard[1].name"
                  class="w-full h-full object-cover"
                />
              </div>
            </div>
            <div class="text-xs font-bold text-paragon-light/70 truncate w-full max-w-20 text-center">{{ leaderboard[1]?.name || 'Peserta' }}</div>
            <div class="text-xs font-black text-paragon-ice mt-1">{{ leaderboard[1]?.current_score || leaderboard[1]?.total_score || 0 }}⭐</div>
          </div>
          <!-- Hidden State Placeholder -->
          <div v-else class="flex flex-col items-center opacity-30 select-none">
            <div class="w-12 h-12 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 font-black text-sm mb-3">
              ?
            </div>
            <div class="text-[10px] font-bold text-slate-600 truncate w-max">Menunggu...</div>
            <div class="text-xs font-black text-slate-600 mt-1">-</div>
          </div>
        </div>
        <!-- Growing Pedestal Bar -->
        <div 
          v-if="leaderboard[1]"
          class="w-full bg-gradient-to-b from-gray-500 to-gray-700 border border-gray-400 rounded-t-2xl flex items-center justify-center mt-3 shadow-lg relative transition-all duration-700 ease-out"
          :class="revealedIndex <= 1 ? 'h-20 opacity-100' : 'h-0 opacity-0 pointer-events-none'"
        >
          <span class="text-3xl font-black text-white select-none">🥈</span>
        </div>
      </div>

      <!-- 1st Place -->
      <div class="flex flex-col items-center">
        <div v-if="leaderboard[0]">
          <!-- Revealed State -->
          <div v-if="revealedIndex <= 0" class="flex flex-col items-center animate-[bounce_0.8s_ease-out_1] transform scale-100 opacity-100 transition-all duration-500">
            <div class="relative mb-3 animate-float">
              <div class="w-14 h-14 rounded-full bg-amber-500 border-2 border-amber-300 overflow-hidden shadow-2xl glow-cyan">
                <img
                  :src="`/assets/avatars/${getAvatarFileName(leaderboard[0])}`"
                  :alt="leaderboard[0].name"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full opacity-30 blur -z-10 animate-pulse"></div>
            </div>
            <div class="text-xs font-extrabold text-amber-300 truncate w-full max-w-20 text-center">{{ leaderboard[0]?.name || 'Peserta' }}</div>
            <div class="text-sm font-black text-amber-300 mt-1">{{ leaderboard[0]?.current_score || leaderboard[0]?.total_score || 0 }}⭐</div>
          </div>
          <!-- Hidden State Placeholder -->
          <div v-else class="flex flex-col items-center opacity-30 select-none">
            <div class="w-14 h-14 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 font-black text-sm mb-3">
              ?
            </div>
            <div class="text-[10px] font-bold text-slate-600 truncate w-max">Menunggu...</div>
            <div class="text-xs font-black text-slate-600 mt-1">-</div>
          </div>
        </div>
        <!-- Growing Pedestal Bar -->
        <div 
          v-if="leaderboard[0]"
          class="w-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 rounded-t-2xl flex items-center justify-center mt-3 relative shadow-2xl transition-all duration-700 ease-out"
          :class="revealedIndex <= 0 ? 'h-32 opacity-100 shadow-amber-500/30' : 'h-0 opacity-0 pointer-events-none'"
        >
          <span class="text-5xl font-black text-white select-none">🥇</span>
          <span v-if="revealedIndex <= 0" class="absolute -top-4 text-2xl animate-bounce">👑</span>
        </div>
      </div>

      <!-- 3rd Place -->
      <div class="flex flex-col items-center">
        <div v-if="leaderboard[2]">
          <!-- Revealed State -->
          <div v-if="revealedIndex <= 2" class="flex flex-col items-center animate-[bounce_0.8s_ease-out_1] transform scale-100 opacity-100 transition-all duration-500">
            <div class="relative mb-3">
              <div class="w-12 h-12 rounded-full bg-orange-600 border-2 border-orange-400 overflow-hidden shadow-lg">
                <img
                  :src="`/assets/avatars/${getAvatarFileName(leaderboard[2])}`"
                  :alt="leaderboard[2].name"
                  class="w-full h-full object-cover"
                />
              </div>
            </div>
            <div class="text-xs font-bold text-orange-400 truncate w-full max-w-20 text-center">{{ leaderboard[2]?.name || 'Peserta' }}</div>
            <div class="text-xs font-black text-orange-300 mt-1">{{ leaderboard[2]?.current_score || leaderboard[2]?.total_score || 0 }}⭐</div>
          </div>
          <!-- Hidden State Placeholder -->
          <div v-else class="flex flex-col items-center opacity-30 select-none">
            <div class="w-12 h-12 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 font-black text-sm mb-3">
              ?
            </div>
            <div class="text-[10px] font-bold text-slate-600 truncate w-max">Menunggu...</div>
            <div class="text-xs font-black text-slate-600 mt-1">-</div>
          </div>
        </div>
        <!-- Growing Pedestal Bar -->
        <div 
          v-if="leaderboard[2]"
          class="w-full bg-gradient-to-b from-orange-500 to-orange-700 border border-orange-400 rounded-t-2xl flex items-center justify-center mt-3 shadow-lg transition-all duration-700 ease-out"
          :class="revealedIndex <= 2 ? 'h-16 opacity-100' : 'h-0 opacity-0 pointer-events-none'"
        >
          <span class="text-3xl font-black text-white select-none">🥉</span>
        </div>
      </div>
    </div>


    <!-- Pinned "You" row at the bottom (Shown only after 1st place is revealed) -->
    <div v-if="revealedIndex === 0 && isNotInTopThree && myRow" class="pt-4 border-t border-dark-border animate-fade-in">
      <div
        class="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-950/40 via-dark-surface to-cyan-950/40 border-2 border-accent-cyan rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
      >
        <div class="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
          <img
            :src="`/assets/avatars/${getAvatarFileName(myRow.participant)}`"
            :alt="myRow.participant.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="font-extrabold text-white flex-1">
          <span class="text-accent-cyan mr-2">#{{ myRow.rank }}</span>
          <span>{{ myRow.participant.name }}</span>
          <span class="text-[9px] bg-gradient-to-r from-accent-cyan to-paragon-medium text-white px-2 py-0.5 rounded-full font-bold ml-2">⭐ Anda</span>
        </div>
        <div class="font-black text-paragon-light text-sm">{{ myRow.participant.current_score || myRow.participant.total_score }}⭐</div>
      </div>
    </div>
  </div>
</template>
