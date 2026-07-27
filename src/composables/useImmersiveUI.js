import { ref, onMounted } from 'vue'
import { soundEffects } from '../utils/soundEffects'

export function useImmersiveUI() {
  const particleEffects = ref([])

  // Initialize immersive UI
  onMounted(async () => {
    await soundEffects.initialize()
  })

  // Create particle effect on screen
  const createParticleEffect = (x, y, count = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const velocity = {
        x: Math.cos(angle) * (Math.random() * 3 + 2),
        y: Math.sin(angle) * (Math.random() * 3 + 2)
      }
      const particle = {
        id: Math.random(),
        x,
        y,
        velocity,
        life: 1,
        size: Math.random() * 8 + 4
      }
      particleEffects.value.push(particle)
    }

    // Animation loop
    const animate = () => {
      particleEffects.value = particleEffects.value
        .map(p => ({
          ...p,
          x: p.x + p.velocity.x,
          y: p.y + p.velocity.y,
          life: p.life - 0.02,
          velocity: {
            x: p.velocity.x * 0.98,
            y: p.velocity.y * 0.98 + 0.1
          }
        }))
        .filter(p => p.life > 0)

      if (particleEffects.value.length > 0) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  // Trigger selection feedback
  const triggerSelectionFeedback = () => {
    soundEffects.selectAvatar()
  }

  // Trigger correct answer feedback
  const triggerCorrectFeedback = (x, y) => {
    soundEffects.correct()
    createParticleEffect(x, y, 10)
  }

  // Trigger incorrect answer feedback
  const triggerIncorrectFeedback = (x, y) => {
    soundEffects.incorrect()
    createParticleEffect(x, y, 5)
  }

  // Handle scroll immersion
  const handleScrollImmersion = (scrollY) => {
    // Add scroll-based visual effects if needed
    const scrollPercent = Math.min(scrollY / 500, 1)
    document.documentElement.style.setProperty('--scroll-progress', scrollPercent)
  }

  return {
    particleEffects,
    createParticleEffect,
    triggerSelectionFeedback,
    triggerCorrectFeedback,
    triggerIncorrectFeedback,
    handleScrollImmersion,
    soundEffects
  }
}
