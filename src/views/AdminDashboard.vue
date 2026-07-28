<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Play, FastForward, Users, ListCollapse, Award, 
  Trash2, Upload, FileSpreadsheet, Database, LogOut, Plus, Edit2, Check, X, ShieldAlert,
  Tv, Minimize2, QrCode, GripVertical, Trophy
} from 'lucide-vue-next'
import { soundEffects } from '../utils/soundEffects'

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = `${API_HOST}/api`
const locationOrigin = window.location.origin

// Auth Check
onMounted(() => {
  const token = localStorage.getItem('otm_admin_token')
  if (!token) {
    router.push('/admin/login')
    return
  }
  
  const params = new URLSearchParams(window.location.search)
  if (params.get('presentation') === 'true') {
    showPresentationMode.value = true
  }

  fetchAllData()
  // Poll active session stats
  pollInterval = setInterval(fetchLiveStats, 1500)
  
  // Real-time synchronization for presentation view in a separate tab
  if (showPresentationMode.value) {
    presentationSyncInterval = setInterval(fetchActiveSessionForPresentation, 1500)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (presentationSyncInterval) clearInterval(presentationSyncInterval)
  if (presentationTimerInterval) clearInterval(presentationTimerInterval)
})

// Tab Navigation
const activeTab = ref('control') // 'control', 'questions', 'participants', 'reports'

// State
const sessions = ref([])
const activeSession = ref(null)
const liveStats = ref(null)
const participants = ref([])
const questions = ref([])
const monthlyLeaderboard = ref([])

// Presentation Mode States
const showPresentationMode = ref(false)
const presentationTimeLeft = ref(20)
let presentationTimerInterval = null
let presentationSyncInterval = null
let currentQuestionIdForTimer = null

// Form states
const sessionForm = ref({ date: new Date().toISOString().split('T')[0], pic_karyawan: '', pic_intern: '', reference: '' })
const participantForm = ref({ name: '' })
const editingParticipant = ref(null)

// Drag and drop index tracker
const draggedIndex = ref(null)

// Question Form State (defaults to 2 options for MCQ)
const questionForm = ref({
  id: null,
  question_text: '',
  question_type: 'multiple_choice',
  options: ['', ''], // Default to 2 options
  correct_answer: '',
  explanation: '',
  time_limit: 20,
  points: 1000,
  sort_order: 1
})
const imageFile = ref(null)
const selectedSessionIdForQuestions = ref('')
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM
const csvFile = ref(null)

// UI Helpers
const showAddQuestionModal = ref(false)
const isEditingQuestion = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
let pollInterval = null

// Filter participant lists for dropdown selection (Karyawan Tetap vs Intern)
const permanentEmployeeList = computed(() => {
  return participants.value.filter(p => !p.name.toLowerCase().includes('intern'))
})
const internEmployeeList = computed(() => {
  return participants.value.filter(p => p.name.toLowerCase().includes('intern'))
})
const picKaryawanChoices = computed(() => permanentEmployeeList.value.length ? permanentEmployeeList.value : participants.value)
const picInternChoices = computed(() => internEmployeeList.value.length ? internEmployeeList.value : participants.value)

// Dynamic MCQ options filters
const mcqAnswerChoices = computed(() => {
  if (questionForm.value.question_type === 'true_false') {
    return ['True', 'False']
  }
  return questionForm.value.options.filter(o => o.trim() !== '')
})

// QR Code redirect link points directly to /quiz
const qrJoinUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/quiz')}`
})

const isLastQuestion = computed(() => {
  if (!activeSession.value || questions.value.length === 0) return false
  return activeSession.value.current_question_index === questions.value.length - 1
})

// Sort order limit validator
const maxAllowedSortOrder = computed(() => {
  return isEditingQuestion.value ? questions.value.length : questions.value.length + 1
})

// Load all database items
function fetchAllData() {
  fetchSessions()
  fetchParticipants()
  fetchMonthlyLeaderboard()
}

async function fetchSessions() {
  try {
    const res = await fetch(`${API_BASE}/admin/sessions`)
    if (res.ok) {
      sessions.value = await res.json()
      // Detect if there is a currently running session
      const active = sessions.value.find(s => s.status === 'active' || s.status === 'draft')
      if (active) {
        activeSession.value = active
        selectedSessionIdForQuestions.value = active.id
        fetchQuestions(active.id)
      } else if (sessions.value.length > 0 && !selectedSessionIdForQuestions.value) {
        selectedSessionIdForQuestions.value = sessions.value[0].id
        fetchQuestions(sessions.value[0].id)
      }
    }
  } catch (err) {
    console.error("Gagal memuat sesi:", err)
  }
}

async function fetchParticipants() {
  try {
    const res = await fetch(`${API_BASE}/participants`)
    if (res.ok) participants.value = await res.json()
  } catch (err) {
    console.error("Gagal memuat peserta:", err)
  }
}

async function fetchQuestions(sessionId) {
  if (!sessionId) return
  try {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}/questions`)
    if (res.ok) {
      questions.value = await res.json()
    }
  } catch (err) {
    console.error("Gagal memuat soal:", err)
  }
}

async function fetchLiveStats() {
  if (!activeSession.value) {
    liveStats.value = null
    return
  }
  try {
    const res = await fetch(`${API_BASE}/admin/sessions/${activeSession.value.id}/active-stats`)
    if (res.ok) {
      liveStats.value = await res.json()
      
      // Sync presentation timer when question index changes
      if (liveStats.value.session_status === 'active' && liveStats.value.submissions) {
        const qId = liveStats.value.submissions.question_id
        if (currentQuestionIdForTimer !== qId) {
          currentQuestionIdForTimer = qId
          // Fetch question time limit to trigger countdown
          const currentQ = questions.value.find(q => q.id === qId)
          const limit = currentQ ? currentQ.time_limit : 20
          startPresentationTimer(limit)
        }
      }
      
      // If server finished the session, sync locally
      if (liveStats.value.session_status === 'finished') {
        activeSession.value.status = 'finished'
      }
    }
  } catch (err) {
    console.error("Gagal sinkron stats live:", err)
  }
}

async function fetchMonthlyLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/reports/monthly?month=${selectedMonth.value}`)
    if (res.ok) monthlyLeaderboard.value = await res.json()
  } catch (err) {
    console.error("Gagal memuat leaderboard bulanan:", err)
  }
}

// Active session polling for presentation tab opened in separate window
async function fetchActiveSessionForPresentation() {
  try {
    const res = await fetch(`${API_BASE}/sessions/active`)
    if (res.ok) {
      const data = await res.json()
      if (data.active) {
        activeSession.value = data.session
        // Fetch questions for this session if empty
        if (questions.value.length === 0 || questions.value[0]?.session_id !== data.session.id) {
          fetchQuestions(data.session.id)
        }
      } else {
        activeSession.value = null
      }
    }
  } catch (err) {
    console.error("Gagal sinkron sesi presentasi:", err)
  }
}

// Start visual timer countdown inside Presentation mode
function startPresentationTimer(limit) {
  if (presentationTimerInterval) clearInterval(presentationTimerInterval)
  presentationTimeLeft.value = limit
  
  presentationTimerInterval = setInterval(() => {
    presentationTimeLeft.value = Math.max(0, presentationTimeLeft.value - 1)
    if (presentationTimeLeft.value <= 0) {
      clearInterval(presentationTimerInterval)
    }
  }, 1000)
}

// ----------------------------------------------------
// Action Handlers: Drag and Drop Question Reordering
// ----------------------------------------------------
function handleDragStart(event, index) {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

async function handleDrop(event, index) {
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  // Reorder locally
  const item = questions.value.splice(draggedIndex.value, 1)[0]
  questions.value.splice(index, 0, item)
  
  // Update sort order values (1-indexed)
  const reordered = questions.value.map((q, idx) => {
    q.sort_order = idx + 1
    return { id: q.id, sort_order: q.sort_order }
  })
  
  draggedIndex.value = null

  // Save reordered list to database
  try {
    const res = await fetch(`${API_BASE}/admin/questions/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: reordered })
    })
    if (res.ok) {
      successMsg.value = "Urutan soal berhasil diperbarui!"
      fetchQuestions(selectedSessionIdForQuestions.value)
    } else {
      errorMsg.value = "Gagal menyimpan urutan soal baru."
    }
  } catch (err) {
    errorMsg.value = "Koneksi ke backend gagal saat merubah urutan."
  }
}

// ----------------------------------------------------
// Action Handlers: Live Quiz Controller & Sessions CRUD
// ----------------------------------------------------
async function createSession() {
  errorMsg.value = ''
  successMsg.value = ''
  if (!sessionForm.value.pic_karyawan || !sessionForm.value.pic_intern) {
    errorMsg.value = "Silakan pilih PIC Karyawan Tetap dan PIC Intern."
    return
  }
  try {
    const res = await fetch(`${API_BASE}/admin/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionForm.value)
    })
    const data = await res.json()
    if (res.ok) {
      soundEffects.submit()
      successMsg.value = `Sesi baru "${data.reference}" berhasil diinisialisasi!`
      sessionForm.value.reference = ''
      fetchSessions()
    } else {
      errorMsg.value = data.error || "Gagal membuat sesi."
    }
  } catch (err) {
    errorMsg.value = "Koneksi backend gagal."
  }
}

async function updateSessionStatus(status, qIndex = null, showLeaderboard = null) {
  if (!activeSession.value) return
  const body = {}
  if (status !== null) body.status = status
  if (qIndex !== null) body.current_question_index = qIndex
  if (showLeaderboard !== null) body.show_leaderboard = showLeaderboard

  try {
    const res = await fetch(`${API_BASE}/admin/sessions/${activeSession.value.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (res.ok) {
      activeSession.value = data
      fetchSessions()
    }
  } catch (err) {
    console.error("Gagal update status sesi:", err)
  }
}

async function selectActiveSession(session) {
  errorMsg.value = ''
  successMsg.value = ''
  activeSession.value = session
  selectedSessionIdForQuestions.value = session.id
  fetchQuestions(session.id)
  fetchLiveStats()
}

async function deleteSession(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus sesi ini beserta semua soal dan jawaban terkait?")) return
  try {
    const res = await fetch(`${API_BASE}/admin/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      successMsg.value = "Sesi berhasil dihapus."
      if (activeSession.value?.id === id) activeSession.value = null
      fetchSessions()
    }
  } catch (err) {
    console.error("Gagal menghapus sesi:", err)
  }
}

function handleStartSession() {
  soundEffects.sessionStart()
  updateSessionStatus('active', -1, 0) // Open Waiting lobby
}

function handleStartQuiz() {
  soundEffects.sessionStart()
  updateSessionStatus('active', 0, 0) // Start Question 1
}

function handleNextQuestion() {
  if (!activeSession.value) return
  soundEffects.questionNext()
  const currentIdx = activeSession.value.current_question_index
  const isShowingLeaderboard = activeSession.value.show_leaderboard === 1 || activeSession.value.show_leaderboard === true

  if (!isShowingLeaderboard) {
    // Show leaderboard first
    updateSessionStatus('active', currentIdx, 1)
  } else {
    if (isLastQuestion.value) {
      handleEndSession()
    } else {
      // Go to next question
      fetchQuestions(activeSession.value.id).then(() => {
        const totalQ = questions.value.length
        if (currentIdx + 1 < totalQ) {
          updateSessionStatus('active', currentIdx + 1, 0)
        } else {
          updateSessionStatus('finished', totalQ, 0)
        }
      })
    }
  }
}

function handleEndSession() {
  updateSessionStatus('finished', questions.value.length)
}

function openPresentationNewTab() {
  window.open(window.location.pathname + '?presentation=true', '_blank')
}

// ----------------------------------------------------
// Action Handlers: Participant Manager CRUD & CSV
// ----------------------------------------------------
async function addParticipant() {
  if (!participantForm.value.name.trim()) return
  try {
    const res = await fetch(`${API_BASE}/admin/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: participantForm.value.name })
    })
    const data = await res.json()
    if (res.ok) {
      successMsg.value = `Peserta "${data.name}" berhasil ditambahkan.`
      participantForm.value.name = ''
      fetchParticipants()
    } else {
      errorMsg.value = data.error || "Gagal menambah peserta."
    }
  } catch (e) {
    errorMsg.value = "Koneksi backend gagal."
  }
}

async function startEditParticipant(p) {
  editingParticipant.value = { ...p }
}

async function saveEditParticipant() {
  if (!editingParticipant.value.name.trim()) return
  try {
    const res = await fetch(`${API_BASE}/admin/participants/${editingParticipant.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingParticipant.value.name })
    })
    if (res.ok) {
      editingParticipant.value = null
      fetchParticipants()
    } else {
      const data = await res.json()
      alert(data.error || "Gagal mengedit nama.")
    }
  } catch (e) {
    console.error(e)
  }
}

async function deleteParticipant(id) {
  if (!confirm("Hapus peserta ini? Semua riwayat jawabannya juga akan terhapus.")) return
  try {
    const res = await fetch(`${API_BASE}/admin/participants/${id}`, { method: 'DELETE' })
    if (res.ok) fetchParticipants()
  } catch (e) {
    console.error(e)
  }
}

async function handleCsvUpload() {
  if (!csvFile.value) return
  errorMsg.value = ''
  successMsg.value = ''

  const formData = new FormData()
  formData.append('file', csvFile.value)

  try {
    loading.value = true
    const res = await fetch(`${API_BASE}/admin/participants/csv`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (res.ok) {
      successMsg.value = `Berhasil mengimpor CSV. Ingested: ${data.inserted_count}, Duplikat Dilewati: ${data.skipped_duplicates}.`
      csvFile.value = null
      const fileInput = document.getElementById('csv_input')
      if (fileInput) fileInput.value = ''
      fetchParticipants()
    } else {
      errorMsg.value = data.error || "Gagal mengunggah CSV."
    }
  } catch (e) {
    errorMsg.value = "Gagal mengunggah file."
  } finally {
    loading.value = false
  }
}

function selectCsvFile(event) {
  csvFile.value = event.target.files[0]
}

// ----------------------------------------------------
// Action Handlers: Questions Manager (Dynamic Options)
// ----------------------------------------------------
function onSessionSelectForQuestions() {
  fetchQuestions(selectedSessionIdForQuestions.value)
}

function handleImageSelect(event) {
  imageFile.value = event.target.files[0]
}

// dynamic MCQ options count triggers with autofocus
function addQuestionOption() {
  if (questionForm.value.options.length < 6) {
    questionForm.value.options.push('')
    nextTick(() => {
      const inputs = document.querySelectorAll('.mcq-option-input')
      if (inputs.length) {
        inputs[inputs.length - 1].focus()
      }
    })
  }
}

function removeQuestionOptionSpecific(idx) {
  if (questionForm.value.options.length > 2) {
    questionForm.value.options.splice(idx, 1)
    questionForm.value.correct_answer = ''
  }
}

function openAddQuestion() {
  isEditingQuestion.value = false
  questionForm.value = {
    id: null,
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', ''], // Default to 2 options
    correct_answer: '',
    explanation: '',
    time_limit: 20,
    points: 1000,
    sort_order: questions.value.length + 1
  }
  imageFile.value = null
  showAddQuestionModal.value = true
}

function openEditQuestion(q) {
  isEditingQuestion.value = true
  questionForm.value = {
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: Array.isArray(q.options) && q.options.length ? [...q.options] : ['', ''],
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    time_limit: q.time_limit,
    points: q.points,
    sort_order: q.sort_order
  }
  imageFile.value = null
  showAddQuestionModal.value = true
}

async function saveQuestion() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!selectedSessionIdForQuestions.value) {
    alert("Silakan pilih sesi terlebih dahulu.")
    return
  }

  // Validation: Polling does not need a correct answer
  if (questionForm.value.question_type === 'polling') {
    questionForm.value.correct_answer = ''
  } else if (!questionForm.value.correct_answer) {
    alert("Jawaban Benar wajib dipilih/diisi.")
    return
  }

  const fd = new FormData()
  fd.append('question_text', questionForm.value.question_text)
  fd.append('question_type', questionForm.value.question_type)
  fd.append('correct_answer', questionForm.value.correct_answer)
  fd.append('explanation', questionForm.value.explanation)
  fd.append('time_limit', questionForm.value.time_limit)
  fd.append('points', questionForm.value.points)
  fd.append('sort_order', questionForm.value.sort_order)
  
  let finalOptions = questionForm.value.options
  if (questionForm.value.question_type === 'true_false') {
    finalOptions = ['True', 'False']
  } else if (questionForm.value.question_type === 'short_answer') {
    finalOptions = []
  }
  fd.append('options', JSON.stringify(finalOptions.filter(o => o.trim() !== '')))

  if (imageFile.value) {
    fd.append('image', imageFile.value)
  }

  try {
    loading.value = true
    let url = `${API_BASE}/admin/sessions/${selectedSessionIdForQuestions.value}/questions`
    let method = 'POST'

    if (isEditingQuestion.value) {
      url = `${API_BASE}/admin/questions/${questionForm.value.id}`
      method = 'PUT'
      if (!imageFile.value) {
        fd.append('keep_existing_image', 'true')
      }
    }

    const res = await fetch(url, { method, body: fd })

    if (res.ok) {
      successMsg.value = isEditingQuestion.value ? "Soal berhasil diperbarui!" : "Soal baru berhasil ditambahkan!"
      showAddQuestionModal.value = false
      fetchQuestions(selectedSessionIdForQuestions.value)
    } else {
      const data = await res.json()
      errorMsg.value = data.error || "Gagal menyimpan soal."
    }
  } catch (err) {
    errorMsg.value = "Koneksi ke server terputus."
  } finally {
    loading.value = false
  }
}

async function deleteQuestion(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus soal ini?")) return
  try {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      successMsg.value = "Soal berhasil dihapus."
      fetchQuestions(selectedSessionIdForQuestions.value)
    }
  } catch (e) {
    console.error(e)
  }
}

// ----------------------------------------------------
// Action Handlers: ESOT Reports & Backup Reset
// ----------------------------------------------------
function downloadMonthlyExcel() {
  window.open(`${API_BASE}/reports/export/excel?month=${selectedMonth.value}`, '_blank')
}

function downloadFullExcel() {
  window.open(`${API_BASE}/reports/export/excel`, '_blank')
}

async function triggerBackupAndWipe() {
  const code = prompt("⚠️ PERINGATAN: Tindakan ini akan mengarsipkan seluruh database ke file backup, lalu menghapus semua sesi kuis, daftar soal, dan nilai yang ada.\n\nKetik kata sandi Admin untuk mengonfirmasi reset database:")
  if (!code) return
  if (code !== 'admin123') {
    alert("Kode konfirmasi salah. Tindakan dibatalkan.")
    return
  }

  try {
    loading.value = true
    const res = await fetch(`${API_BASE}/admin/backup-wipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (res.ok && data.success) {
      alert(`Sukses! Database telah diarsipkan ke file: ${data.backup_file}\nSeluruh sesi kuis telah dibersihkan.`);
      activeSession.value = null
      fetchAllData()
    } else {
      alert("Gagal melakukan backup & wipe: " + (data.error || ""));
    }
  } catch (err) {
    alert("Koneksi backend gagal: " + err.message)
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('otm_admin_token')
  router.push('/')
}

function getOptionSubmitCount(option) {
  if (!liveStats.value?.submissions?.distribution) return 0
  const match = liveStats.value.submissions.distribution.find(
    d => d.answer.toString().toLowerCase() === option.toString().toLowerCase()
  )
  return match ? match.count : 0
}

function getOptionSubmitPercentage(option) {
  if (!liveStats.value?.submissions?.submissions_count) return 0
  const count = getOptionSubmitCount(option)
  const total = liveStats.value.submissions.submissions_count
  return Math.round((count / total) * 100)
}
</script>

<template>
  <div class="space-y-6">
    <!-- PRESENTATION SCREEN OVERLAY (SCREENSHARE SAFE) -->
    <div 
      v-if="showPresentationMode" 
      class="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans overflow-y-auto select-none"
    >
      <!-- Presentation Top Bar -->
      <div class="bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-950 font-black text-lg">P</div>
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-100">Paragon ETRM Live Presentasi</h2>
            <p class="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">OWN THE MORNING SYSTEM</p>
          </div>
        </div>
        
        <button 
          @click="showPresentationMode = false" 
          class="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
        >
          <Minimize2 class="w-3.5 h-3.5" />
          <span>Tutup Layar Presentasi</span>
        </button>
      </div>

      <!-- Presenter View body -->
      <div class="flex-1 flex flex-col p-6 md:p-12 items-center justify-center min-h-[80vh]">
        <!-- NO SESSION RUNNING -->
        <div v-if="!activeSession" class="text-center space-y-3 animate-pulse">
          <div class="text-slate-500 text-6xl">📺</div>
          <h2 class="text-2xl font-black text-slate-300">Menunggu Inisialisasi Kuis</h2>
          <p class="text-xs text-slate-400 max-w-sm">PIC sedang menyiapkan sesi kuis OTM minggu ini di dashboard kontrol.</p>
        </div>

        <!-- 1. WAITING LOBBY / ROOM (index = -1) -->
        <div 
          v-else-if="activeSession.status === 'draft' || activeSession.current_question_index === -1" 
          class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        >
          <!-- Left side: Invitation QR Code directly linking to /quiz -->
          <div class="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl border border-white/10 text-center space-y-6 flex flex-col items-center">
            <h3 class="text-lg font-black text-slate-800 tracking-tight uppercase">Pindai &amp; Gabung Kuis</h3>
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner">
              <img :src="qrJoinUrl" alt="QR Join link to /quiz" class="w-60 h-60 object-contain" />
            </div>
            <div class="space-y-1">
              <span class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tautan Akses</span>
              <p class="font-bold text-sm text-paragon-medium underline select-text">{{ locationOrigin }}/quiz</p>
            </div>
          </div>

          <!-- Right side: Session Meta & Connected List -->
          <div class="space-y-6 bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-white/5">
            <div class="space-y-2">
              <div class="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full w-max text-[9px] font-black tracking-widest uppercase">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Pendaftaran Live</span>
              </div>
              <h2 class="text-3xl font-black tracking-tight leading-tight">OTM: {{ activeSession.reference || 'Sharing Session' }}</h2>
              <p class="text-xs text-slate-400 font-semibold">
                PIC: {{ activeSession.pic_karyawan }} &amp; {{ activeSession.pic_intern }} • Tanggal: {{ activeSession.date }}
              </p>
            </div>

            <!-- Joined Grid -->
            <div class="space-y-3 pt-4 border-t border-white/5">
              <h3 class="text-xs font-black uppercase text-slate-400 tracking-wider">
                Peserta Masuk (Total: {{ liveStats?.participants?.length || 0 }})
              </h3>
              
              <div v-if="!liveStats?.participants || liveStats.participants.length === 0" class="text-slate-400 text-xs font-semibold py-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                Menunggu peserta memindai QR Code...
              </div>
              <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                <div 
                  v-for="p in liveStats.participants" 
                  :key="p.id" 
                  class="px-3.5 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-xs font-bold truncate text-slate-200 transition-all text-center animate-pulse"
                >
                  {{ p.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. LIVE QUESTION PRESENTING -->
        <div 
          v-else-if="activeSession.status === 'active' && activeSession.current_question_index >= 0" 
          class="w-full max-w-4xl space-y-8"
        >
          <!-- 2a. TEMPORARY LEADERBOARD -->
          <div v-if="activeSession.show_leaderboard" class="w-full max-w-3xl space-y-8 text-center mx-auto bg-slate-900 border border-white/5 p-8 md:p-12 rounded-3xl shadow-2xl">
            <div class="space-y-3">
              <Trophy class="w-16 h-16 text-amber-500 mx-auto animate-bounce" />
              <h2 class="text-4xl font-black text-white tracking-tight">Leaderboard Sementara</h2>
              <p class="text-slate-400 text-sm max-w-md mx-auto">Posisi sementara setelah Soal {{ activeSession.current_question_index + 1 }}!</p>
            </div>

            <!-- Podium Presentation -->
            <div class="grid grid-cols-3 gap-4 items-end pt-8 max-w-lg mx-auto">
              <!-- 2nd Place -->
              <div class="flex flex-col items-center">
                <div class="text-sm font-bold text-slate-300 truncate w-full max-w-24">{{ liveStats?.participants[1]?.name || '-' }}</div>
                <div class="text-xs font-black text-paragon-light">{{ liveStats?.participants[1]?.current_score || 0 }} Pts</div>
                <div class="w-full bg-slate-900 border border-white/10 rounded-t-2xl h-24 flex items-center justify-center mt-3 shadow-2xl">
                  <span class="text-3xl font-black text-slate-400">2</span>
                </div>
              </div>
              <!-- 1st Place -->
              <div class="flex flex-col items-center">
                <div class="text-base font-black text-amber-500 truncate w-full max-w-24">{{ liveStats?.participants[0]?.name || '-' }}</div>
                <div class="text-sm font-black text-amber-400">{{ liveStats?.participants[0]?.current_score || 0 }} Pts</div>
                <div class="w-full bg-amber-500/10 border border-amber-500/30 rounded-t-2xl h-36 flex items-center justify-center mt-3 relative shadow-2xl">
                  <span class="text-5xl font-black text-amber-500">1</span>
                  <span class="absolute -top-6 text-3xl animate-pulse">👑</span>
                </div>
              </div>
              <!-- 3rd Place -->
              <div class="flex flex-col items-center">
                <div class="text-sm font-bold text-slate-300 truncate w-full max-w-24">{{ liveStats?.participants[2]?.name || '-' }}</div>
                <div class="text-xs font-black text-paragon-light">{{ liveStats?.participants[2]?.current_score || 0 }} Pts</div>
                <div class="w-full bg-slate-950 border border-white/5 rounded-t-2xl h-16 flex items-center justify-center mt-3 shadow-2xl">
                  <span class="text-2xl font-black text-slate-500">3</span>
                </div>
              </div>
            </div>

            <!-- Rest of the Participants List -->
            <div v-if="liveStats?.participants && liveStats.participants.length > 3" class="text-left space-y-2 border-t border-white/10 pt-6 max-w-md mx-auto">
              <h3 class="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Peringkat Lainnya</h3>
              <div class="space-y-1.5 max-h-40 overflow-y-auto">
                <div 
                  v-for="(p, idx) in liveStats.participants.slice(3)" 
                  :key="p.id" 
                  class="flex justify-between items-center px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-200"
                >
                  <div class="truncate max-w-[200px]">
                    <span class="text-slate-400 mr-2">#{{ idx + 4 }}</span>
                    <span>{{ p.name }}</span>
                  </div>
                  <div class="text-paragon-light flex-shrink-0">{{ p.current_score }} Pts</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2b. The Active Question -->
          <div v-else class="space-y-6">
            <div class="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
              <span>Pertanyaan {{ activeSession.current_question_index + 1 }} dari {{ questions.length }}</span>
              <span class="px-2 py-0.5 bg-white/10 text-white rounded">{{ questions[activeSession.current_question_index]?.points }} Poin</span>
            </div>

            <div class="bg-slate-900 border border-white/5 p-6 md:p-10 rounded-3xl shadow-2xl space-y-6">
              <!-- Time Indicator (If active) -->
              <div class="flex justify-between items-center pb-4 border-b border-white/5">
                <h3 class="text-xl md:text-2xl font-black text-white leading-snug flex-1 mr-4">
                  {{ questions[activeSession.current_question_index]?.question_text }}
                </h3>

                <div 
                  class="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black text-xl flex-shrink-0"
                  :class="presentationTimeLeft <= 5 ? 'border-red-500 text-red-500 bg-red-950/20 animate-ping' : 'border-white/20 text-slate-100 bg-white/5'"
                >
                  <span>{{ presentationTimeLeft }}</span>
                  <span class="text-[8px] uppercase tracking-wide opacity-75 leading-none">detik</span>
                </div>
              </div>

              <!-- Optional Question Image -->
              <div v-if="questions[activeSession.current_question_index]?.image_path" class="w-full rounded-2xl overflow-hidden bg-slate-950 p-4 border border-white/5 max-h-64 flex items-center justify-center">
                <img 
                  :src="`${API_HOST}${questions[activeSession.current_question_index]?.image_path}`" 
                  alt="Presentation context" 
                  class="max-w-full max-h-60 object-contain"
                />
              </div>

              <!-- Choices Options -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="(o, idx) in questions[activeSession.current_question_index]?.options" 
                  :key="idx"
                  class="p-5 rounded-2xl border transition-all relative overflow-hidden"
                  :class="presentationTimeLeft === 0 
                    ? (questions[activeSession.current_question_index]?.question_type !== 'polling' && o === questions[activeSession.current_question_index]?.correct_answer ? 'border-emerald-500 bg-emerald-950/30 text-white' : 'border-white/5 bg-slate-950 text-slate-500')
                    : 'border-white/10 bg-white/5 text-slate-100'"
                >
                  <div class="relative z-10 flex justify-between items-center font-bold text-sm">
                    <div class="flex items-center">
                      <span class="inline-flex w-6 h-6 bg-white/10 rounded-lg text-xs items-center justify-center mr-3 font-extrabold">{{ String.fromCharCode(65 + idx) }}</span>
                      <span>{{ o }}</span>
                    </div>
                    <!-- Percentage count once timer is up -->
                    <div v-if="presentationTimeLeft === 0" class="text-right flex-shrink-0">
                      <span class="text-xs font-black">{{ getOptionSubmitCount(o) }} Peserta ({{ getOptionSubmitPercentage(o) }}%)</span>
                    </div>
                  </div>

                  <!-- Submission Bar Background Chart once timer is up -->
                  <div 
                    v-if="presentationTimeLeft === 0" 
                    class="absolute left-0 top-0 bottom-0 transition-all duration-500"
                    :class="questions[activeSession.current_question_index]?.question_type !== 'polling' && o === questions[activeSession.current_question_index]?.correct_answer ? 'bg-emerald-500/10' : 'bg-white/5'"
                    :style="{ width: `${getOptionSubmitPercentage(o)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Explanation feedback area after timer -->
              <div 
                v-if="presentationTimeLeft === 0 && questions[activeSession.current_question_index]?.explanation" 
                class="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2 animate-fade-in"
              >
                <h4 class="text-xs font-extrabold uppercase tracking-widest text-paragon-light">Penjelasan Jawaban</h4>
                <p class="text-xs md:text-sm font-semibold leading-relaxed text-slate-300">
                  {{ questions[activeSession.current_question_index]?.explanation }}
                </p>
              </div>

              <!-- Submission counts status bar -->
              <div class="flex justify-between items-center text-xs text-slate-400 font-bold border-t border-white/5 pt-4">
                <span>Pengiriman Jawaban: {{ liveStats?.submissions?.submissions_count || 0 }} / {{ liveStats?.submissions?.total_joined || 0 }}</span>
                <span v-if="questions[activeSession.current_question_index]?.question_type !== 'polling'">Kunci Jawaban Tampil Saat Waktu Habis</span>
                <span v-else>Polling Selesai Saat Waktu Habis</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. FINAL RESULTS / PODIUM -->
        <div 
          v-else-if="activeSession.status === 'finished'" 
          class="w-full max-w-3xl space-y-8 text-center"
        >
          <div class="space-y-3">
            <Trophy class="w-16 h-16 text-amber-500 mx-auto animate-bounce" />
            <h2 class="text-4xl font-black text-white tracking-tight">Kuis Selesai! Pemenang OTM</h2>
            <p class="text-slate-400 text-sm max-w-md mx-auto">Tepuk tangan untuk skor tertinggi sharing Parmasys minggu ini!</p>
          </div>

          <!-- Podium Presentation -->
          <div class="grid grid-cols-3 gap-4 items-end pt-8 max-w-lg mx-auto">
            <!-- 2nd Place -->
            <div class="flex flex-col items-center">
              <div class="text-sm font-bold text-slate-300 truncate w-full max-w-24">{{ liveStats?.participants[1]?.name || '-' }}</div>
              <div class="text-xs font-black text-paragon-light">{{ liveStats?.participants[1]?.current_score || 0 }} Pts</div>
              <div class="w-full bg-slate-900 border border-white/10 rounded-t-2xl h-24 flex items-center justify-center mt-3 shadow-2xl">
                <span class="text-3xl font-black text-slate-400">2</span>
              </div>
            </div>
            <!-- 1st Place -->
            <div class="flex flex-col items-center">
              <div class="text-base font-black text-amber-500 truncate w-full max-w-24">{{ liveStats?.participants[0]?.name || '-' }}</div>
              <div class="text-sm font-black text-amber-400">{{ liveStats?.participants[0]?.current_score || 0 }} Pts</div>
              <div class="w-full bg-amber-500/10 border border-amber-500/30 rounded-t-2xl h-36 flex items-center justify-center mt-3 relative shadow-2xl">
                <span class="text-5xl font-black text-amber-500">1</span>
                <span class="absolute -top-6 text-3xl animate-pulse">👑</span>
              </div>
            </div>
            <!-- 3rd Place -->
            <div class="flex flex-col items-center">
              <div class="text-sm font-bold text-slate-300 truncate w-full max-w-24">{{ liveStats?.participants[2]?.name || '-' }}</div>
              <div class="text-xs font-black text-paragon-light">{{ liveStats?.participants[2]?.current_score || 0 }} Pts</div>
              <div class="w-full bg-slate-950 border border-white/5 rounded-t-2xl h-16 flex items-center justify-center mt-3 shadow-2xl">
                <span class="text-2xl font-black text-slate-500">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN ADMIN CONTROL PANEL (NORMAL STATE) -->
    <!-- Top Admin Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-lg gap-4">
      <div>
        <h2 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-paragon-ice to-paragon-light">Dashboard Administrator</h2>
        <p class="text-xs text-dark-text-secondary font-medium mt-1">OTM Admin Panel</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button 
          @click="handleLogout" 
          class="px-4 py-2.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm hover:border-red-500/50"
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap gap-2 border-b border-dark-border pb-1 mt-6">
      <button 
        @click="activeTab = 'control'" 
        :class="activeTab === 'control' ? 'border-paragon-medium text-paragon-ice font-black bg-paragon-medium/10' : 'border-transparent text-dark-text-secondary hover:text-dark-text font-semibold'"
        class="px-4 py-2.5 rounded-xl border text-xs md:text-sm transition-all flex items-center space-x-2"
      >
        <Play class="w-4 h-4" />
        <span>Live Kontrol &amp; Sesi</span>
      </button>
      <button 
        @click="activeTab = 'questions'" 
        :class="activeTab === 'questions' ? 'border-paragon-medium text-paragon-ice font-black bg-paragon-medium/10' : 'border-transparent text-dark-text-secondary hover:text-dark-text font-semibold'"
        class="px-4 py-2.5 rounded-xl border text-xs md:text-sm transition-all flex items-center space-x-2"
      >
        <ListCollapse class="w-4 h-4" />
        <span>Kelola Soal</span>
      </button>
      <button 
        @click="activeTab = 'participants'" 
        :class="activeTab === 'participants' ? 'border-paragon-medium text-paragon-ice font-black bg-paragon-medium/10' : 'border-transparent text-dark-text-secondary hover:text-dark-text font-semibold'"
        class="px-4 py-2.5 rounded-xl border text-xs md:text-sm transition-all flex items-center space-x-2"
      >
        <Users class="w-4 h-4" />
        <span>Daftar Peserta</span>
      </button>
      <button 
        @click="activeTab = 'reports'" 
        :class="activeTab === 'reports' ? 'border-paragon-medium text-paragon-ice font-black bg-paragon-medium/10' : 'border-transparent text-dark-text-secondary hover:text-dark-text font-semibold'"
        class="px-4 py-2.5 rounded-xl border text-xs md:text-sm transition-all flex items-center space-x-2"
      >
        <Award class="w-4 h-4" />
        <span>ESOT &amp; Laporan</span>
      </button>
    </div>

    <!-- TAB 1: Live Control & Session CRUD -->
    <div v-if="activeTab === 'control'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Session Creator & Active Session state -->
      <div class="lg:col-span-1 space-y-6">
        <!-- New Session Form -->
        <div class="bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
          <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3">Inisialisasi Sesi Baru</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-paragon-light mb-1.5">Tanggal Sesi</label>
              <input 
                v-model="sessionForm.date" 
                type="date" 
                class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30"
              />
            </div>
            
            <!-- PIC Dropdowns -->
            <div>
              <label class="block text-xs font-bold text-paragon-light mb-1.5">PIC Karyawan Tetap</label>
              <select 
                v-model="sessionForm.pic_karyawan" 
                class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30 cursor-pointer"
              >
                <option value="" disabled>-- Pilih PIC Karyawan --</option>
                <option v-for="p in picKaryawanChoices" :key="p.id" :value="p.name">{{ p.name }}</option>
              </select>
            </div>
            
            <div>
              <label class="block text-xs font-bold text-paragon-light mb-1.5">PIC Intern</label>
              <select 
                v-model="sessionForm.pic_intern" 
                class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30 cursor-pointer"
              >
                <option value="" disabled>-- Pilih PIC Intern --</option>
                <option v-for="p in picInternChoices" :key="p.id" :value="p.name">{{ p.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-paragon-light mb-1.5">Parmasys Reference</label>
              <input 
                v-model="sessionForm.reference" 
                type="text" 
                placeholder="ex. Sharing Parmasys #42"
                class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30 placeholder-dark-text-secondary/30"
              />
            </div>

            <button 
              @click="createSession" 
              class="w-full py-2.5 bg-paragon-medium text-white font-bold rounded-xl text-xs hover:bg-paragon-dark shadow transition-all flex items-center justify-center space-x-1"
            >
              <Plus class="w-4 h-4" />
              <span>Inisialisasi Sesi</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Historical Sessions List -->
        <div class="bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-4">
          <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3">Daftar Semua Sesi</h3>
          
          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-2">
            <div 
              v-for="s in sessions" 
              :key="s.id" 
              class="p-3 border rounded-2xl flex items-center justify-between text-xs transition-all cursor-pointer"
              :class="activeSession?.id === s.id ? 'border-paragon-medium bg-paragon-medium/10 text-paragon-ice' : 'border-dark-border bg-dark-surface-hover hover:border-paragon-light/30 text-dark-text'"
            >
              <div class="space-y-1 flex-1 min-w-0" @click="selectActiveSession(s)">
                <div class="flex items-center space-x-2">
                  <span class="font-extrabold text-dark-text-secondary">{{ s.date }}</span>
                  <span 
                    class="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold"
                    :class="s.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : s.status === 'draft' ? 'bg-amber-500/20 text-amber-300' : 'bg-dark-border text-dark-text-secondary'"
                  >
                    {{ s.status }}
                  </span>
                </div>
                <h4 class="font-black truncate">{{ s.reference }}</h4>
                <p class="text-[10px] text-dark-text-secondary/70 truncate">PIC: {{ s.pic_karyawan }} &amp; {{ s.pic_intern }}</p>
              </div>
              
              <button 
                @click.stop="deleteSession(s.id)" 
                class="p-1.5 text-dark-text-secondary hover:text-red-400 rounded bg-dark-surface-hover border border-dark-border shadow-sm ml-2 hover:border-red-500/30"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Quiz Panel -->
      <div class="lg:col-span-2 bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
        <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3 flex items-center justify-between">
          <span>Kontrol Kuis Real-Time</span>
          <span 
            v-if="activeSession" 
            class="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-paragon-medium/20 text-paragon-ice"
          >
            Aktif: {{ activeSession.reference }}
          </span>
        </h3>

        <!-- No active session state -->
        <div v-if="!activeSession" class="text-center py-10 space-y-3">
          <p class="text-dark-text-secondary text-sm font-semibold">Belum ada sesi live kuis yang dipilih.</p>
          <p class="text-[11px] text-dark-text-secondary max-w-sm mx-auto">Silakan pilih salah satu sesi dari list di samping kiri, atau buat sesi baru.</p>
        </div>

        <!-- Active session workspace -->
        <div v-else class="space-y-6">
          <!-- Session details card with Presentation Buttons moved inside -->
          <div class="p-5 rounded-2xl bg-dark-surface border border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs flex-1">
              <div><span class="text-dark-text-secondary block mb-0.5">PIC Tetap &amp; Intern</span><strong class="text-dark-text">{{ activeSession.pic_karyawan }} &amp; {{ activeSession.pic_intern }}</strong></div>
              <div><span class="text-dark-text-secondary block mb-0.5">Parmasys Reference</span><strong class="truncate block max-w-[150px] text-dark-text">{{ activeSession.reference }}</strong></div>
              <div><span class="text-dark-text-secondary block mb-0.5">Status Sesi</span><strong class="uppercase text-paragon-light block">{{ activeSession.status }}</strong></div>
            </div>

            <!-- Presentation Trigger Buttons (Grouped on Session Card) -->
            <div class="flex items-center space-x-2 flex-shrink-0">
              <button 
                @click="showPresentationMode = true"
                class="px-3.5 py-2.5 bg-paragon-medium hover:bg-paragon-dark text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Tv class="w-3.5 h-3.5" />
                <span>Layar Presentasi</span>
              </button>

            </div>
          </div>

          <!-- Realtime stats row -->
          <div v-if="liveStats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-dark-surface-hover rounded-xl text-center border border-dark-border">
              <span class="text-[10px] font-extrabold text-paragon-light block uppercase">Peserta Bergabung</span>
              <strong class="text-xl font-black text-accent-cyan">{{ liveStats.participants?.length || 0 }}</strong>
            </div>
            
            <div class="p-4 bg-dark-surface-hover rounded-xl text-center border border-dark-border">
              <span class="text-[10px] font-extrabold text-paragon-light block uppercase">Indeks Pertanyaan</span>
              <strong class="text-xl font-black text-accent-cyan">
                {{ activeSession.current_question_index === -1 ? 'Lobby / Belum Mulai' : `Soal #${activeSession.current_question_index + 1}` }}
              </strong>
            </div>

            <div class="p-4 bg-paragon-ice/50 rounded-xl text-center">
              <span class="text-[10px] font-extrabold text-slate-400 block uppercase">Jumlah Pengiriman</span>
              <strong class="text-xl font-black text-paragon-dark">
                {{ liveStats.submissions ? `${liveStats.submissions.submissions_count} / ${liveStats.submissions.total_joined}` : '-' }}
              </strong>
            </div>
          </div>

          <!-- Control Actions buttons -->
          <div class="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            <!-- 1. Lobby room start -->
            <button 
              v-if="activeSession.status === 'draft'" 
              @click="handleStartSession"
              class="px-5 py-3 bg-paragon-medium hover:bg-paragon-dark text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow"
            >
              <Play class="w-4 h-4" />
              <span>Buka Waiting Lobby</span>
            </button>

            <!-- 2. Start the first question -->
            <button 
              v-if="activeSession.status === 'active' && activeSession.current_question_index === -1" 
              @click="handleStartQuiz"
              class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow"
            >
              <Play class="w-4 h-4" />
              <span>Mulai Pertanyaan 1</span>
            </button>

            <!-- 3. Next Question control -->
            <button 
              v-if="activeSession.status === 'active' && activeSession.current_question_index >= 0" 
              @click="handleNextQuestion"
              class="px-5 py-3 bg-paragon-medium hover:bg-paragon-dark text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow"
            >
              <FastForward class="w-4 h-4" />
              <span>
                {{ 
                  activeSession.show_leaderboard 
                    ? (isLastQuestion ? 'Akhiri Sesi Kuis' : 'Lanjut ke Pertanyaan Berikutnya') 
                    : (isLastQuestion ? 'Tampilkan Leaderboard Akhir' : 'Tampilkan Leaderboard Sementara') 
                }}
              </span>
            </button>

            <!-- 4. End Session Force -->
            <button 
              v-if="activeSession.status === 'active'" 
              @click="handleEndSession"
              class="px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
            >
              <span>Akhiri Kuis Paksa</span>
            </button>
          </div>

          <!-- Submissions monitor -->
          <div v-if="liveStats?.submissions" class="p-4 bg-amber-50 border border-amber-200/50 rounded-xl space-y-1">
            <h4 class="text-xs font-bold text-amber-800 uppercase">Pertanyaan Sedang Berlangsung:</h4>
            <p class="text-xs text-amber-700 font-semibold">{{ liveStats.submissions.question_text }}</p>
          </div>

          <!-- Real-Time Leaderboard Score list -->
          <div class="space-y-3 pt-4 border-t border-slate-100">
            <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Hasil Live Leaderboard</h4>
            <div v-if="!liveStats?.participants || liveStats.participants.length === 0" class="text-slate-400 text-xs py-4 font-semibold text-center bg-slate-50 rounded-xl">
              Belum ada peserta yang bergabung atau memiliki skor.
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                v-for="(p, idx) in liveStats.participants" 
                :key="p.id" 
                class="flex justify-between items-center p-3 border border-slate-100 bg-slate-50 hover:bg-slate-100/30 rounded-xl text-xs transition-all"
              >
                <span class="font-bold text-slate-700"><span class="text-slate-400 mr-1.5">#{{ idx + 1 }}</span>{{ p.name }}</span>
                <span class="font-extrabold text-paragon-medium">{{ p.current_score }} Pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Question Manager Panel (DRAG & DROP PERSISTENCE) -->
    <div v-if="activeTab === 'questions'" class="bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div class="flex items-center space-x-3">
          <h3 class="font-extrabold text-base text-paragon-light">Pengelola Pertanyaan Kuis</h3>
          <select 
            v-model="selectedSessionIdForQuestions" 
            @change="onSessionSelectForQuestions"
            class="bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30"
          >
            <option value="" disabled>-- Pilih Sesi --</option>
            <option v-for="s in sessions" :key="s.id" :value="s.id">
              {{ s.date }} - {{ s.reference }}
            </option>
          </select>
        </div>

        <button 
          @click="openAddQuestion" 
          :disabled="!selectedSessionIdForQuestions"
          class="px-4 py-2 bg-paragon-medium hover:bg-paragon-dark text-white font-bold rounded-xl text-xs disabled:opacity-50 flex items-center space-x-1 shadow transition-all"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Soal</span>
        </button>
      </div>

      <!-- Question List -->
      <div v-if="!selectedSessionIdForQuestions" class="text-center py-10 text-dark-text-secondary text-xs font-semibold">
        Silakan pilih sesi di atas untuk mengelola soal.
      </div>
      <div v-else-if="questions.length === 0" class="text-center py-10 text-dark-text-secondary text-xs font-semibold">
        Belum ada pertanyaan pada sesi ini. Klik "+ Tambah Soal" di atas untuk menambahkan.
      </div>

      <!-- Draggable Question Cards List -->
      <div v-else class="space-y-4">
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          💡 Seret &amp; Lepaskan (Drag &amp; Drop) kartu pertanyaan untuk merubah urutannya
        </div>
        <div 
          v-for="(q, idx) in questions" 
          :key="q.id" 
          draggable="true"
          @dragstart="handleDragStart($event, idx)"
          @dragover.prevent
          @drop="handleDrop($event, idx)"
          class="p-5 border border-dark-border bg-dark-surface-hover hover:bg-dark-surface rounded-2xl space-y-4 transition-all cursor-move flex flex-col relative group"
        >
          <div class="flex justify-between items-start">
            <div class="flex items-start space-x-3">
              <GripVertical class="w-4 h-4 text-dark-border mt-1 flex-shrink-0 group-hover:text-paragon-light/50 transition-colors" />
              <div class="space-y-1">
                <div class="flex items-center space-x-2 text-[10px] font-black text-paragon-light uppercase tracking-widest">
                  <span>Urutan #{{ q.sort_order }}</span>
                  <span>•</span>
                  <span>Tipe: {{ q.question_type }}</span>
                  <span>•</span>
                  <span>Waktu: {{ q.time_limit }} Detik</span>
                </div>
                <h4 class="font-bold text-sm text-dark-text leading-snug">{{ q.question_text }}</h4>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 flex-shrink-0">
              <button @click.stop="openEditQuestion(q)" class="p-2 text-dark-text-secondary hover:text-paragon-light bg-dark-surface-hover hover:bg-paragon-medium/10 rounded-lg border border-dark-border shadow-sm transition-all">
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button @click.stop="deleteQuestion(q.id)" class="p-2 text-dark-text-secondary hover:text-red-400 bg-dark-surface-hover hover:bg-red-500/10 rounded-lg border border-dark-border shadow-sm transition-all hover:border-red-500/30">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Show options if MCQ or Polling -->
          <div v-if="q.question_type === 'multiple_choice' || q.question_type === 'polling'" class="grid grid-cols-2 gap-2 text-xs font-semibold pl-7">
            <div 
              v-for="(o, oIdx) in q.options" 
              :key="oIdx" 
              class="p-2 border border-dark-border rounded-lg bg-dark-surface truncate flex items-center"
              :class="q.question_type !== 'polling' && o === q.correct_answer ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-extrabold' : 'text-dark-text-secondary'"
            >
              <span class="inline-flex w-4 h-4 items-center justify-center bg-dark-border rounded text-[9px] uppercase font-bold mr-2 text-dark-text-secondary">{{ String.fromCharCode(65 + oIdx) }}</span>
              <span>{{ o }}</span>
            </div>
          </div>

          <!-- Answer & Explanation panel -->
          <div class="p-3 bg-dark-surface border border-dark-border rounded-lg space-y-1.5 text-xs text-dark-text-secondary ml-7">
            <div v-if="q.question_type !== 'polling'">Jawaban Benar: <strong class="text-emerald-700 font-extrabold">{{ q.correct_answer }}</strong></div>
            <div v-if="q.explanation">Penjelasan: <span class="font-medium italic text-slate-500">{{ q.explanation }}</span></div>
            <div v-if="q.image_path" class="text-paragon-medium font-semibold flex items-center space-x-1">
              <span>🖼️ Terdapat File Gambar Terlampir</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Participant Manager Panel -->
    <div v-if="activeTab === 'participants'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Create Single / Import CSV -->
      <div class="lg:col-span-1 bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
        <!-- Add Participant -->
        <div class="space-y-4">
          <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3">Tambah Peserta</h3>
          <div>
            <label class="block text-xs font-bold text-paragon-light mb-1.5">Nama Karyawan / Intern</label>
            <input 
              v-model="participantForm.name" 
              type="text" 
              placeholder="e.g. Nama Karyawan Baru"
              class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30 placeholder-dark-text-secondary/30"
            />
          </div>
          <button 
            @click="addParticipant" 
            class="w-full py-2.5 bg-paragon-medium hover:bg-paragon-dark text-white font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center space-x-1"
          >
            <Plus class="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        <!-- Import CSV -->
        <div class="space-y-4 border-t border-dark-border pt-6">
          <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3 flex items-center justify-between">
            <span>Ingest Nama dari CSV</span>
            <Upload class="w-4 h-4 text-paragon-light" />
          </h3>
          
          <div class="space-y-3">
            <p class="text-[11px] text-dark-text-secondary">
              Impor nama karyawan dalam format baris tunggal nama per baris (Plain List/CSV).
            </p>
            <input 
              id="csv_input"
              type="file" 
              accept=".csv,.txt"
              @change="selectCsvFile"
              class="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-paragon-medium file:text-white hover:file:bg-paragon-dark file:transition-all cursor-pointer"
            />
            <button 
              @click="handleCsvUpload"
              :disabled="!csvFile || loading"
              class="w-full py-2.5 bg-paragon-dark hover:bg-paragon-medium text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all flex items-center justify-center space-x-1"
            >
              <span>Mulai Ingest</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Participant List grid -->
      <div class="lg:col-span-2 bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
        <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3 flex items-center justify-between">
          <span>Daftar Nama Predistribusi (Total: {{ participants.length }})</span>
        </h3>

        <div class="space-y-2 max-h-[420px] overflow-y-auto pr-2">
          <div 
            v-for="p in participants" 
            :key="p.id" 
            class="flex items-center justify-between p-3 border border-dark-border hover:border-paragon-light/30 hover:bg-dark-surface-hover rounded-2xl transition-all"
          >
            <!-- Normal State -->
            <div v-if="editingParticipant?.id !== p.id" class="text-xs font-bold text-dark-text">
              {{ p.name }}
            </div>
            
            <!-- Inline Edit state -->
            <div v-else class="flex-1 mr-4">
              <input 
                v-model="editingParticipant.name" 
                type="text" 
                class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:border-paragon-medium outline-none focus:ring-2 focus:ring-paragon-medium/30"
              />
            </div>

            <!-- Action buttons -->
            <div class="flex items-center space-x-2">
              <div v-if="editingParticipant?.id !== p.id" class="flex items-center space-x-2">
                <button @click="startEditParticipant(p)" class="p-1.5 text-dark-text-secondary hover:text-paragon-light bg-dark-surface-hover hover:bg-paragon-medium/10 border border-dark-border rounded-lg transition-all">
                  <Edit2 class="w-3 h-3" />
                </button>
                <button @click="deleteParticipant(p.id)" class="p-1.5 text-dark-text-secondary hover:text-red-400 bg-dark-surface-hover hover:bg-red-500/10 border border-dark-border rounded-lg transition-all hover:border-red-500/30">
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
              <div v-else class="flex items-center space-x-1">
                <button @click="saveEditParticipant" class="p-1.5 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-all">
                  <Check class="w-3 h-3" />
                </button>
                <button @click="editingParticipant = null" class="p-1.5 text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-all">
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: Reporting & Backup settings -->
    <div v-if="activeTab === 'reports'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Winner monthly tracker -->
      <div class="lg:col-span-1 bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
        <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3">Monthly Top 3 Tracker</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-paragon-light mb-1.5">Pilih Bulan Laporan</label>
            <input 
              v-model="selectedMonth" 
              type="month" 
              @change="fetchMonthlyLeaderboard"
              class="w-full bg-dark-surface-hover border border-dark-border text-dark-text text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-paragon-medium focus:ring-2 focus:ring-paragon-medium/30"
            />
          </div>

          <!-- Top 3 display -->
          <div class="space-y-3 pt-2">
            <h4 class="text-[10px] font-black text-paragon-light/60 uppercase tracking-widest">Pemenang Top 3 Kuis</h4>
            
            <div v-if="monthlyLeaderboard.length === 0" class="text-dark-text-secondary text-xs py-4 font-semibold text-center bg-dark-surface-hover rounded-xl">
              Belum ada data nilai di bulan ini.
            </div>
            
            <div v-else class="space-y-2">
              <div 
                v-for="(w, idx) in monthlyLeaderboard.slice(0, 3)" 
                :key="w.participant_id" 
                class="flex items-center justify-between p-3.5 rounded-xl border"
                :class="idx === 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-dark-surface-hover border-dark-border text-dark-text-secondary'"
              >
                <div class="flex items-center space-x-2 font-bold text-xs">
                  <span class="text-base">{{ idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉' }}</span>
                  <span class="truncate max-w-32">{{ w.name }}</span>
                </div>
                <div class="text-right">
                  <div class="font-extrabold text-xs">{{ w.total_score }} Pts</div>
                  <div class="text-[9px] font-semibold opacity-70">Main: {{ w.sessions_played }} kali</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Generation & Reset Data -->
      <div class="lg:col-span-2 bg-dark-surface p-6 rounded-3xl border border-dark-border shadow-xl space-y-6">
        <!-- Downloads Excel -->
        <div class="space-y-4">
          <h3 class="font-extrabold text-base text-paragon-light border-b border-dark-border pb-3 flex items-center justify-between">
            <span>Ekspor File Laporan (Excel)</span>
            <FileSpreadsheet class="w-4 h-4 text-emerald-400" />
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 border border-dark-border rounded-2xl bg-dark-surface-hover hover:border-emerald-500/30 space-y-3 flex flex-col justify-between transition-all">
              <div class="space-y-1">
                <h4 class="font-black text-sm text-paragon-ice">Laporan Bulanan</h4>
                <p class="text-[10px] text-dark-text-secondary font-semibold leading-relaxed">
                  Mengunduh ringkasan Top 3, statistik akumulatif per peserta, serta detail pengiriman jawaban spesifik untuk bulan <strong>{{ selectedMonth }}</strong>.
                </p>
              </div>
              <button 
                @click="downloadMonthlyExcel"
                class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow shadow-emerald-600/20 flex items-center justify-center space-x-1"
              >
                <FileSpreadsheet class="w-4 h-4" />
                <span>Unduh Laporan Bulanan</span>
              </button>
            </div>

            <div class="p-4 border border-dark-border rounded-2xl bg-dark-surface-hover hover:border-paragon-medium/30 space-y-3 flex flex-col justify-between transition-all">
              <div class="space-y-1">
                <h4 class="font-black text-sm text-paragon-ice">Laporan Lifetime (Semua Data)</h4>
                <p class="text-[10px] text-dark-text-secondary font-semibold leading-relaxed">
                  Mengunduh seluruh riwayat database OTM, termasuk semua sesi kuis dari awal pendirian, skor total kumulatif, dan log session.
                </p>
              </div>
              <button 
                @click="downloadFullExcel"
                class="w-full py-2 bg-paragon-medium hover:bg-paragon-dark text-white text-xs font-bold rounded-xl shadow shadow-paragon-medium/20 flex items-center justify-center space-x-1"
              >
                <FileSpreadsheet class="w-4 h-4" />
                <span>Unduh Laporan Lifetime</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Wipe & Backup module (ESOT protocol) -->
        <div class="space-y-4 border-t border-dark-border pt-6">
          <h3 class="font-extrabold text-base text-red-400 flex items-center space-x-2">
            <ShieldAlert class="w-5 h-5" />
            <span>Zona Bahaya: Backup &amp; Reset Sesi</span>
          </h3>

          <div class="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4">
            <p class="text-xs text-red-300 font-semibold leading-relaxed">
              Protokol <strong>"Backup before Wipe"</strong> wajib dijalankan setiap 6 bulan sekali. 
              Sistem akan menutup koneksi database, menyalin arsip file DB fisik ke direktori <code>BE/backups/</code>, dan kemudian mereset seluruh sesi kuis, daftar pertanyaan, serta perolehan skor peserta untuk memulai siklus reward baru.
            </p>
            <div class="text-xs font-bold text-red-300">
              * Daftar nama peserta (employee list) tidak akan dihapus agar dropdown tetap berfungsi tanpa re-upload.
            </div>

            <button 
              @click="triggerBackupAndWipe"
              class="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center space-x-1.5"
            >
              <Database class="w-4 h-4" />
              <span>Jalankan Backup &amp; Reset Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT QUESTION (DYNAMIC OPTIONS & DROPDOWN MCQ ANSWER) -->
    <div 
      v-if="showAddQuestionModal" 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="font-black text-lg text-paragon-dark">
            {{ isEditingQuestion ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Kuis' }}
          </h3>
          <button @click="showAddQuestionModal = false" class="text-slate-400 hover:text-slate-600 p-1.5"><X class="w-5 h-5" /></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
          <!-- Question text -->
          <div class="md:col-span-2">
            <label class="block mb-1.5">Teks Pertanyaan</label>
            <textarea 
              v-model="questionForm.question_text" 
              rows="2"
              placeholder="Ketik detail pertanyaan sharing..."
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium font-medium"
            ></textarea>
          </div>

          <!-- Question Type -->
          <div>
            <label class="block mb-1.5">Tipe Pertanyaan</label>
            <select 
              v-model="questionForm.question_type"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
            >
              <option value="multiple_choice">Pilihan Ganda (Multiple Choice)</option>
              <option value="true_false">Benar / Salah (True / False)</option>
              <option value="short_answer">Isian Singkat (Short Answer)</option>
              <option value="polling">Polling (Engagement)</option>
            </select>
          </div>

          <!-- Dynamic Options config if MCQ / Polling -->
          <div 
            v-if="questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'polling'"
            class="md:col-span-2 p-5 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-4"
          >
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Pilihan Jawaban</div>
            
            <!-- Dynamic Grid displaying options with inline delete button -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="(opt, idx) in questionForm.options" 
                :key="idx"
                class="p-4 bg-white border border-slate-200 rounded-xl space-y-2 relative shadow-sm"
              >
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Opsi {{ String.fromCharCode(65 + idx) }}</span>
                  <button 
                    v-if="questionForm.options.length > 2"
                    @click="removeQuestionOptionSpecific(idx)"
                    class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    title="Hapus opsi ini"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <input 
                  v-model="questionForm.options[idx]" 
                  type="text" 
                  placeholder="Ketik isi pilihan..."
                  class="mcq-option-input w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-paragon-medium text-xs font-semibold rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>

              <!-- Add option button rendered next to option inputs -->
              <button 
                v-if="questionForm.options.length < 6"
                @click="addQuestionOption"
                class="border border-dashed border-slate-300 hover:border-paragon-medium bg-slate-50/50 hover:bg-paragon-ice/30 rounded-xl p-6 flex flex-col items-center justify-center space-y-1 transition-all text-slate-400 hover:text-paragon-medium"
              >
                <Plus class="w-5 h-5" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Tambah Opsi Pilihan</span>
              </button>
            </div>
          </div>

          <!-- Correct answer (MCQ/TF uses Dropdown, HIDE if Polling) -->
          <div v-if="questionForm.question_type !== 'polling'">
            <label class="block mb-1.5">Jawaban Benar</label>
            
            <!-- Dropdown for MCQ and True-False choices -->
            <select 
              v-if="questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false'"
              v-model="questionForm.correct_answer"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
            >
              <option value="" disabled>-- Pilih Jawaban Benar --</option>
              <option v-for="c in mcqAnswerChoices" :key="c" :value="c">{{ c }}</option>
            </select>

            <!-- Standard text input for short answers/others -->
            <input 
              v-else 
              v-model="questionForm.correct_answer" 
              type="text" 
              placeholder="Ketik jawaban benar..."
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
            />
          </div>

          <!-- Explanation -->
          <div class="md:col-span-2">
            <label class="block mb-1.5">Penjelasan Singkat (Feedback Loop)</label>
            <textarea 
              v-model="questionForm.explanation" 
              rows="2"
              placeholder="Penjelasan jawaban benar untuk pemahaman peserta..."
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium font-medium"
            ></textarea>
          </div>

          <!-- Image upload -->
          <div>
            <label class="block mb-1.5">Lampirkan Gambar (Media Context)</label>
            <input 
              type="file" 
              accept="image/*"
              @change="handleImageSelect"
              class="w-full text-xs file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-paragon-ice file:text-paragon-medium file:rounded file:font-semibold"
            />
          </div>

          <!-- Timer & Points & Sort Order -->
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block mb-1.5">Limit (s)</label>
              <input 
                v-model="questionForm.time_limit" 
                type="number" 
                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
              />
            </div>
            <div>
              <label class="block mb-1.5">Poin</label>
              <input 
                v-model="questionForm.points" 
                type="number" 
                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
              />
            </div>
            <div>
              <label class="block mb-1.5">Urutan</label>
              <input 
                v-model="questionForm.sort_order" 
                type="number" 
                min="1"
                :max="maxAllowedSortOrder"
                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-paragon-medium"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <button 
            @click="showAddQuestionModal = false" 
            class="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button 
            @click="saveQuestion" 
            :disabled="loading"
            class="px-5 py-2 bg-paragon-medium text-white text-xs font-bold rounded-xl hover:bg-paragon-dark disabled:opacity-50 transition-all shadow"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan Soal' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
