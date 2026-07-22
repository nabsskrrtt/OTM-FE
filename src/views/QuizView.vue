<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Hourglass, Trophy, ArrowLeft, Send, CheckCircle2, XCircle } from 'lucide-vue-next'

const router = useRouter()
const API_BASE = 'http://localhost:3000/api'

// Participant info
const participant = ref(null)

// Live Quiz State
const sessionActive = ref(false)
const sessionData = ref(null)
const currentQuestion = ref(null)
const timeLeft = ref(20)
const answersSubmitted = ref({}) // tracks answers submitted in this browser tab/session { [questionId]: { answer, feedback } }
const shortAnswerInput = ref('')
const feedback = ref(null) // feedback for the current question { is_correct, score, correct_answer, explanation }
const leaderboard = ref([]) // Top 3 or full leaderboard
const joinedParticipants = ref([]) // participants in waiting room / active session
const loading = ref(false)

// Timer setup
let pollInterval = null
let timerInterval = null
let questionStartTime = null

// Progress bar width helper
const timerProgressWidth = computed(() => {
  if (!currentQuestion.value) return 0
  const limit = currentQuestion.value.time_limit || 20
  return (timeLeft.value / limit) * 100
})

// Check session state and poll
async function fetchActiveSession() {
  try {
    const url = participant.value
      ? `${API_BASE}/sessions/active?participant_id=${participant.value.id}`
      : `${API_BASE}/sessions/active`
    const res = await fetch(url)
    if (!res.ok) return

    const data = await res.json()
    if (!data.active) {
      // Session ended or does not exist
      sessionActive.value = false
      currentQuestion.value = null
      feedback.value = null
      return
    }

    sessionActive.value = true
    const oldSession = sessionData.value
    sessionData.value = data.session
    joinedParticipants.value = data.participants || []

    // If session is active and leaderboard is showing
    if (data.session.status === 'active' && data.session.show_leaderboard) {
      currentQuestion.value = null
      feedback.value = null
      if (timerInterval) clearInterval(timerInterval)
      fetchLeaderboard()
    }
    // If session is active and quiz is in progress (current_question_index >= 0)
    else if (data.session.status === 'active' && data.session.question) {
      const newQ = data.session.question
      
      // If we switched to a new question
      if (!currentQuestion.value || currentQuestion.value.id !== newQ.id) {
        currentQuestion.value = newQ
        shortAnswerInput.value = ''
        
        // Restore feedback if already answered
        const savedFeedback = answersSubmitted.value[newQ.id]
        if (savedFeedback) {
          feedback.value = savedFeedback
          if (timerInterval) clearInterval(timerInterval);
          timeLeft.value = 0
        } else {
          feedback.value = null
          // Start timer
          startQuestionTimer(newQ.time_limit)
        }
      }
    } else if (data.session.status === 'finished') {
      // Quiz completed!
      currentQuestion.value = null
      feedback.value = null
      if (timerInterval) clearInterval(timerInterval)
      fetchLeaderboard()
    } else {
      // Waiting room lobby
      currentQuestion.value = null
      feedback.value = null
      if (timerInterval) clearInterval(timerInterval)
    }
  } catch (err) {
    console.error("Gagal sinkronisasi sesi live:", err)
  }
}

// Start visual timer countdown
function startQuestionTimer(limit) {
  if (timerInterval) clearInterval(timerInterval)
  timeLeft.value = limit
  questionStartTime = Date.now()

  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - questionStartTime) / 1000
    timeLeft.value = Math.max(0, limit - elapsed)
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval)
      // Auto-submit as AFK / Timeout
      submitAnswer("__TIMEOUT__")
    }
  }, 100)
}

// Submit participant answer
async function submitAnswer(answerText) {
  if (!currentQuestion.value || feedback.value) return
  if (timerInterval) clearInterval(timerInterval)

  const timeLimit = currentQuestion.value.time_limit || 20
  let timeTaken = 0
  if (questionStartTime) {
    timeTaken = (Date.now() - questionStartTime) / 1000
  }
  if (answerText === "__TIMEOUT__") {
    timeTaken = timeLimit
  }

  try {
    loading.value = true
    const res = await fetch(`${API_BASE}/sessions/active/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: participant.value.id,
        question_id: currentQuestion.value.id,
        answer: answerText === "__TIMEOUT__" ? "" : answerText,
        time_taken: Math.min(timeLimit, parseFloat(timeTaken.toFixed(2)))
      })
    })

    if (res.ok) {
      const data = await res.json()
      feedback.value = {
        is_correct: data.is_correct,
        score: data.score,
        correct_answer: data.correct_answer,
        explanation: data.explanation,
        selected_answer: answerText === "__TIMEOUT__" ? "Waktu Habis (AFK)" : answerText
      }
      // Persist answer in tab state
      answersSubmitted.value[currentQuestion.value.id] = feedback.value
      // Save state to local cache
      localStorage.setItem(`otm_ans_${sessionData.value.id}_${currentQuestion.value.id}`, JSON.stringify(feedback.value))
    }
  } catch (err) {
    console.error("Gagal kirim jawaban:", err)
  } finally {
    loading.value = false
  }
}

// Fetch session leaderboard
async function fetchLeaderboard() {
  if (!sessionData.value) return
  try {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionData.value.id}/active-stats`)
    if (res.ok) {
      const data = await res.json()
      leaderboard.value = data.participants || []
    }
  } catch (err) {
    console.error("Gagal memuat leaderboard:", err)
  }
}

const participantsList = ref([])
const selectedParticipantId = ref('')
const showLogin = ref(false)

async function fetchParticipants() {
  try {
    const res = await fetch(`${API_BASE}/participants`)
    if (res.ok) {
      participantsList.value = await res.json()
    }
  } catch (err) {
    console.error("Gagal memuat peserta:", err)
  }
}

async function handleJoinSubmit() {
  if (!selectedParticipantId.value) return
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
      participant.value = data.participant
      localStorage.setItem('otm_participant', JSON.stringify(data.participant))
      showLogin.value = false
      fetchActiveSession()
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Validate login
  const saved = localStorage.getItem('otm_participant')
  if (!saved) {
    showLogin.value = true
    fetchParticipants()
  } else {
    participant.value = JSON.parse(saved)
  }

  // Restore answer cache from localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('otm_ans_')) {
        const parts = key.split('_')
        const qId = parts[3]
        answersSubmitted.value[qId] = JSON.parse(localStorage.getItem(key))
      }
    }
  } catch (e) {}

  fetchActiveSession()
  // Poll session state every 1.5 seconds for real-time response
  pollInterval = setInterval(fetchActiveSession, 1500)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6">
    <!-- Inline Fallback Login Selector -->
    <div 
      v-if="showLogin" 
      class="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6"
    >
      <div class="text-center space-y-2">
        <h2 class="text-2xl font-extrabold text-paragon-dark">Portal Kuis Live</h2>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Silakan pilih nama Anda terlebih dahulu untuk langsung masuk ke sesi kuis live yang aktif.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pilih Nama Anda</label>
          <select 
            v-model="selectedParticipantId" 
            class="w-full bg-slate-50 border border-slate-200 focus:border-paragon-medium text-slate-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none"
          >
            <option value="" disabled>-- Pilih Nama Anda --</option>
            <option v-for="p in participantsList" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <button 
          @click="handleJoinSubmit" 
          :disabled="!selectedParticipantId || loading"
          class="w-full py-3 bg-paragon-medium text-white font-bold rounded-xl shadow-lg hover:bg-paragon-dark active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center"
        >
          <span>Mulai Kuis</span>
        </button>
      </div>
    </div>

    <!-- Live Quiz States -->
    <template v-else>
      <!-- 1. Lobby Waiting Screen (index = -1) -->
      <div 
        v-if="sessionActive && sessionData && (sessionData.status === 'draft' || sessionData.current_question_index === -1)" 
        class="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-6"
      >
        <div class="relative w-24 h-24 mx-auto bg-paragon-ice rounded-3xl flex items-center justify-center">
          <span class="absolute w-20 h-20 border-4 border-paragon-light/30 border-t-paragon-medium rounded-full animate-spin"></span>
          <Hourglass class="w-8 h-8 text-paragon-medium animate-pulse" />
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-black text-paragon-dark">Menunggu PIC Memulai</h2>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            Sesi live terhubung. Bersiaplah untuk menjawab 5 sampai 10 pertanyaan sharing Parmasys!
          </p>
        </div>

        <!-- Realtime Display of Joined Participants -->
        <div class="space-y-3 pt-4 border-t border-slate-100 text-left">
          <h3 class="text-xs font-black uppercase text-slate-400 tracking-wider">
            Peserta Bergabung ({{ joinedParticipants.length }})
          </h3>
          <div v-if="joinedParticipants.length === 0" class="text-slate-400 text-xs font-semibold py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
            Menunggu peserta lain masuk...
          </div>
          <div v-else class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            <div 
              v-for="p in joinedParticipants" 
              :key="p.id" 
              class="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 truncate text-center"
            >
              {{ p.name }}
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-left text-xs text-slate-600">
          <div class="flex justify-between"><span>Parmasys Ref:</span> <strong class="text-slate-800">{{ sessionData.reference }}</strong></div>
          <div class="flex justify-between"><span>PIC Briefing:</span> <strong class="text-slate-800">{{ sessionData.pic_karyawan }} &amp; {{ sessionData.pic_intern }}</strong></div>
          <div class="flex justify-between"><span>Tanggal Sesi:</span> <strong class="text-slate-800">{{ sessionData.date }}</strong></div>
        </div>
      </div>

      <!-- 1.5. Temporary Leaderboard Screen -->
      <div 
        v-else-if="sessionActive && sessionData && sessionData.status === 'active' && sessionData.show_leaderboard" 
        class="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6 text-center"
      >
        <div class="space-y-2">
          <Trophy class="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
          <h2 class="text-2xl font-black text-paragon-dark">Leaderboard Sementara</h2>
          <p class="text-xs text-slate-500">
            Berikut adalah posisi sementara! Bersiaplah untuk pertanyaan berikutnya.
          </p>
        </div>

        <!-- Podium Top 3 Layout for Temporary Leaderboard -->
        <div class="grid grid-cols-3 gap-2 items-end pt-4 pb-6 max-w-sm mx-auto">
          <!-- 2nd Place -->
          <div class="flex flex-col items-center">
            <div class="text-xs font-bold text-slate-600 truncate w-full max-w-20">{{ leaderboard[1]?.name || 'Peserta' }}</div>
            <div class="text-[10px] font-black text-paragon-medium">{{ leaderboard[1]?.current_score || 0 }} Pts</div>
            <div class="w-full bg-slate-100 border border-slate-200/50 rounded-t-xl h-16 flex items-center justify-center mt-2">
              <span class="text-xl font-extrabold text-slate-400">2</span>
            </div>
          </div>
          <!-- 1st Place -->
          <div class="flex flex-col items-center">
            <div class="text-xs font-extrabold text-amber-600 truncate w-full max-w-20">{{ leaderboard[0]?.name || 'Peserta' }}</div>
            <div class="text-xs font-black text-amber-500">{{ leaderboard[0]?.current_score || 0 }} Pts</div>
            <div class="w-full bg-amber-50 border border-amber-200 rounded-t-xl h-24 flex items-center justify-center mt-2 relative shadow-md">
              <span class="text-3xl font-black text-amber-500">1</span>
              <span class="absolute -top-3 text-lg">👑</span>
            </div>
          </div>
          <!-- 3rd Place -->
          <div class="flex flex-col items-center">
            <div class="text-xs font-bold text-slate-600 truncate w-full max-w-20">{{ leaderboard[2]?.name || 'Peserta' }}</div>
            <div class="text-[10px] font-black text-paragon-medium">{{ leaderboard[2]?.current_score || 0 }} Pts</div>
            <div class="w-full bg-slate-50 border border-slate-100 rounded-t-xl h-12 flex items-center justify-center mt-2">
              <span class="text-lg font-extrabold text-slate-400">3</span>
            </div>
          </div>
        </div>

        <!-- Rest of the Participants List -->
        <div v-if="leaderboard.length > 3" class="text-left space-y-2 border-t border-slate-100 pt-4">
          <h3 class="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Peringkat Lainnya</h3>
          <div class="space-y-1.5 max-h-40 overflow-y-auto">
            <div 
              v-for="(p, idx) in leaderboard.slice(3)" 
              :key="p.id" 
              class="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-lg text-xs"
            >
              <div class="font-semibold text-slate-700">
                <span class="text-slate-400 mr-2">#{{ idx + 4 }}</span>
                <span>{{ p.name }}</span>
              </div>
              <div class="font-bold text-paragon-medium">{{ p.current_score }} Pts</div>
            </div>
          </div>
        </div>

        <div class="text-center py-4 space-y-2 border-t border-slate-100">
          <span class="inline-block w-5 h-5 border-2 border-slate-200 border-t-paragon-medium rounded-full animate-spin"></span>
          <p class="text-xs text-slate-500 font-bold">Menunggu admin melanjutkan ke pertanyaan berikutnya...</p>
        </div>
      </div>

    <!-- 2. Question View Screen -->
    <div v-else-if="sessionActive && currentQuestion" class="space-y-4">
      <!-- Session Bar -->
      <div class="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1">
        <span>Soal {{ (sessionData?.current_question_index || 0) + 1 }} dari {{ sessionData?.total_questions || 5 }}</span>
        <span>{{ currentQuestion.points }} Points</span>
      </div>

      <!-- Question Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <!-- Timer Bar -->
        <div class="h-2 bg-slate-100 w-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r transition-all duration-100" 
            :class="timeLeft <= 5 ? 'from-red-500 to-red-600 bg-red-500' : 'from-paragon-light to-paragon-medium bg-paragon-medium'"
            :style="{ width: `${timerProgressWidth}%` }"
          ></div>
        </div>

        <div class="p-6 md:p-8 space-y-6">
          <!-- Question Image if available -->
          <div v-if="currentQuestion.image_path" class="w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
            <img 
              :src="`http://localhost:3000${currentQuestion.image_path}`" 
              alt="Context illustration" 
              class="w-full h-auto max-h-60 object-contain mx-auto"
            />
          </div>

          <!-- Question Text + Countdown Circle/Box -->
          <div class="flex justify-between items-start gap-4">
            <h2 class="text-lg md:text-xl font-black text-paragon-dark leading-snug flex-1">
              {{ currentQuestion.question_text }}
            </h2>

            <!-- Numerical Countdown Box -->
            <div 
              v-if="!feedback && timeLeft > 0"
              class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-black text-lg flex-shrink-0 transition-all duration-300 shadow-sm"
              :class="timeLeft <= 5 
                ? 'border-red-500 text-red-500 bg-red-50 animate-bounce scale-110' 
                : 'border-slate-200 text-slate-700 bg-slate-50'"
            >
              <span>{{ Math.ceil(timeLeft) }}</span>
              <span class="text-[8px] uppercase tracking-wider opacity-75 leading-none mt-0.5">detik</span>
            </div>
          </div>

          <!-- Inputs Layer (if NOT answered yet) -->
          <div v-if="!feedback" class="space-y-3">
            <!-- TYPE A: Multiple Choice -->
            <div v-if="currentQuestion.question_type === 'multiple_choice'" class="grid grid-cols-1 gap-3">
              <button 
                v-for="(opt, idx) in currentQuestion.options" 
                :key="idx"
                @click="submitAnswer(opt)"
                :disabled="loading"
                class="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-paragon-medium hover:bg-paragon-ice/30 active:scale-[0.98] transition-all text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                <span class="inline-flex w-6 h-6 items-center justify-center bg-slate-100 rounded-lg text-slate-500 mr-3 text-xs uppercase">{{ String.fromCharCode(65 + idx) }}</span>
                <span>{{ opt }}</span>
              </button>
            </div>

            <!-- TYPE B: True or False -->
            <div v-else-if="currentQuestion.question_type === 'true_false'" class="grid grid-cols-2 gap-4">
              <button 
                @click="submitAnswer('True')" 
                :disabled="loading"
                class="py-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl text-emerald-800 font-extrabold text-lg active:scale-95 transition-all text-center"
              >
                BENAR (True)
              </button>
              <button 
                @click="submitAnswer('False')" 
                :disabled="loading"
                class="py-5 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl text-red-800 font-extrabold text-lg active:scale-95 transition-all text-center"
              >
                SALAH (False)
              </button>
            </div>

            <!-- TYPE C: Short Answer -->
            <div v-else-if="currentQuestion.question_type === 'short_answer'" class="flex space-x-3">
              <input 
                v-model="shortAnswerInput" 
                type="text" 
                placeholder="Ketik jawaban Anda..."
                :disabled="loading"
                class="flex-1 bg-slate-50 border border-slate-200 focus:border-paragon-medium focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                @keyup.enter="submitAnswer(shortAnswerInput)"
              />
              <button 
                @click="submitAnswer(shortAnswerInput)" 
                :disabled="!shortAnswerInput.trim() || loading"
                class="px-5 bg-paragon-medium text-white rounded-xl hover:bg-paragon-dark active:scale-95 transition-all flex items-center justify-center"
              >
                <Send class="w-4 h-4" />
              </button>
            </div>

            <!-- TYPE D: Polling -->
            <div v-else-if="currentQuestion.question_type === 'polling'" class="grid grid-cols-1 gap-3">
              <button 
                v-for="(opt, idx) in currentQuestion.options" 
                :key="idx"
                @click="submitAnswer(opt)"
                :disabled="loading"
                class="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-paragon-medium hover:bg-paragon-ice/30 active:scale-[0.98] transition-all text-sm font-bold text-slate-700"
              >
                <span>{{ opt }}</span>
              </button>
            </div>
          </div>

          <!-- Feedback & Explanation Card (shown once submitted) -->
          <div v-else class="space-y-6 pt-4 border-t border-slate-100">
            <!-- Correct / Incorrect Header banner -->
            <div 
              v-if="currentQuestion.question_type !== 'polling'"
              class="flex items-center space-x-3 p-4 rounded-xl border shadow-inner"
              :class="feedback.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'"
            >
              <CheckCircle2 v-if="feedback.is_correct" class="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <XCircle v-else class="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <h4 class="font-extrabold text-base leading-tight">
                  {{ feedback.is_correct ? 'Jawaban Benar!' : 'Jawaban Salah!' }}
                </h4>
                <p class="text-xs font-semibold opacity-90 mt-0.5">
                  Anda mendapatkan <strong class="underline">{{ feedback.score }}</strong> poin pada soal ini.
                </p>
              </div>
            </div>

            <!-- Polling acknowledgement -->
            <div 
              v-else 
              class="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl"
            >
              <CheckCircle2 class="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <h4 class="font-extrabold text-base leading-tight">Pendapat Anda Disimpan!</h4>
                <p class="text-xs font-semibold opacity-90 mt-0.5">
                  Mendapatkan {{ feedback.score }} poin atas kontribusi polling.
                </p>
              </div>
            </div>

            <!-- Submissions Details -->
            <div class="text-xs font-bold text-slate-500 space-y-1">
              <div>Jawaban Anda: <span class="text-slate-800">{{ feedback.selected_answer }}</span></div>
              <div v-if="currentQuestion.question_type !== 'polling'">Jawaban Benar: <span class="text-emerald-600 font-extrabold">{{ feedback.correct_answer }}</span></div>
            </div>

            <!-- Explanation Card (Penjelasan Field) -->
            <div v-if="feedback.explanation" class="p-5 bg-paragon-ice/50 border border-paragon-light/10 rounded-xl space-y-2">
              <span class="text-[10px] font-black text-paragon-medium uppercase tracking-widest">Penjelasan Sharing</span>
              <p class="text-xs md:text-sm font-semibold text-slate-700 leading-relaxed">
                {{ feedback.explanation }}
              </p>
            </div>

            <!-- Lobby Spinner -->
            <div class="text-center py-4 space-y-2 border-t border-slate-100">
              <span class="inline-block w-5 h-5 border-2 border-slate-200 border-t-paragon-medium rounded-full animate-spin"></span>
              <p class="text-xs text-slate-500 font-bold">Menunggu admin melanjutkan ke pertanyaan berikutnya...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Final Leaderboard Screen -->
    <div 
      v-else-if="sessionActive && sessionData && sessionData.status === 'finished'" 
      class="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6 text-center"
    >
      <div class="space-y-2">
        <Trophy class="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
        <h2 class="text-2xl font-black text-paragon-dark">Hasil Akhir Sesi</h2>
        <p class="text-xs text-slate-500">
          Selamat kepada pemenang sharing Parmasys minggu ini!
        </p>
      </div>

      <!-- Podium Top 3 Layout -->
      <div class="grid grid-cols-3 gap-2 items-end pt-4 pb-6 max-w-sm mx-auto">
        <!-- 2nd Place -->
        <div class="flex flex-col items-center">
          <div class="text-xs font-bold text-slate-600 truncate w-full max-w-20">{{ leaderboard[1]?.name || 'Peserta' }}</div>
          <div class="text-[10px] font-black text-paragon-medium">{{ leaderboard[1]?.current_score || 0 }} Pts</div>
          <div class="w-full bg-slate-100 border border-slate-200/50 rounded-t-xl h-16 flex items-center justify-center mt-2">
            <span class="text-xl font-extrabold text-slate-400">2</span>
          </div>
        </div>
        <!-- 1st Place -->
        <div class="flex flex-col items-center">
          <div class="text-xs font-extrabold text-amber-600 truncate w-full max-w-20">{{ leaderboard[0]?.name || 'Peserta' }}</div>
          <div class="text-xs font-black text-amber-500">{{ leaderboard[0]?.current_score || 0 }} Pts</div>
          <div class="w-full bg-amber-50 border border-amber-200 rounded-t-xl h-24 flex items-center justify-center mt-2 relative shadow-md">
            <span class="text-3xl font-black text-amber-500">1</span>
            <span class="absolute -top-3 text-lg">👑</span>
          </div>
        </div>
        <!-- 3rd Place -->
        <div class="flex flex-col items-center">
          <div class="text-xs font-bold text-slate-600 truncate w-full max-w-20">{{ leaderboard[2]?.name || 'Peserta' }}</div>
          <div class="text-[10px] font-black text-paragon-medium">{{ leaderboard[2]?.current_score || 0 }} Pts</div>
          <div class="w-full bg-slate-50 border border-slate-100 rounded-t-xl h-12 flex items-center justify-center mt-2">
            <span class="text-lg font-extrabold text-slate-400">3</span>
          </div>
        </div>
      </div>

      <!-- Rest of the Participants List -->
      <div v-if="leaderboard.length > 3" class="text-left space-y-2 border-t border-slate-100 pt-4">
        <h3 class="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Peringkat Lainnya</h3>
        <div class="space-y-1.5 max-h-40 overflow-y-auto">
          <div 
            v-for="(p, idx) in leaderboard.slice(3)" 
            :key="p.id" 
            class="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-lg text-xs"
          >
            <div class="font-semibold text-slate-700">
              <span class="text-slate-400 mr-2">#{{ idx + 4 }}</span>
              <span>{{ p.name }}</span>
            </div>
            <div class="font-bold text-paragon-medium">{{ p.current_score }} Pts</div>
          </div>
        </div>
      </div>

      <button 
        @click="router.push('/')" 
        class="w-full py-3 bg-paragon-dark text-white font-bold rounded-xl shadow-lg flex items-center justify-center space-x-2"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Kembali ke Portal</span>
      </button>
    </div>

    <!-- 4. Default Offline / Inactive Session Screen -->
    <div 
      v-else 
      class="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-4"
    >
      <Trophy class="w-12 h-12 text-slate-300 mx-auto" />
      <h2 class="text-xl font-bold text-slate-700">Sesi Live Tidak Aktif</h2>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Koneksi terputus atau sesi telah dihentikan oleh Admin.
      </p>
      <button 
        @click="router.push('/')" 
        class="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-all"
      >
        Kembali ke Portal
      </button>
    </div>
    </template>
  </div>
</template>
