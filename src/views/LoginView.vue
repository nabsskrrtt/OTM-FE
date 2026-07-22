<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Award, Play, History, UserCheck, HelpCircle, X } from 'lucide-vue-next'

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = `${API_HOST}/api`

// State
const participantsList = ref([])
const selectedParticipantId = ref('')
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
  currentParticipant.value = null
  selectedParticipantId.value = ''
  personalHistory.value = []
}

onMounted(() => {
  fetchParticipants()
  checkActiveSession()
  
  // Polling for active session status updates
  sessionPoller = setInterval(checkActiveSession, 3000)

  // Restore session from localStorage if exists
  const saved = localStorage.getItem('otm_participant')
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
})

onUnmounted(() => {
  if (sessionPoller) clearInterval(sessionPoller)
})
</script>

<template>
  <div class="space-y-6 max-w-xl mx-auto">
    <!-- Notifications -->
    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-semibold shadow-sm">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 text-sm font-semibold shadow-sm">
      {{ successMsg }}
    </div>

    <!-- Login Selection / Lobby Card -->
    <div v-if="!currentParticipant" class="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6">
      <div class="text-center space-y-2">
        <div class="mx-auto w-12 h-12 bg-paragon-ice text-paragon-medium flex items-center justify-center rounded-2xl">
          <UserCheck class="w-6 h-6" />
        </div>
        <h2 class="text-2xl font-extrabold text-paragon-dark">Portal Peserta</h2>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Silakan pilih nama Anda untuk bergabung ke live kuis dan melihat riwayat skor Anda.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Anda</label>
          <select 
            v-model="selectedParticipantId" 
            class="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-paragon-medium focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-paragon-medium/20 transition-all outline-none"
          >
            <option value="" disabled>-- Pilih Nama Anda --</option>
            <option v-for="p in participantsList" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        
        <div v-if="selectedParticipantId === 'admin'" class="space-y-2">
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">PIN Administrator</label>
          <input 
            v-model="adminPin" 
            type="password" 
            placeholder="••••••"
            class="w-full bg-slate-50 border border-slate-200 focus:border-paragon-medium focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all tracking-widest text-center"
            @keyup.enter="handleLogin"
          />
        </div>

        <button 
          @click="handleLogin" 
          :disabled="!selectedParticipantId || loading"
          class="w-full py-3 bg-paragon-medium text-white font-bold rounded-xl shadow-lg shadow-paragon-medium/20 hover:bg-paragon-dark hover:shadow-paragon-dark/20 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center space-x-2"
        >
          <span>Masuk Portal</span>
        </button>
      </div>
    </div>

    <!-- Authorized Participant Area -->
    <div v-else class="space-y-6">
      <!-- Profile Welcome Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span class="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Masuk Sebagai</span>
          <h2 class="text-xl font-black text-paragon-dark flex items-center space-x-2 mt-0.5">
            <span>{{ currentParticipant.name }}</span>
          </h2>
        </div>
        <button 
          @click="handleLogout" 
          class="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
        >
          Ganti Nama
        </button>
      </div>

      <!-- Live Session Status Banner -->
      <div v-if="activeSession" class="bg-gradient-to-r from-paragon-dark to-paragon-medium text-white rounded-2xl shadow-xl p-6 relative overflow-hidden border border-white/5">
        <div class="relative z-10 space-y-4">
          <div class="flex items-center space-x-2 bg-white/15 px-3 py-1 rounded-full w-max text-[10px] font-extrabold tracking-widest uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Kuis Tersedia!</span>
          </div>

          <div class="space-y-1">
            <h3 class="text-lg font-black tracking-tight">Kuis OTM: {{ activeSession.reference || 'Tema Sharing' }}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>PIC: <strong class="text-white">{{ activeSession.pic_karyawan }} (Tetap) &amp; {{ activeSession.pic_intern }} (Intern)</strong></span>
              <span class="hidden md:inline">•</span>
              <span>Tanggal: <strong class="text-white">{{ activeSession.date }}</strong></span>
            </div>
          </div>

          <button 
            @click="joinQuiz" 
            class="px-6 py-3 bg-white text-paragon-dark font-black rounded-xl hover:bg-paragon-ice hover:shadow-lg active:scale-95 transition-all flex items-center space-x-2 shadow-sm text-sm"
          >
            <Play class="w-4 h-4 fill-paragon-dark" />
            <span>Gabung Sesi Live</span>
          </button>
        </div>
        
        <!-- Abstract Background Decor -->
        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      <!-- No Active Session Card -->
      <div v-else class="bg-slate-100 rounded-2xl p-6 text-center border border-slate-200/50 space-y-2">
        <HelpCircle class="w-8 h-8 text-slate-400 mx-auto" />
        <h3 class="font-bold text-slate-700">Belum Ada Sesi Kuis Aktif</h3>
        <p class="text-xs text-slate-500">
          Sesi kuis akan muncul di sini setelah Admin memulai sesi live pada jam 7:30 WIB.
        </p>
      </div>

      <!-- Personal History Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-4">
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <History class="w-5 h-5 text-paragon-medium" />
          <h3 class="font-black text-lg text-paragon-dark">Riwayat Nilai Anda</h3>
        </div>

        <div v-if="personalHistory.length === 0" class="text-center py-6 text-slate-400 text-xs font-semibold">
          Belum ada riwayat kuis yang diikuti.
        </div>

        <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1">
          <div 
            v-for="h in personalHistory" 
            :key="h.session_id" 
            @click="viewSessionLeaderboard(h)"
            class="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 cursor-pointer flex items-center justify-between transition-all"
          >
            <div class="space-y-1">
              <span class="text-[10px] font-extrabold text-slate-400 uppercase">{{ h.date }}</span>
              <h4 class="font-bold text-sm text-paragon-dark tracking-tight leading-tight">
                {{ h.reference }}
              </h4>
              <p class="text-[11px] text-slate-500 font-medium">
                Benar: {{ h.correct_count }}/{{ h.total_answered }} • PIC: {{ h.pic_karyawan }} &amp; {{ h.pic_intern }}
              </p>
            </div>
            
            <div class="text-right space-y-1">
              <div class="text-sm font-black text-paragon-medium">
                {{ h.score }} Pts
              </div>
              <div class="text-[10px] font-bold bg-paragon-ice text-paragon-medium px-2 py-0.5 rounded-full inline-block">
                Rank #{{ h.rank }} dari {{ h.total_participants }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- PAST SESSION LEADERBOARD MODAL -->
    <div 
      v-if="showLeaderboardModal" 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-6 animate-fade-in">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 class="font-black text-lg text-paragon-dark">Leaderboard OTM</h3>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {{ selectedHistorySession?.date }} • {{ selectedHistorySession?.reference }}
            </p>
          </div>
          <button @click="showLeaderboardModal = false" class="text-slate-400 hover:text-slate-600 p-1.5 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
          <div 
            v-for="(p, idx) in historyLeaderboard" 
            :key="p.participant_id" 
            class="flex justify-between items-center px-4 py-2.5 rounded-xl border text-xs"
            :class="p.participant_id == currentParticipant?.id 
              ? 'border-paragon-medium bg-paragon-ice text-paragon-dark font-extrabold shadow-inner' 
              : 'border-slate-100 bg-slate-50'"
          >
            <div class="flex items-center space-x-2 font-bold">
              <span class="text-slate-400 w-4 font-black">#{{ idx + 1 }}</span>
              <span>{{ p.name }}</span>
              <span v-if="p.participant_id == currentParticipant?.id" class="text-[9px] bg-paragon-medium text-white px-1.5 py-0.5 rounded-full font-bold">Anda</span>
            </div>
            <div class="text-right">
              <div class="font-black text-slate-700">{{ p.total_score }} Pts</div>
              <div class="text-[9px] text-slate-400">Benar: {{ p.correct_answers }}/{{ p.total_answered }}</div>
            </div>
          </div>
        </div>

        <button 
          @click="showLeaderboardModal = false" 
          class="w-full py-2.5 bg-paragon-dark hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
