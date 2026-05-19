'use client';

import { useState } from 'react';
import { X, AlertTriangle, FileText, Navigation2, Loader2 } from 'lucide-react';
import type { SpeedHump } from '@/lib/supabase';

interface AddHumpModalProps {
  lat: number;
  lng: number;
  onConfirm: (data: { label: string; severity: SpeedHump['severity']; notes: string }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const SEVERITY_OPTIONS: {
  value: SpeedHump['severity'];
  emoji: string;
  label: string;
  desc: string;
  colors: string;
  active: string;
}[] = [
  {
    value: 'mild',
    emoji: '🟢',
    label: 'Mild',
    desc: 'Small bump',
    colors: 'border-green-500/20 text-green-400/60 bg-transparent',
    active: 'bg-green-500/20 border-green-400/50 text-green-300',
  },
  {
    value: 'moderate',
    emoji: '🟡',
    label: 'Moderate',
    desc: 'Noticeable',
    colors: 'border-amber-500/20 text-amber-400/60 bg-transparent',
    active: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
  },
  {
    value: 'severe',
    emoji: '🔴',
    label: 'Severe',
    desc: 'Very rough',
    colors: 'border-red-500/20 text-red-400/60 bg-transparent',
    active: 'bg-red-500/20 border-red-400/50 text-red-300',
  },
];

export default function AddHumpModal({ lat, lng, onConfirm, onCancel, isSaving }: AddHumpModalProps) {
  const [label, setLabel]       = useState('Speed Hump');
  const [severity, setSeverity] = useState<SpeedHump['severity']>('moderate');
  const [notes, setNotes]       = useState('');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-[#16162a] border border-white/10 rounded-t-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-2xl border border-amber-500/20">
              🚧
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">New Speed Hump</h2>
              <p className="text-white/30 text-xs mt-1 font-mono">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/40 active:text-white/80 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">

          {/* Label */}
          <div>
            <label className="text-white/50 text-xs font-bold uppercase tracking-wider block mb-2.5">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Speed Hump"
              maxLength={60}
              autoComplete="off"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Severity — large tap targets */}
          <div>
            <label className="flex items-center gap-1.5 text-white/50 text-xs font-bold uppercase tracking-wider mb-2.5">
              <AlertTriangle size={12} />
              Severity
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSeverity(opt.value)}
                  className={`flex flex-col items-center gap-1 py-4 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                    severity === opt.value ? opt.active : `${opt.colors} active:bg-white/5`
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                  <span className="font-normal text-[10px] opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-white/50 text-xs font-bold uppercase tracking-wider mb-2.5">
              <FileText size={12} />
              Notes
              <span className="text-white/20 font-normal normal-case tracking-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Near the school gate, sharp bump…"
              rows={2}
              maxLength={200}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-20 py-4 rounded-2xl border border-white/10 text-white/50 text-sm font-bold active:bg-white/5 transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ label: label.trim() || 'Speed Hump', severity, notes: notes.trim() })}
            disabled={isSaving}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 active:from-amber-400 active:to-orange-400 text-white text-base font-black shadow-xl shadow-amber-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-98"
          >
            {isSaving ? (
              <><Loader2 size={18} className="animate-spin" /> Saving…</>
            ) : (
              <><Navigation2 size={18} /> Save Hump</>
            )}
          </button>
        </div>
      </div>

      <style>{`
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
