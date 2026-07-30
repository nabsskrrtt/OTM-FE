<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Award, Play, History, UserCheck, HelpCircle, X, Trophy } from 'lucide-vue-next'
import ImmersiveAvatarCarousel from '../components/ImmersiveAvatarCarousel.vue'

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = `${API_HOST}/api`

// Avatar options with cute animal images
const avatarOptions = [
  { id: 1, filename: 'panda.png', name: 'Panda' },
  { id: 2, filename: 'penguin.png', name: 'Penguin' },
  { id: 3, filename: 'bee.png', name: 'Bee' },
  { id: 4, filename: 'monkey.png', name: 'Monkey' },
  { id: 5, filename: 'fox.png', name: 'Fox' }
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

const activeLeaderboardTab = ref('weekly')
const weeklyLeaderboard = ref([])
const weeklyCurrentData = ref(null)
const lifetimeLeaderboard = ref([])
const selectedMonthLeaderboard = ref(new Date().toISOString().slice(0, 7))

function getAvatarFileName(participant) {
  if (!participant || !participant.avatar_id) return 'panda.png'
  const avatarFilenames = {
    1: 'panda.png',
    2: 'penguin.png',
    3: 'bee.png',
    4: 'monkey.png',
    5: 'fox.png'
  }
  return avatarFilenames[participant.avatar_id] || 'panda.png'
}

async function fetchWeeklyCurrentLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/reports/weekly-current`)
    if (res.ok) {
      weeklyCurrentData.value = await res.json()
    }
  } catch (err) {
    console.error("Gagal memuat leaderboard kuis terakhir:", err)
  }
}

async function fetchWeeklyLeaderboard() {
  const month = selectedMonthLeaderboard.value
  try {
    const res = await fetch(`${API_BASE}/reports/weekly?month=${month}`)
    if (res.ok) {
      const data = await res.json()
      weeklyLeaderboard.value = data.leaderboard
    }
  } catch (err) {
    console.error("Gagal memuat leaderboard mingguan:", err)
  }
}

async function fetchLifetimeLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/reports/lifetime`)
    if (res.ok) {
      lifetimeLeaderboard.value = await res.json()
    }
  } catch (err) {
    console.error("Gagal memuat leaderboard lifetime:", err)
  }
}

function fetchLeaderboardTab(tab) {
  if (tab === 'weekly') fetchWeeklyCurrentLeaderboard()
  else if (tab === 'monthly') fetchWeeklyLeaderboard()
  else if (tab === 'lifetime') fetchLifetimeLeaderboard()
}

watch(activeLeaderboardTab, (newTab) => {
  fetchLeaderboardTab(newTab)
})

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
      body: JSON.stringify({ name: selectedObj.name, avatar_id: selectedAvatarId.value })
    })

    const data = await res.json()
    if (res.ok && data.success) {
      currentParticipant.value = data.participant
      const selectedAvatar = avatarOptions.find(a => a.id === selectedAvatarId.value)
      const participantWithAvatar = {
        ...data.participant,
        avatar: selectedAvatar
      }
      localStorage.setItem('otm_participant', JSON.stringify(participantWithAvatar))
      sessionStorage.setItem('otm_avatar', JSON.stringify(selectedAvatar))
      successMsg.value = `Selamat datang, ${data.participant.name}!`
      fetchHistory(data.participant.id)
      fetchLeaderboardTab(activeLeaderboardTab.value)
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

function getTopThreeAndMe(list) {
  if (!list || !Array.isArray(list)) return []
  // Slice Top 3
  const topThree = list.slice(0, 3)
  
  if (currentParticipant.value) {
    const myId = currentParticipant.value.id
    // Check if I am in the top 3 (by id or participant_id)
    const inTopThree = topThree.some(p => p.participant_id == myId || p.id == myId)
    if (!inTopThree) {
      // Find my row in the full list
      const myRowIndex = list.findIndex(p => p.participant_id == myId || p.id == myId)
      if (myRowIndex !== -1) {
        // Return top 3 plus my row flagged as isPinnedMe
        const myRow = { ...list[myRowIndex], isPinnedMe: true, actualRank: myRowIndex + 1 }
        return [...topThree, myRow]
      }
    }
  }
  return topThree
}

onMounted(() => {
  fetchParticipants()
  checkActiveSession()
  fetchLeaderboardTab(activeLeaderboardTab.value)
  
  // Polling for active session status updates
  sessionPoller = setInterval(checkActiveSession, 3000)

  // Restore session and avatar from localStorage if exists
  const saved = localStorage.getItem('otm_participant')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      currentParticipant.value = parsed
      selectedParticipantId.value = parsed.id
      // Restore avatar from participant data
      if (parsed.avatar_id) {
        selectedAvatarId.value = parsed.avatar_id
      } else if (parsed.avatar?.id) {
        selectedAvatarId.value = parsed.avatar.id
      }
      fetchHistory(parsed.id)
    } catch (e) {
      localStorage.removeItem('otm_participant')
    }
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
      <div class="text-center space-y-3 py-2">
        <h2 class="text-3xl font-black">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-accent-cyan via-paragon-light to-paragon-medium">Selamat Pagi!</span> ☀️
        </h2>
        <p class="text-sm text-dark-text-secondary max-w-sm mx-auto leading-relaxed font-semibold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
          Silakan pilih avatar dan nama Anda untuk bersiap mengikuti sharing morning briefing hari ini!
        </p>
      </div>

      <div class="space-y-6">
        <!-- Immersive Avatar Selection Carousel -->
        <ImmersiveAvatarCarousel v-model="selectedAvatarId" :avatars="avatarOptions" />

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
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan to-paragon-medium flex items-center justify-center shadow-lg glow-cyan overflow-hidden border-2 border-accent-cyan/50">
            <img
              :src="selectedAvatarId ? `/assets/avatars/${avatarOptions.find(a => a.id === selectedAvatarId)?.filename || 'panda.png'}` : '/assets/avatars/panda.png'"
              :alt="avatarOptions.find(a => a.id === selectedAvatarId)?.name || 'Avatar'"
              class="w-full h-full object-cover"
            />
          </div>
          <div>
            <span class="text-[10px] uppercase font-extrabold tracking-widest text-paragon-light">Masuk Sebagai</span>
            <h2 class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-paragon-ice to-paragon-light mt-0.5">{{ currentParticipant.name }}</h2>
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
      <div v-if="activeSession" class="bg-active-card-bg rounded-3xl shadow-2xl p-8 relative overflow-hidden border border-active-card-border">
        <div class="relative z-10 space-y-5">
          <div class="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-4 py-1.5 rounded-full w-max text-[10px] font-extrabold tracking-widest uppercase">
            <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <span>🔴 LIVE - Kuis Dimulai Sekarang!</span>
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl font-black tracking-tight text-active-card-title">🎯 {{ activeSession.reference || 'Tema Sharing' }}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-active-card-text font-medium">
              <div class="flex items-center space-x-2">
                <span>👥 PIC:</span>
                <strong class="text-active-card-title">{{ activeSession.pic_karyawan }} &amp; {{ activeSession.pic_intern }}</strong>
              </div>
              <span class="hidden md:inline text-active-card-text/40">•</span>
              <div class="flex items-center space-x-2">
                <span>📅</span>
                <strong class="text-active-card-title">{{ activeSession.date }}</strong>
              </div>
            </div>
          </div>

          <button 
            @click="joinQuiz" 
            class="btn-join-quiz px-8 py-4 bg-gradient-to-r from-active-card-btn-bg to-active-card-btn-bg bg-active-card-btn-bg text-active-card-btn-text font-black rounded-2xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg text-base"
          >
            <Play class="icon-join-quiz w-5 h-5 fill-current" />
            <span>🚀 Gabung Sesi Live</span>
          </button>
        </div>
        
        <!-- Animated Decor -->
        <div class="absolute -right-16 -bottom-16 w-48 h-48 bg-paragon-light/5 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute -left-8 -top-8 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl"></div>
      </div>

      <!-- No Active Session Card -->
      <div v-else class="bg-dark-surface rounded-3xl p-8 text-center border border-dark-border space-y-3">
        <h3 class="font-bold text-dark-text text-lg">⏳ Menunggu Sesi Kuis</h3>
        <p class="text-sm text-dark-text-secondary leading-relaxed">
          Sesi kuis live akan muncul di sini setelah Admin memulainya. Bersiaplah untuk berkompetisi! 🏆
        </p>
      </div>

      <!-- Personal History Card -->
      <div class="bg-dark-surface rounded-3xl border border-dark-border shadow-xl p-8 space-y-4">
        <div class="flex items-center space-x-3 border-b border-dark-border pb-4">
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

      <!-- Leaderboard Umum Card with Tabs -->
      <div class="bg-dark-surface rounded-3xl border border-dark-border shadow-xl p-4 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-dark-border pb-4 gap-4">
          <div class="flex items-center space-x-3">
            <h3 class="font-black text-lg text-paragon-ice">🏆 Peringkat Umum</h3>
          </div>
          
          <!-- Tab Buttons -->
          <div class="flex w-full sm:w-auto bg-dark-surface-hover p-1 rounded-xl border border-dark-border max-w-full overflow-x-auto">
            <button 
              @click="activeLeaderboardTab = 'weekly'"
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center"
              :class="activeLeaderboardTab === 'weekly' ? 'bg-gradient-to-r from-paragon-medium to-paragon-dark text-white shadow' : 'text-dark-text-secondary hover:text-white'"
            >
              Mingguan
            </button>
            <button 
              @click="activeLeaderboardTab = 'monthly'"
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center"
              :class="activeLeaderboardTab === 'monthly' ? 'bg-gradient-to-r from-paragon-medium to-paragon-dark text-white shadow' : 'text-dark-text-secondary hover:text-white'"
            >
              Bulanan
            </button>
            <button 
              @click="activeLeaderboardTab = 'lifetime'"
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center"
              :class="activeLeaderboardTab === 'lifetime' ? 'bg-gradient-to-r from-paragon-medium to-paragon-dark text-white shadow' : 'text-dark-text-secondary hover:text-white'"
            >
              Lifetime
            </button>
          </div>
        </div>

        <!-- Weekly Leaderboard Table (Latest Quiz Session) -->
        <div v-if="activeLeaderboardTab === 'weekly'" class="space-y-4">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex justify-between">
            <span>Kuis Terakhir</span>
            <span class="text-paragon-light font-extrabold">{{ weeklyCurrentData?.weekInfo || 'Belum Ada Sesi Kuis Selesai' }}</span>
          </div>
          <div class="space-y-2 max-h-80 overflow-y-auto pr-2">
            <div v-if="!weeklyCurrentData?.leaderboard || weeklyCurrentData.leaderboard.length === 0" class="text-dark-text-secondary text-xs text-center py-6">
              Belum ada data kuis pekan ini.
            </div>
            <template v-else v-for="(p, idx) in getTopThreeAndMe(weeklyCurrentData.leaderboard)" :key="p.participant_id">
              <div v-if="p.isPinnedMe" class="border-t border-dashed border-dark-border/60 my-3 pt-3 text-center text-[10px] text-paragon-light/60 uppercase tracking-widest font-black">
                Posisi Anda
              </div>
              <div 
                class="flex justify-between items-center px-4 py-3.5 rounded-2xl border text-xs font-bold transition-all"
                :class="p.participant_id == currentParticipant?.id 
                  ? 'border-accent-cyan bg-gradient-to-r from-cyan-950/30 via-dark-surface to-cyan-950/30 text-white font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                  : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/20'"
              >
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                  <span class="w-5 text-slate-500 font-extrabold text-[10px]">#{{ p.actualRank || (idx + 1) }}</span>
                  <span class="truncate text-dark-text leading-tight">{{ p.name }}</span>
                  <span v-if="p.participant_id == currentParticipant?.id" class="text-[8px] bg-gradient-to-r from-accent-cyan to-paragon-medium text-white px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0">⭐ Anda</span>
                </div>
                <span class="text-xs font-black text-paragon-light">{{ p.total_score }} Pts</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Monthly Leaderboard Table (Weekly Breakdown W1-W5) -->
        <div v-else-if="activeLeaderboardTab === 'monthly'" class="space-y-4">
          <!-- Date picker row -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 px-4">
            <label class="text-[10px] font-black text-paragon-light uppercase tracking-widest flex-shrink-0">Bulan Laporan:</label>
            <input 
              v-model="selectedMonthLeaderboard" 
              type="month" 
              @change="fetchWeeklyLeaderboard"
              class="bg-dark-surface border border-dark-border text-dark-text text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-paragon-medium w-full sm:w-auto"
            />
          </div>

          <!-- Wrapper for horizontal scrolling on mobile -->
          <div class="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
            <div class="min-w-[460px] space-y-3">
              <div class="flex items-center justify-between text-[10px] font-black text-paragon-light/60 uppercase tracking-widest px-4">
                <span>Peserta</span>
                <div class="flex space-x-3">
                  <span class="w-9 text-center">W1</span>
                  <span class="w-9 text-center">W2</span>
                  <span class="w-9 text-center">W3</span>
                  <span class="w-9 text-center">W4</span>
                  <span class="w-9 text-center">W5</span>
                  <span class="w-12 text-right">Total</span>
                </div>
              </div>
              <div class="space-y-2 max-h-80 overflow-y-auto pr-2">
                <div v-if="weeklyLeaderboard.length === 0" class="text-dark-text-secondary text-xs text-center py-6">
                  Tidak ada data untuk bulan ini.
                </div>
                <template v-else v-for="(p, idx) in getTopThreeAndMe(weeklyLeaderboard)" :key="p.participant_id">
                  <div v-if="p.isPinnedMe" class="border-t border-dashed border-dark-border/60 my-3 pt-3 text-center text-[10px] text-paragon-light/60 uppercase tracking-widest font-black">
                    Posisi Anda
                  </div>
                  <div 
                    class="flex justify-between items-center px-4 py-3.5 rounded-2xl border text-xs font-bold transition-all"
                    :class="p.participant_id == currentParticipant?.id 
                      ? 'border-accent-cyan bg-gradient-to-r from-cyan-950/30 via-dark-surface to-cyan-950/30 text-white font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                      : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/20'"
                  >
                    <div class="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                      <span class="w-5 text-slate-500 font-extrabold text-[10px]">#{{ p.actualRank || (idx + 1) }}</span>
                      <span class="truncate text-dark-text leading-tight">{{ p.name }}</span>
                      <span v-if="p.participant_id == currentParticipant?.id" class="text-[8px] bg-gradient-to-r from-accent-cyan to-paragon-medium text-white px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0">⭐ Anda</span>
                    </div>
                    <div class="flex space-x-3 text-[10px] font-bold text-slate-400 flex-shrink-0">
                      <span class="w-9 text-center">{{ p.weeks[0] || '-' }}</span>
                      <span class="w-9 text-center">{{ p.weeks[1] || '-' }}</span>
                      <span class="w-9 text-center">{{ p.weeks[2] || '-' }}</span>
                      <span class="w-9 text-center">{{ p.weeks[3] || '-' }}</span>
                      <span class="w-9 text-center">{{ p.weeks[4] || '-' }}</span>
                      <span class="w-12 text-right text-xs font-black text-paragon-light">{{ p.total }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Lifetime Leaderboard Table -->
        <div v-else-if="activeLeaderboardTab === 'lifetime'" class="space-y-3">
          <div class="flex justify-between items-center text-[10px] font-black text-paragon-light/60 uppercase tracking-widest px-4">
            <span>Peserta</span>
            <span>Skor</span>
          </div>
          <div class="space-y-2 max-h-80 overflow-y-auto pr-2">
            <template v-for="(p, idx) in getTopThreeAndMe(lifetimeLeaderboard)" :key="p.participant_id">
              <div v-if="p.isPinnedMe" class="border-t border-dashed border-dark-border/60 my-3 pt-3 text-center text-[10px] text-paragon-light/60 uppercase tracking-widest font-black">
                Posisi Anda
              </div>
              <div 
                class="flex justify-between items-center px-4 py-3 rounded-2xl border text-xs font-bold transition-all"
                :class="p.participant_id == currentParticipant?.id 
                  ? 'border-accent-cyan bg-gradient-to-r from-cyan-950/30 via-dark-surface to-cyan-950/30 text-white font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                  : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/20'"
              >
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                  <span class="w-5 text-slate-500 font-extrabold text-[10px]">#{{ p.actualRank || (idx + 1) }}</span>
                  <span class="text-dark-text truncate leading-tight">{{ p.name }}</span>
                  <span v-if="p.participant_id == currentParticipant?.id" class="text-[8px] bg-gradient-to-r from-accent-cyan to-paragon-medium text-white px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0">⭐ Anda</span>
                </div>
                <span class="text-xs font-black text-paragon-light">{{ p.lifetime_score }} Pts</span>
              </div>
            </template>
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
          <template v-for="(p, idx) in getTopThreeAndMe(historyLeaderboard)" :key="p.participant_id">
            <div v-if="p.isPinnedMe" class="border-t border-dashed border-dark-border/60 my-3 pt-3 text-center text-[10px] text-paragon-light/60 uppercase tracking-widest font-black">
              Posisi Anda
            </div>
            <div 
              class="flex justify-between items-center px-4 py-3 rounded-2xl border text-xs transition-all"
              :class="p.participant_id == currentParticipant?.id 
                ? 'border-paragon-medium bg-paragon-medium/10 text-paragon-ice font-extrabold shadow-lg shadow-paragon-medium/20' 
                : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/30'"
            >
              <div class="flex items-center space-x-3 font-bold flex-1">
                <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center text-paragon-ice font-black text-[10px]">
                  #{{ p.actualRank || (idx + 1) }}
                </div>
                <div class="w-6 h-6 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img :src="`/assets/avatars/${getAvatarFileName(p)}`" class="w-full h-full object-cover" />
                </div>
                <span class="text-dark-text">{{ p.name }}</span>
                <span v-if="p.participant_id == currentParticipant?.id" class="text-[9px] bg-gradient-to-r from-paragon-medium to-paragon-dark text-paragon-ice px-2 py-0.5 rounded-full font-bold">⭐ Anda</span>
              </div>
              <div class="text-right">
                <div class="font-black text-paragon-light">{{ p.total_score }}⭐</div>
                <div class="text-[9px] text-dark-text-secondary font-medium">✅ {{ p.correct_answers }}/{{ p.total_answered }}</div>
              </div>
            </div>
          </template>
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
