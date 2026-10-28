'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('Histeeria PWA ServiceWorker registered with scope:', registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed:', err);
          }
        );
      });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  if (!isInstallable || isStandalone) return null;

  return (
    <div className="fixed top-3 right-3 z-50 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top duration-300">
      <span className="font-medium">Install Histeeria</span>
      <button
        onClick={handleInstallClick}
        className="bg-white text-slate-900 font-bold px-2 py-0.5 rounded-full text-[10px] hover:bg-slate-100 transition-colors"
      >
        Install
      </button>
      <button
        onClick={() => setIsInstallable(false)}
        className="text-slate-400 hover:text-white ml-1 text-sm leading-none"
      >
        ×
      </button>
    </div>
  );
}
