'use client';

import type { SpeedHump } from '@/lib/supabase';
import { MapPin, Trash2 } from 'lucide-react';

type DistMap = globalThis.Map<string, number>;

interface HumpListProps {
  humps: SpeedHump[];
  onDelete: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  distances?: DistMap;
}

const SEV = {
  mild:     { dot: 'bg-green-500',  badge: 'text-green-400',  ring: 'border-green-500/20 bg-green-500/8' },
  moderate: { dot: 'bg-amber-500',  badge: 'text-amber-400',  ring: 'border-amber-500/20 bg-amber-500/8' },
  severe:   { dot: 'bg-red-500',    badge: 'text-red-400',    ring: 'border-red-500/20 bg-red-500/8'     },
};

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function HumpList({ humps, onDelete, distances }: HumpListProps) {
  if (humps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/5 flex items-center justify-center text-3xl mb-4">🛣️</div>
        <p className="text-white/40 text-sm font-medium">No humps recorded yet</p>
        <p className="text-white/20 text-xs mt-1">Enable record mode and tap the map</p>
      </div>
    );
  }

  // Sort: by distance if available, else by created_at desc
  const sorted = [...humps].sort((a, b) => {
    const da = distances?.get(a.id);
    const db = distances?.get(b.id);
    if (da !== undefined && db !== undefined) return da - db;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-1.5">
      {sorted.map((hump) => {
        const s = SEV[hump.severity];
        const dist = distances?.get(hump.id);
        return (
          <div
            key={hump.id}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.01] ${s.ring}`}
          >
            {/* Severity dot */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🚧</span>
                <p className="text-white/90 text-sm font-semibold truncate">{hump.label}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium ${s.badge}`}>{hump.severity}</span>
                {dist !== undefined && (
                  <span className="flex items-center gap-0.5 text-white/30 text-xs">
                    <MapPin size={9} />
                    {formatDist(dist)}
                  </span>
                )}
                {hump.notes && (
                  <span className="text-white/25 text-xs truncate">{hump.notes}</span>
                )}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(hump.id); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/0 group-hover:text-red-400/70 hover:!text-red-400 hover:bg-red-500/15 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
