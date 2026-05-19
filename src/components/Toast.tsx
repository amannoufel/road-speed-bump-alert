'use client';

import { CheckCircle2, XCircle, Info } from 'lucide-react';

interface ToastProps {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

const CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-green-600/90 border-green-500/30', text: 'text-green-50' },
  error:   { icon: XCircle,      bg: 'bg-red-600/90 border-red-500/30',     text: 'text-red-50'   },
  info:    { icon: Info,         bg: 'bg-zinc-700/90 border-white/10',      text: 'text-zinc-100' },
};

export default function Toast({ text, type }: ToastProps) {
  const { icon: Icon, bg, text: textClass } = CONFIG[type];
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl ${bg} ${textClass} text-sm font-medium animate-in slide-in-from-right duration-300`}
    >
      <Icon size={15} className="flex-shrink-0 opacity-90" />
      <span>{text}</span>
    </div>
  );
}
