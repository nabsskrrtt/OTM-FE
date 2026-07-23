<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock } from 'lucide-vue-next'

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = `${API_HOST}/api`

const passcode = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!passcode.value) return
  errorMsg.value = ''
  
  try {
    loading.value = true
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: passcode.value })
    })

    const data = await res.json()
    if (res.ok && data.success) {
      localStorage.setItem('otm_admin_token', data.token)
      router.push('/admin')
    } else {
      errorMsg.value = data.error || "Kode sandi salah."
    }
  } catch (err) {
    errorMsg.value = "Gagal terhubung ke backend."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-20">
    <div class="bg-dark-surface rounded-3xl border border-dark-border shadow-2xl p-8 space-y-6">
      <div class="text-center space-y-3">
        <div class="mx-auto w-14 h-14 bg-gradient-to-br from-paragon-medium to-paragon-dark flex items-center justify-center rounded-2xl shadow-lg shadow-paragon-medium/30">
          <Lock class="w-7 h-7 text-paragon-ice" />
        </div>
        <h2 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-paragon-ice to-paragon-light">🔐 Akses Admin</h2>
        <p class="text-sm text-dark-text-secondary max-w-xs mx-auto leading-relaxed">
          Masukkan kode sandi untuk mengelola kuis, peserta, dan laporan bulanan.
        </p>
      </div>

      <div v-if="errorMsg" class="bg-red-500/10 text-red-300 p-4 rounded-2xl border border-red-500/30 text-xs font-semibold text-center flex items-center space-x-2 justify-center">
        <span>⚠️</span>
        <span>{{ errorMsg }}</span>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-paragon-light uppercase tracking-widest mb-3">Kode Sandi Admin</label>
          <input 
            v-model="passcode" 
            type="password" 
            placeholder="••••••••"
            :disabled="loading"
            class="w-full bg-dark-surface-hover border border-dark-border focus:border-paragon-medium focus:bg-dark-surface text-dark-text rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all text-center tracking-widest hover:border-paragon-light/30 focus:ring-2 focus:ring-paragon-medium/30 disabled:opacity-50"
            @keyup.enter="handleLogin"
          />
        </div>

        <button 
          @click="handleLogin" 
          :disabled="!passcode || loading"
          class="w-full py-3.5 bg-gradient-to-r from-paragon-medium to-paragon-dark text-white font-extrabold rounded-2xl shadow-lg shadow-paragon-medium/30 hover:shadow-paragon-dark/40 hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none transition-all flex items-center justify-center text-base"
        >
          <span>🚀 Masuk Dashboard</span>
        </button>
      </div>
    </div>
  </div>
</template>
