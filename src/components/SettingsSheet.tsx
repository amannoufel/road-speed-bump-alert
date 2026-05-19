'use client';

import { useEffect, useRef } from 'react';
import { X, Radio, Wifi, WifiOff, ChevronDown } from 'lucide-react';

interface SettingsSheetProps {
  alertRadius: number;
  onRadiusChange: (v: number) => void;
  onClose: () => void;
  humpCount: number;
  isOnline: boolean;
}

export default function SettingsSheet({
  alertRadius,
  onRadiusChange,
  onClose,
  humpCount,
  isOnline,
}: SettingsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[15000] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-[#16162a] rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-white font-bold text-lg">Settings</h2>
            <p className="text-white/35 text-xs mt-0.5">HumpAlert v1.0</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/50 active:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 space-y-6">

          {/* Alert radius */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio size={16} className="text-amber-400" />
              <span className="text-white/70 text-sm font-semibold">Alert Radius</span>
              <span className="ml-auto text-amber-400 font-black text-base">{alertRadius}m</span>
            </div>
            <p className="text-white/30 text-xs mb-4">
              Get alerted when within this distance of a speed hump.
            </p>

            {/* Big thumb-friendly slider */}
            <div className="relative">
              <input
                type="range"
                min={30}
                max={500}
                step={10}
                value={alertRadius}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="mobile-slider w-full"
              />
              <div className="flex justify-between text-white/20 text-xs mt-2">
                <span>30m</span>
                <span>500m</span>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[50, 100, 200, 300].map((v) => (
                <button
                  key={v}
                  onClick={() => onRadiusChange(v)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    alertRadius === v
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-white/5 text-white/40 active:bg-white/10'
                  }`}
                >
                  {v}m
                </button>
              ))}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-white/35 text-xs">Humps Recorded</span>
              <span className="text-white font-black text-2xl">{humpCount}</span>
            </div>
            <div className={`rounded-2xl p-4 flex flex-col gap-1 ${
              isOnline ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <div className="flex items-center gap-1.5">
                {isOnline ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-red-400" />}
                <span className={`text-xs font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <span className="text-white/50 text-xs mt-0.5">
                {isOnline ? 'Synced with cloud' : 'Data may be stale'}
              </span>
            </div>
          </div>

          {/* Close CTA */}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 active:bg-white/10 text-white/50 active:text-white font-semibold text-sm transition-all"
          >
            <ChevronDown size={16} />
            Close Settings
          </button>
        </div>
      </div>

      <style>{`
        .mobile-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 6px;
          background: linear-gradient(to right, #f59e0b ${((alertRadius - 30) / 470) * 100}%, rgba(255,255,255,0.1) ${((alertRadius - 30) / 470) * 100}%);
          outline: none;
          cursor: pointer;
        }
        .mobile-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f59e0b;
          border: 3px solid white;
          box-shadow: 0 2px 12px rgba(245,158,11,0.5);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .mobile-slider:active::-webkit-slider-thumb {
          transform: scale(1.2);
        }
        .mobile-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f59e0b;
          border: 3px solid white;
          box-shadow: 0 2px 12px rgba(245,158,11,0.5);
          cursor: pointer;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  );
}
