<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Award, Play, History, UserCheck, HelpCircle, X, Trophy } from 'lucide-vue-next'
import AvatarCarousel from '../components/AvatarCarousel.vue'

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = `${API_HOST}/api`

// Avatar options
const avatarOptions = [
  { id: 1, emoji: '🦸', name: 'Hero' },
  { id: 2, emoji: '🚀', name: 'Rocket' },
  { id: 3, emoji: '⭐', name: 'Star' },
  { id: 4, emoji: '🎯', name: 'Target' },
  { id: 5, emoji: '🔥', name: 'Fire' },
  { id: 6, emoji: '💎', name: 'Diamond' },
  { id: 7, emoji: '🌟', name: 'Sparkle' },
  { id: 8, emoji: '⚡', name: 'Lightning' }
]

// State
const participantsList = ref([])
const selectedParticipantId = ref('')
const selectedAvatarId = ref(null)
const adminPin = ref('')
const currentParticipant = ref(null)
const personalHistory = ref([])
const activeSession = ref(null)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
let sessionPoller = null

// Modal leaderboard state
const selectedHistorySession = ref(null)
const showLeaderboardModal = ref(false)
const historyLeaderboard = ref([])

async function viewSessionLeaderboard(sessionItem) {
  try {
    const res = await fetch(`${API_BASE}/sessions/${sessionItem.session_id}/leaderboard`)
    if (res.ok) {
      const data = await res.json()
      selectedHistorySession.value = data.session
      historyLeaderboard.value = data.leaderboard
      showLeaderboardModal.value = true
    }
  } catch (err) {
    console.error("Gagal memuat leaderboard sesi:", err)
  }
}

// Load list of participants
async function fetchParticipants() {
  try {
    const res = await fetch(`${API_BASE}/participants`)
    if (res.ok) {
      const data = await res.json()
      participantsList.value = [
        { id: 'admin', name: '[Administrator / PIC]' },
        ...data
      ]
    } else {
      errorMsg.value = "Gagal memuat daftar peserta."
    }
  } catch (err) {
    errorMsg.value = "Tidak dapat terhubung ke server backend."
  }
}

// Check active session status
async function checkActiveSession() {
  try {
    const url = currentParticipant.value 
      ? `${API_BASE}/sessions/active?participant_id=${currentParticipant.value.id}`
      : `${API_BASE}/sessions/active`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (data.active) {
        activeSession.value = data.session
      } else {
        activeSession.value = null
      }
    }
  } catch (err) {
    console.error("Gagal memeriksa sesi aktif:", err)
  }
}

// Handle login selection
async function handleLogin() {
  if (!selectedParticipantId.value) return
  errorMsg.value = ''
  successMsg.value = ''
  
  if (selectedParticipantId.value === 'admin') {
    if (!adminPin.value) {
      errorMsg.value = "PIN Admin wajib diisi!"
      return
    }
    try {
      loading.value = true
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminPin.value })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('otm_admin_token', data.token)
        router.push('/admin')
      } else {
        errorMsg.value = data.error || "PIN Admin salah."
      }
    } catch (err) {
      errorMsg.value = "Koneksi ke backend gagal."
    } finally {
      loading.value = false
    }
    return
  }

  const selectedObj = participantsList.value.find(p => p.id == selectedParticipantId.value)
  if (!selectedObj) return

  try {
    loading.value = true
    const res = await fetch(`${API_BASE}/participants/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedObj.name })
    })

    const data = await res.json()
    if (res.ok && data.success) {
      currentParticipant.value = data.participant
      localStorage.setItem('otm_participant', JSON.stringify(data.participant))
      localStorage.setItem('otm_selected_avatar', selectedAvatarId.value.toString())
      successMsg.value = `Selamat datang, ${data.participant.name}!`
      fetchHistory(data.participant.id)
    } else {
      errorMsg.value = data.error || "Gagal masuk."
    }
  } catch (err) {
    errorMsg.value = "Koneksi ke backend gagal."
  } finally {
    loading.value = false
  }
}

// Fetch participant history
async function fetchHistory(id) {
  try {
    const res = await fetch(`${API_BASE}/participants/${id}/history`)
    if (res.ok) {
      const data = await res.json()
      personalHistory.value = data.history
    }
  } catch (err) {
    console.error("Gagal memuat riwayat skor:", err)
  }
}

// Join the active live session
function joinQuiz() {
  if (!currentParticipant.value) return
  router.push('/quiz')
}

// Log out / change participant
function handleLogout() {
  localStorage.removeItem('otm_participant')
  localStorage.removeItem('otm_selected_avatar')
  currentParticipant.value = null
  selectedParticipantId.value = ''
  selectedAvatarId.value = null
  personalHistory.value = []
}

onMounted(() => {
  fetchParticipants()
  checkActiveSession()
  
  // Polling for active session status updates
  sessionPoller = setInterval(checkActiveSession, 3000)

  // Restore session and avatar from localStorage if exists
  const saved = localStorage.getItem('otm_participant')
  const savedAvatar = localStorage.getItem('otm_selected_avatar')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      currentParticipant.value = parsed
      selectedParticipantId.value = parsed.id
      fetchHistory(parsed.id)
    } catch (e) {
      localStorage.removeItem('otm_participant')
    }
  }
  // Restore avatar selection
  if (savedAvatar) {
    selectedAvatarId.value = parseInt(savedAvatar)
  }
})

onUnmounted(() => {
  if (sessionPoller) clearInterval(sessionPoller)
})
</script>

<template>
  <div class="space-y-6 max-w-xl mx-auto">
    <!-- Notifications -->
    <div v-if="errorMsg" class="bg-red-500/10 text-red-300 p-4 rounded-2xl border border-red-500/30 text-sm font-semibold shadow-lg shadow-red-500/10 flex items-start space-x-3">
      <span class="text-lg mt-0.5">⚠️</span>
      <span>{{ errorMsg }}</span>
    </div>
    <div v-if="successMsg" class="bg-emerald-500/10 text-emerald-300 p-4 rounded-2xl border border-emerald-500/30 text-sm font-semibold shadow-lg shadow-emerald-500/10 flex items-start space-x-3">
      <span class="text-lg mt-0.5">✅</span>
      <span>{{ successMsg }}</span>
    </div>

    <!-- Login Selection / Lobby Card -->
    <div v-if="!currentParticipant" class="bg-dark-surface rounded-3xl border border-dark-border shadow-2xl p-8 md:p-10 space-y-6">
      <div class="text-center space-y-3">
        <div class="mx-auto w-14 h-14 bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center rounded-2xl shadow-lg shadow-paragon-medium/30">
          <UserCheck class="w-7 h-7 text-paragon-ice" />
        </div>
        <h2 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-paragon-ice to-paragon-light">Portal Peserta</h2>
        <p class="text-sm text-dark-text-secondary max-w-sm mx-auto leading-relaxed">
          Pilih avatar dan nama Anda untuk bergabung ke live kuis seru dan lihat riwayat skor Anda!
        </p>
      </div>

      <div class="space-y-6">
        <!-- Avatar Selection Carousel -->
        <AvatarCarousel v-model="selectedAvatarId" :avatars="avatarOptions" />
        
        <div v-if="!selectedAvatarId" class="text-xs text-red-400 font-semibold">
          ⚠️ Pilih avatar terlebih dahulu
        </div>

        <!-- Participant Selection -->
        <div>
          <label class="block text-xs font-bold text-paragon-light uppercase tracking-widest mb-3">Nama Anda</label>
          <select 
            v-model="selectedParticipantId" 
            class="w-full bg-dark-surface-hover border border-dark-border focus:border-paragon-medium focus:bg-dark-surface text-dark-text rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-paragon-medium/30 transition-all outline-none cursor-pointer hover:border-paragon-light/30"
          >
            <option value="" disabled>-- Pilih Nama Anda --</option>
            <option v-for="p in participantsList" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        
        <div v-if="selectedParticipantId === 'admin'" class="space-y-3 bg-dark-surface-hover border border-amber-500/20 rounded-2xl p-4">
          <label class="block text-xs font-bold text-amber-400 uppercase tracking-widest">PIN Administrator</label>
          <input 
            v-model="adminPin" 
            type="password" 
            placeholder="••••••"
            class="w-full bg-dark-surface border border-dark-border focus:border-amber-500 text-dark-text rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all tracking-widest text-center hover:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            @keyup.enter="handleLogin"
          />
        </div>

        <button 
          @click="handleLogin" 
          :disabled="!selectedParticipantId || !selectedAvatarId || loading"
          class="w-full py-3.5 bg-gradient-to-r from-paragon-medium to-paragon-dark text-white font-extrabold rounded-2xl shadow-lg shadow-paragon-medium/30 hover:shadow-paragon-dark/40 hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none transition-all flex items-center justify-center space-x-2 text-base"
        >
          <span>🚀 Masuk Portal</span>
        </button>
      </div>
    </div>

    <!-- Authorized Participant Area -->
    <div v-else class="space-y-6">
      <!-- Profile Welcome Card -->
      <div class="bg-gradient-to-r from-dark-surface-hover to-dark-surface rounded-3xl border border-paragon-light/10 shadow-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div class="flex items-center space-x-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center text-3xl shadow-lg shadow-paragon-medium/30">
            {{ avatarOptions.find(a => a.id === selectedAvatarId)?.emoji || '🎯' }}
          </div>
          <div>
            <span class="text-[10px] uppercase font-extrabold tracking-widest text-paragon-light">Masuk Sebagai</span>
            <h2 class="text-xl font-black text-paragon-ice mt-0.5">{{ currentParticipant.name }}</h2>
          </div>
        </div>
        <button 
          @click="handleLogout" 
          class="px-4 py-2.5 border border-dark-border text-xs font-bold text-dark-text-secondary hover:bg-dark-surface-hover hover:border-paragon-light/30 rounded-xl transition-all"
        >
          Ganti Nama
        </button>
      </div>

      <!-- Live Session Status Banner -->
      <div v-if="activeSession" class="bg-gradient-to-br from-paragon-medium via-paragon-dark to-paragon-dark text-white rounded-3xl shadow-2xl p-8 relative overflow-hidden border border-paragon-light/20">
        <div class="relative z-10 space-y-5">
          <div class="flex items-center space-x-2 bg-emerald-500/20 backdrop-blur px-4 py-1.5 rounded-full w-max text-[10px] font-extrabold tracking-widest uppercase">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>🔴 LIVE - Kuis Dimulai Sekarang!</span>
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl font-black tracking-tight">🎯 {{ activeSession.reference || 'Tema Sharing' }}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-paragon-ice/80 font-medium">
              <div class="flex items-center space-x-2">
                <span>👥 PIC:</span>
                <strong class="text-paragon-ice">{{ activeSession.pic_karyawan }} &amp; {{ activeSession.pic_intern }}</strong>
              </div>
              <span class="hidden md:inline text-paragon-light/40">•</span>
              <div class="flex items-center space-x-2">
                <span>📅</span>
                <strong class="text-paragon-ice">{{ activeSession.date }}</strong>
              </div>
            </div>
          </div>

          <button 
            @click="joinQuiz" 
            class="px-8 py-4 bg-gradient-to-r from-paragon-ice to-paragon-light text-paragon-dark font-black rounded-2xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg text-base"
          >
            <Play class="w-5 h-5 fill-paragon-dark" />
            <span>🚀 Gabung Sesi Live</span>
          </button>
        </div>
        
        <!-- Animated Decor -->
        <div class="absolute -right-16 -bottom-16 w-48 h-48 bg-paragon-light/5 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute -left-8 -top-8 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl"></div>
      </div>

      <!-- No Active Session Card -->
      <div v-else class="bg-dark-surface rounded-3xl p-8 text-center border border-dark-border space-y-3">
        <HelpCircle class="w-10 h-10 text-paragon-light/40 mx-auto" />
        <h3 class="font-bold text-dark-text text-lg">⏳ Menunggu Sesi Kuis</h3>
        <p class="text-sm text-dark-text-secondary leading-relaxed">
          Sesi kuis live akan muncul di sini setelah Admin memulainya. Bersiaplah untuk berkompetisi! 🏆
        </p>
      </div>

      <!-- Personal History Card -->
      <div class="bg-dark-surface rounded-3xl border border-dark-border shadow-xl p-8 space-y-4">
        <div class="flex items-center space-x-3 border-b border-dark-border pb-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center">
            <Trophy class="w-5 h-5 text-paragon-ice" />
          </div>
          <h3 class="font-black text-lg text-paragon-ice">📊 Riwayat Nilai Anda</h3>
        </div>

        <div v-if="personalHistory.length === 0" class="text-center py-8 text-dark-text-secondary text-sm font-semibold">
          💫 Belum ada riwayat kuis. Mulai sekarang dan raih poin!
        </div>

        <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-2">
          <div 
            v-for="h in personalHistory" 
            :key="h.session_id" 
            @click="viewSessionLeaderboard(h)"
            class="p-4 rounded-2xl border border-dark-border bg-dark-surface-hover hover:bg-dark-surface hover:border-paragon-light/30 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div class="space-y-1.5 flex-1">
              <span class="text-[10px] font-extrabold text-paragon-light/60 uppercase">📅 {{ h.date }}</span>
              <h4 class="font-bold text-sm text-paragon-ice tracking-tight leading-tight group-hover:text-paragon-light transition-colors">
                🎯 {{ h.reference }}
              </h4>
              <p class="text-[11px] text-dark-text-secondary font-medium">
                ✅ Benar: {{ h.correct_count }}/{{ h.total_answered }} • 👥 {{ h.pic_karyawan }} &amp; {{ h.pic_intern }}
              </p>
            </div>
            
            <div class="text-right space-y-2 ml-4 flex-shrink-0">
              <div class="text-lg font-black text-paragon-light">
                {{ h.score }}⭐
              </div>
              <div class="text-[10px] font-bold bg-gradient-to-r from-paragon-medium/30 to-paragon-dark/30 text-paragon-ice px-2.5 py-1 rounded-full inline-block border border-paragon-medium/20">
                🏆 #{{ h.rank }}/{{ h.total_participants }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- PAST SESSION LEADERBOARD MODAL -->
    <div 
      v-if="showLeaderboardModal" 
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-dark-surface rounded-3xl border border-dark-border shadow-2xl w-full max-w-md p-8 space-y-6 animate-fade-in">
        <div class="flex justify-between items-center border-b border-dark-border pb-4">
          <div>
            <h3 class="font-black text-xl text-paragon-ice">🏆 Leaderboard OTM</h3>
            <p class="text-[11px] text-paragon-light/60 font-bold uppercase tracking-wider mt-1">
              📅 {{ selectedHistorySession?.date }} • 🎯 {{ selectedHistorySession?.reference }}
            </p>
          </div>
          <button @click="showLeaderboardModal = false" class="text-dark-text-secondary hover:text-paragon-light p-2 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2 max-h-80 overflow-y-auto pr-2">
          <div 
            v-for="(p, idx) in historyLeaderboard" 
            :key="p.participant_id" 
            class="flex justify-between items-center px-4 py-3 rounded-2xl border text-xs transition-all"
            :class="p.participant_id == currentParticipant?.id 
              ? 'border-paragon-medium bg-paragon-medium/10 text-paragon-ice font-extrabold shadow-lg shadow-paragon-medium/20' 
              : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/30'"
          >
            <div class="flex items-center space-x-3 font-bold flex-1">
              <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center text-paragon-ice font-black text-[10px]">
                #{{ idx + 1 }}
              </div>
              <span class="text-dark-text">{{ p.name }}</span>
              <span v-if="p.participant_id == currentParticipant?.id" class="text-[9px] bg-gradient-to-r from-paragon-medium to-paragon-dark text-paragon-ice px-2 py-0.5 rounded-full font-bold">⭐ Anda</span>
            </div>
            <div class="text-right">
              <div class="font-black text-paragon-light">{{ p.total_score }}⭐</div>
              <div class="text-[9px] text-dark-text-secondary font-medium">✅ {{ p.correct_answers }}/{{ p.total_answered }}</div>
            </div>
          </div>
        </div>

        <button 
          @click="showLeaderboardModal = false" 
          class="w-full py-3 bg-gradient-to-r from-paragon-medium to-paragon-dark hover:shadow-lg hover:shadow-paragon-medium/30 text-paragon-ice text-sm font-bold rounded-2xl shadow transition-all flex items-center justify-center"
        >
          ✕ Tutup
        </button>
      </div>
    </div>
  </div>
</template>
