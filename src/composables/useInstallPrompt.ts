import { ref, onMounted } from 'vue'

export function useInstallPrompt() {
  const showInstallBanner = ref(false)
  let deferredPrompt: any = null

  function isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
  }

  // iOS Safari：通过 WebKit 私有属性检测是否已添加到主屏幕
  function isiOSInstalled(): boolean {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (!isSafari) return false
    return (window.navigator as any).standalone === true
  }

  onMounted(() => {
    if (isStandalone() || isiOSInstalled()) return

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      deferredPrompt = e
      showInstallBanner.value = true
    })

    window.addEventListener('appinstalled', () => {
      showInstallBanner.value = false
      deferredPrompt = null
    })
  })

  async function installApp() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      showInstallBanner.value = false
    }
    deferredPrompt = null
  }

  function dismissBanner() {
    showInstallBanner.value = false
    deferredPrompt = null
  }

  return { showInstallBanner, installApp, dismissBanner }
}
