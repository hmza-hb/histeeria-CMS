'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if splash was already shown during this session
    const hasShown = sessionStorage.getItem('histeeria_splash_shown');
    if (hasShown) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('histeeria_splash_shown', 'true');
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-5 text-center px-4">
        {/* Logo with completely transparent/clean background */}
        <div className="relative w-20 h-20">
          <Image
            src="/histeeria-logo.png"
            alt="Histeeria Memory Logo"
            width={80}
            height={80}
            priority
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Histeeria Memory
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            You live your life; Histeeria remembers it.
          </p>
        </div>

        {/* Clean monochrome indicator */}
        <div className="w-32 h-0.5 bg-slate-100 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-slate-900 rounded-full animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
}
