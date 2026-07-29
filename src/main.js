import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './index.css'
import { soundEffects } from './utils/soundEffects'

// Resume audio context on first user click to bypass browser autoplay blocks
window.addEventListener('click', () => {
  soundEffects.resumeContext()
}, { once: true })
window.addEventListener('touchstart', () => {
  soundEffects.resumeContext()
}, { once: true })


// Bypass ngrok warning page for API calls
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.includes('ngrok')) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      init.headers['ngrok-skip-browser-warning'] = 'true';
    }
  }
  return originalFetch(input, init);
};

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

