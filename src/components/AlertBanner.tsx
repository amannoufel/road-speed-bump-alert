'use client';

import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Navigation2 } from 'lucide-react';
import type { SpeedHump } from '@/lib/supabase';

type DistMap = globalThis.Map<string, number>;

interface AlertBannerProps {
  humps: SpeedHump[];
  distances: DistMap;
  onDismiss: (id: string) => void;
}

const SEV_CONFIG = {
  mild:     { gradient: 'from-green-700 to-emerald-700', badge: 'bg-green-500/25 text-green-300', icon: '🟢' },
  moderate: { gradient: 'from-amber-600 to-orange-600',  badge: 'bg-amber-500/25 text-amber-300',  icon: '🟡' },
  severe:   { gradient: 'from-red-700 to-rose-700',      badge: 'bg-red-500/25 text-red-300',      icon: '🔴' },
};

function playBeep(severity: SpeedHump['severity']) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = severity === 'severe' ? 1200 : severity === 'moderate' ? 880 : 660;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    // Second beep for severe
    if (severity === 'severe') {
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 1000;
        g2.gain.setValueAtTime(0.3, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.25);
      }, 250);
    }
  } catch { /* audio blocked */ }
}

export default function AlertBanner({ humps, distances, onDismiss }: AlertBannerProps) {
  const prevCountRef = useRef(0);
  const [visible, setVisible] = useState(true);

  // Play sound on new alerts
  useEffect(() => {
    if (humps.length > prevCountRef.current && humps.length > 0) {
      playBeep(humps[0].severity);
      setVisible(true);
    }
    prevCountRef.current = humps.length;
  }, [humps]);

  // Re-show banner when new humps appear
  useEffect(() => {
    if (humps.length > 0) setVisible(true);
  }, [humps.length]);

  if (humps.length === 0 || !visible) return null;

  const nearest = humps[0];
  const cfg = SEV_CONFIG[nearest.severity];
  const dist = distances.get(nearest.id);

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none">
      <div className={`pointer-events-auto mx-3 mt-3 md:mx-4 md:mt-4 rounded-2xl bg-gradient-to-r ${cfg.gradient} shadow-2xl border border-white/15 overflow-hidden`}>
        {/* Animated stripe */}
        <div className="h-0.5 bg-white/20 overflow-hidden">
          <div className="h-full w-1/3 bg-white/50 animate-[slide_2s_linear_infinite]" />
        </div>

        <div className="flex items-center gap-3 p-3.5">
          {/* Bouncing icon */}
          <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center flex-shrink-0 border border-white/10">
            <span className="text-2xl animate-bounce">🚧</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <AlertTriangle size={11} className="text-white/70 flex-shrink-0" />
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Speed Hump Ahead</span>
            </div>
            <p className="text-white font-bold text-base leading-tight truncate">{nearest.label}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.icon} {nearest.severity}
              </span>
              {dist !== undefined && (
                <span className="flex items-center gap-1 text-white/70 text-xs font-medium">
                  <Navigation2 size={10} />
                  {dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1000).toFixed(1)}km`}
                </span>
              )}
              {humps.length > 1 && (
                <span className="text-white/50 text-xs">+{humps.length - 1} more</span>
              )}
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => { onDismiss(nearest.id); setVisible(humps.length > 1); }}
            className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white/80 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Extra humps row */}
        {humps.length > 1 && (
          <div className="flex gap-2 px-3.5 pb-3">
            {humps.slice(1, 4).map((h) => (
              <div key={h.id} className="flex-1 bg-black/20 rounded-xl px-3 py-2 flex items-center gap-2 border border-white/5 min-w-0">
                <span className="text-sm flex-shrink-0">🚧</span>
                <div className="min-w-0">
                  <p className="text-white/90 text-xs font-semibold truncate">{h.label}</p>
                  <p className="text-white/40 text-xs">{Math.round(distances.get(h.id) ?? 0)}m</p>
                </div>
              </div>
            ))}
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
