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
  <div class="max-w-md mx-auto py-10">
    <div class="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 space-y-6">
      <div class="text-center space-y-2">
        <div class="mx-auto w-12 h-12 bg-paragon-ice text-paragon-medium flex items-center justify-center rounded-2xl">
          <Lock class="w-6 h-6" />
        </div>
        <h2 class="text-2xl font-black text-paragon-dark">Akses Admin</h2>
        <p class="text-xs text-slate-500 max-w-xs mx-auto">
          Masukkan kode sandi administrator untuk mengelola kuis, daftar peserta, dan laporan bulanan.
        </p>
      </div>

      <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-xs font-semibold text-center">
        {{ errorMsg }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Kode Sandi Admin</label>
          <input 
            v-model="passcode" 
            type="password" 
            placeholder="••••••••"
            :disabled="loading"
            class="w-full bg-slate-50 border border-slate-200 focus:border-paragon-medium focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all text-center tracking-widest"
            @keyup.enter="handleLogin"
          />
        </div>

        <button 
          @click="handleLogin" 
          :disabled="!passcode || loading"
          class="w-full py-3 bg-paragon-medium text-white font-bold rounded-xl shadow-lg shadow-paragon-medium/20 hover:bg-paragon-dark hover:shadow-paragon-dark/20 transition-all flex items-center justify-center disabled:opacity-50"
        >
          <span>Masuk Dashboard</span>
        </button>
      </div>
    </div>
  </div>
</template>
