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

const SEVERITY_OPTIONS: { value: SpeedHump['severity']; emoji: string; label: string; colors: string; active: string }[] = [
  { value: 'mild',     emoji: '🟢', label: 'Mild',     colors: 'border-green-500/20 text-green-400/70', active: 'bg-green-500/20 border-green-400/60 text-green-300' },
  { value: 'moderate', emoji: '🟡', label: 'Moderate', colors: 'border-amber-500/20 text-amber-400/70', active: 'bg-amber-500/20 border-amber-400/60 text-amber-300' },
  { value: 'severe',   emoji: '🔴', label: 'Severe',   colors: 'border-red-500/20 text-red-400/70',   active: 'bg-red-500/20   border-red-400/60   text-red-300'   },
];

export default function AddHumpModal({ lat, lng, onConfirm, onCancel, isSaving }: AddHumpModalProps) {
  const [label, setLabel]       = useState('Speed Hump');
  const [severity, setSeverity] = useState<SpeedHump['severity']>('moderate');
  const [notes, setNotes]       = useState('');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[#16162a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-xl border border-amber-500/20">
              🚧
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">New Speed Hump</h2>
              <p className="text-white/35 text-xs mt-1 font-mono">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Label */}
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Speed Hump"
              maxLength={60}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:bg-white/7 transition-all"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="flex items-center gap-1.5 text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              <AlertTriangle size={11} />
              Severity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSeverity(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${
                    severity === opt.value ? opt.active : `bg-transparent ${opt.colors} hover:bg-white/3`
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              <FileText size={11} />
              Notes
              <span className="text-white/20 font-normal normal-case tracking-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Large hump near the school gate…"
              rows={2}
              maxLength={200}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-5 pb-6 pt-1">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl border border-white/8 text-white/50 text-sm font-semibold hover:bg-white/5 hover:text-white/70 transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ label: label.trim() || 'Speed Hump', severity, notes: notes.trim() })}
            disabled={isSaving}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold shadow-lg shadow-amber-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : (
              '🚧 Save Hump'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
