import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hook za PWA install – beforeinstallprompt (Android/Chrome) i detekciju iOS.
 * Aplikacija već instalirana: display-mode: standalone ili navigator.standalone (iOS)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Već instalirano – standalone ili fullscreen
    const checkStandalone = () => {
      const standalone = (navigator as any).standalone === true;
      const displayMode = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches;
      return standalone || displayMode;
    };
    setIsInstalled(checkStandalone());

    // iOS – nema beforeinstallprompt, korisnik koristi Share → Add to Home Screen
    const ua = navigator.userAgent || navigator.vendor || '';
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
  }, [deferredPrompt]);

  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const isMobile = isIOS || isAndroid;

  // Prikaži link svima koji nisu instalirali – ne čekaj na beforeinstallprompt (rijetko se javlja novim korisnicima)
  const showInstallLink = !isInstalled;

  return {
    canInstall: !!deferredPrompt,
    isIOS,
    isAndroid,
    isMobile,
    isInstalled,
    showInstallLink,
    promptInstall,
  };
}
