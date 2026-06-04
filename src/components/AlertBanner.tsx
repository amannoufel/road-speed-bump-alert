'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Navigation2 } from 'lucide-react';
import type { SpeedHump } from '@/lib/supabase';

type DistMap = globalThis.Map<string, number>;

interface AlertBannerProps {
  humps: SpeedHump[];
  distances: DistMap;
  onDismiss: (id: string) => void;
}

const SEV_CONFIG = {
  mild:     { gradient: 'from-green-700 to-emerald-700',  badge: 'bg-green-500/30 text-green-200',  ring: 'ring-green-400/40',  icon: '🟢', pulse: 'shadow-green-500/50'  },
  moderate: { gradient: 'from-amber-600 to-orange-600',   badge: 'bg-amber-500/30 text-amber-200',  ring: 'ring-amber-400/40',  icon: '🟡', pulse: 'shadow-amber-500/60'  },
  severe:   { gradient: 'from-red-700 to-rose-700',       badge: 'bg-red-500/30 text-red-200',      ring: 'ring-red-400/40',    icon: '🔴', pulse: 'shadow-red-500/60'    },
};

let sharedAudioCtx: AudioContext | null = null;

function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Unlock audio context on first user interaction (browser policy)
if (typeof window !== 'undefined') {
  const unlock = () => {
    initAudio();
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  };
  document.addEventListener('touchstart', unlock);
  document.addEventListener('click', unlock);
}

function playBeep(severity: SpeedHump['severity']) {
  try {
    const ctx = initAudio();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Square wave makes a more urgent, buzz-like alert sound
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    const freq = severity === 'severe' ? 700 : severity === 'moderate' ? 550 : 450;
    const vol = severity === 'severe' ? 0.8 : 0.65; // Much louder alerts (up from 0.4 and 0.25)
    
    if (severity === 'severe') {
      // 3 urgent, longer beeps for severe
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      
      // Beep 1 (now to now + 0.25)
      gain.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      
      // Beep 2 (now + 0.35 to now + 0.60)
      gain.gain.setValueAtTime(0, now + 0.35); // Anchor start of Beep 2
      gain.gain.linearRampToValueAtTime(vol, now + 0.40);
      gain.gain.linearRampToValueAtTime(0, now + 0.60);
      
      // Beep 3 (now + 0.70 to now + 1.05) - higher pitched
      osc.frequency.setValueAtTime(freq * 1.5, now + 0.70);
      gain.gain.setValueAtTime(0, now + 0.70); // Anchor start of Beep 3
      gain.gain.linearRampToValueAtTime(vol, now + 0.75);
      gain.gain.linearRampToValueAtTime(0, now + 1.05);
      
      osc.start(now);
      osc.stop(now + 1.1); // Total 1.1s duration (up from 0.8s)
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 500]); // Stronger vibration
      }
    } else {
      // 2 standard, longer beeps
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      
      // Beep 1 (now to now + 0.25)
      gain.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      
      // Beep 2 (now + 0.35 to now + 0.60)
      gain.gain.setValueAtTime(0, now + 0.35); // Anchor start of Beep 2
      gain.gain.linearRampToValueAtTime(vol, now + 0.40);
      gain.gain.linearRampToValueAtTime(0, now + 0.60);
      
      osc.start(now);
      osc.stop(now + 0.7); // Total 0.7s duration (up from 0.5s)
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  } catch (err) {
    console.error('Audio play failed:', err);
  }
}

export default function AlertBanner({ humps, distances, onDismiss }: AlertBannerProps) {
  const prevCountRef = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (humps.length > prevCountRef.current && humps.length > 0) {
      playBeep(humps[0].severity);
      setVisible(true);
    }
    prevCountRef.current = humps.length;
  }, [humps]);

  useEffect(() => {
    if (humps.length > 0) setVisible(true);
  }, [humps.length]);

  if (humps.length === 0 || !visible) return null;

  const nearest = humps[0];
  const cfg = SEV_CONFIG[nearest.severity];
  const dist = distances.get(nearest.id);

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className={`pointer-events-auto mx-3 mt-16 rounded-3xl bg-gradient-to-r ${cfg.gradient} shadow-2xl ${cfg.pulse} border border-white/20 overflow-hidden ring-2 ${cfg.ring}`}>

        {/* Moving stripe */}
        <div className="h-1 bg-white/20 overflow-hidden">
          <div className="h-full w-1/3 bg-white/60 animate-[slide_1.5s_linear_infinite]" />
        </div>

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0 border border-white/15 shadow-inner">
            <span className="text-3xl animate-bounce">🚧</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">⚠ Speed Hump Ahead</p>
            <p className="text-white font-black text-lg leading-tight truncate">{nearest.label}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                {cfg.icon} {nearest.severity}
              </span>
              {dist !== undefined && (
                <span className="flex items-center gap-1 text-white/80 text-sm font-bold">
                  <Navigation2 size={12} />
                  {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                </span>
              )}
              {humps.length > 1 && (
                <span className="text-white/50 text-xs">+{humps.length - 1} more nearby</span>
              )}
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => { onDismiss(nearest.id); setVisible(humps.length > 1); }}
            className="w-10 h-10 rounded-full bg-black/30 active:bg-black/50 flex items-center justify-center text-white/80 flex-shrink-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* More humps row */}
        {humps.length > 1 && (
          <div className="flex gap-2 px-4 pb-4 pt-0 overflow-x-auto">
            {humps.slice(1, 4).map((h) => {
              const hcfg = SEV_CONFIG[h.severity];
              return (
                <div key={h.id} className="flex-shrink-0 bg-black/25 rounded-2xl px-3 py-2.5 flex items-center gap-2 border border-white/10 min-w-[130px]">
                  <span className="text-base flex-shrink-0">{hcfg.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white/90 text-xs font-bold truncate">{h.label}</p>
                    <p className="text-white/45 text-xs">{Math.round(distances.get(h.id) ?? 0)}m</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
