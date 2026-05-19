'use client';

import type { SpeedHump } from '@/lib/supabase';
import { MapPin, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

type DistMap = globalThis.Map<string, number>;

interface HumpListProps {
  humps: SpeedHump[];
  onDelete: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  distances?: DistMap;
}

const SEV = {
  mild:     { dot: 'bg-green-500',  badge: 'text-green-400',  ring: 'border-green-500/25 bg-green-500/8',  label: '🟢 Mild'     },
  moderate: { dot: 'bg-amber-500',  badge: 'text-amber-400',  ring: 'border-amber-500/25 bg-amber-500/8',  label: '🟡 Moderate' },
  severe:   { dot: 'bg-red-500',    badge: 'text-red-400',    ring: 'border-red-500/25 bg-red-500/8',      label: '🔴 Severe'   },
};

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function HumpRow({ hump, onDelete, dist }: {
  hump: SpeedHump;
  onDelete: (id: string) => void;
  dist: number | undefined;
}) {
  const s = SEV[hump.severity];
  const [showConfirm, setShowConfirm] = useState(false);

  // Swipe-to-delete state
  const touchStartX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);

  const SWIPE_THRESHOLD = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeOffset(Math.max(dx, -120)); // only left-swipe
  };

  const onTouchEnd = () => {
    if (swipeOffset < -SWIPE_THRESHOLD) {
      setIsSwiped(true);
      setSwipeOffset(-80); // snap to reveal delete
    } else {
      setSwipeOffset(0);
      setIsSwiped(false);
    }
  };

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(hump.id);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2500);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe delete bg */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center w-24 bg-red-600 rounded-2xl">
        <Trash2 size={20} className="text-white" />
      </div>

      {/* Row content */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors relative bg-[#0d0d1a] ${s.ring}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 || isSwiped ? 'transform 0.2s ease' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Severity dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">🚧</span>
            <p className="text-white/90 text-sm font-bold truncate">{hump.label}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-xs font-semibold ${s.badge}`}>{s.label}</span>
            {dist !== undefined && (
              <span className="flex items-center gap-0.5 text-white/35 text-xs">
                <MapPin size={9} />
                {formatDist(dist)}
              </span>
            )}
            {hump.notes && (
              <span className="text-white/25 text-xs truncate max-w-[120px]">{hump.notes}</span>
            )}
          </div>
        </div>

        {/* Always-visible delete */}
        <button
          onClick={handleDelete}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
            showConfirm
              ? 'bg-red-500 text-white'
              : 'bg-white/5 text-white/30 active:bg-red-500/20 active:text-red-400'
          }`}
          title={showConfirm ? 'Tap again to confirm' : 'Delete'}
        >
          {showConfirm ? (
            <span className="text-xs font-black">✓?</span>
          ) : (
            <Trash2 size={15} />
          )}
        </button>
      </div>
    </div>
  );
}

export default function HumpList({ humps, onDelete, distances }: HumpListProps) {
  if (humps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-white/4 border border-white/5 flex items-center justify-center text-4xl mb-5">🛣️</div>
        <p className="text-white/40 text-base font-semibold">No humps recorded yet</p>
        <p className="text-white/20 text-sm mt-2">Tap Record, then mark a hump on the map</p>
      </div>
    );
  }

  const sorted = [...humps].sort((a, b) => {
    const da = distances?.get(a.id);
    const db = distances?.get(b.id);
    if (da !== undefined && db !== undefined) return da - db;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-2">
      <p className="text-white/25 text-xs font-semibold uppercase tracking-widest px-1">
        ← Swipe left to delete · Tap 🗑 twice to confirm
      </p>
      {sorted.map((hump) => (
        <HumpRow
          key={hump.id}
          hump={hump}
          onDelete={onDelete}
          dist={distances?.get(hump.id)}
        />
      ))}
    </div>
  );
}
