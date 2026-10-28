'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { profile, memories } from '@/lib/api';

interface AppShellProps {
  children: React.ReactNode;
  onMemoryCreated?: () => void;
}

export default function AppShell({ children, onMemoryCreated }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const isAuthRoute = pathname.startsWith('/auth');

  useEffect(() => {
    if (isAuthRoute) return;

    const token = localStorage.getItem('histeeria_token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    profile.get().then(setUser).catch(() => {});
  }, [pathname, isAuthRoute]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSubmitting) return;
    const content = inputText.trim();
    setIsSubmitting(true);
    try {
      await memories.create({ content });
      setInputText('');
      showToast('Memory captured successfully');
      if (onMemoryCreated) onMemoryCreated();
      // Dispatch custom event so pages can listen and refresh
      window.dispatchEvent(new CustomEvent('histeeria:memory-created'));
    } catch {
      showToast('Failed to save memory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startVoiceRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText((prev) => {
          const base = prev.trim();
          return base ? `${base} ${currentTranscript.trim()}` : currentTranscript.trim();
        });
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Memories',
      href: '/memories',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Ask AI',
      href: '/ask',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      name: 'Reminders',
      href: '/reminders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Persistent Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen px-4 py-6 justify-between fixed left-0 top-0 bottom-0 z-30">
        <div>
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 px-3 py-2 mb-8">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/histeeria-logo.png"
                alt="Histeeria Memory"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base">Histeeria Memory</span>
              <p className="text-[11px] text-slate-400 font-medium">Cognitive Memory</p>
            </div>
          </Link>

          {/* Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User bar */}
        {user && (
          <div className="border-t border-slate-100 pt-4 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{user.name || 'User'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('histeeria_token');
                window.location.href = '/auth/login';
              }}
              title="Sign out"
              className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Child Pages Content */}
        <div className="flex-1 pb-32 md:pb-8">
          {children}
        </div>

        {/* WhatsApp-Style Floating Mobile Capture Dock */}
        <div className="md:hidden fixed bottom-14 left-0 right-0 p-2.5 z-40 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-white rounded-full shadow-lg border border-slate-200/90 p-1.5 flex items-center gap-2 transition-all">
              {isRecording ? (
                /* Recording Mode in Mobile Input */
                <div className="flex-1 flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-xs font-mono font-semibold text-red-600">
                      0:0{recordingSeconds}
                    </span>
                    <span className="text-xs text-slate-500">Listening...</span>
                  </div>
                  <button
                    onClick={stopVoiceRecording}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-full"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Standard Text Input */
                <>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Capture a memory or reminder..."
                    className="flex-1 px-4 py-2 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />

                  {inputText.trim() ? (
                    /* WhatsApp Send Button */
                    <button
                      onClick={handleSend}
                      disabled={isSubmitting}
                      className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  ) : (
                    /* WhatsApp Voice Mic Button */
                    <button
                      onClick={startVoiceRecording}
                      title="Tap to speak"
                      className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Persistent Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 text-[10px] font-medium transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
