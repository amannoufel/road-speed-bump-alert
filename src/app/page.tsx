'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeedHump } from '@/lib/supabase';
import { haversineDistance } from '@/lib/geoUtils';
import MapView from '@/components/MapView';
import AddHumpModal from '@/components/AddHumpModal';
import AlertBanner from '@/components/AlertBanner';
import HumpList from '@/components/HumpList';
import Toast from '@/components/Toast';
import {
  List,
  Map as MapIcon,
  Settings,
  Wifi,
  WifiOff,
  ChevronRight,
  Plus,
  RotateCcw,
  Navigation2,
} from 'lucide-react';

type DistMap = globalThis.Map<string, number>;
type Tab = 'map' | 'list';
type ToastMsg = { id: number; text: string; type: 'success' | 'error' | 'info' };

const DEFAULT_ALERT_RADIUS = 100;

export default function HomePage() {
  const [humps, setHumps] = useState<SpeedHump[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [alertedHumps, setAlertedHumps] = useState<Set<string>>(new Set());
  // tracks humps dismissed THIS approach; auto-clears when they leave the radius
  const [dismissedHumps, setDismissedHumps] = useState<Set<string>>(new Set());
  const [activeHumpAlerts, setActiveHumpAlerts] = useState<SpeedHump[]>([]);
  const [distances, setDistances] = useState<DistMap>(new globalThis.Map());
  const [pendingHump, setPendingHump] = useState<{ lat: number; lng: number } | null>(null);
  const [tab, setTab] = useState<Tab>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [alertRadius, setAlertRadius] = useState(DEFAULT_ALERT_RADIUS);
  const [showSettings, setShowSettings] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const toastCountRef = useRef(0);

  const addToast = useCallback((text: string, type: ToastMsg['type'] = 'info') => {
    const id = ++toastCountRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Fetch all humps ──────────────────────────────────────────────────────
  const fetchHumps = useCallback(async () => {
    try {
      const res = await fetch('/api/humps');
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if (json.data) setHumps(json.data);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchHumps(); }, [fetchHumps]);

  // ── GPS watch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation not supported.');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => setLocationError(err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Proximity check ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userLocation || humps.length === 0) return;

    const newDist = new globalThis.Map<string, number>();
    const nearby: SpeedHump[] = [];

    humps.forEach((hump) => {
      const d = haversineDistance(userLocation.lat, userLocation.lng, hump.lat, hump.lng);
      newDist.set(hump.id, d);

      if (d <= alertRadius) {
        nearby.push(hump);
        if (!dismissedHumps.has(hump.id)) {
          setAlertedHumps((prev) => new Set([...prev, hump.id]));
        }
      } else {
        // Reset dismiss once they leave 1.5× radius so it re-alerts on next pass
        if (d > alertRadius * 1.5) {
          setDismissedHumps((prev) => {
            if (!prev.has(hump.id)) return prev;
            const next = new Set(prev);
            next.delete(hump.id);
            return next;
          });
        }
        setAlertedHumps((prev) => {
          if (!prev.has(hump.id)) return prev;
          const next = new Set(prev);
          next.delete(hump.id);
          return next;
        });
      }
    });

    setDistances(newDist);
    const active = nearby
      .filter((h) => !dismissedHumps.has(h.id))
      .sort((a, b) => (newDist.get(a.id) ?? 0) - (newDist.get(b.id) ?? 0));
    setActiveHumpAlerts(active);
  }, [userLocation, humps, alertRadius, dismissedHumps]);

  // ── Map click handler ────────────────────────────────────────────────────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (isRecording) setPendingHump({ lat, lng });
  }, [isRecording]);

  // ── Quick-add at current position ────────────────────────────────────────
  const handleAddAtCurrentLocation = useCallback(() => {
    if (!userLocation) { addToast('GPS not available yet', 'error'); return; }
    setPendingHump({ lat: userLocation.lat, lng: userLocation.lng });
  }, [userLocation, addToast]);

  // ── Save hump ────────────────────────────────────────────────────────────
  const handleConfirmHump = async (data: {
    label: string;
    severity: SpeedHump['severity'];
    notes: string;
  }) => {
    if (!pendingHump) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/humps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingHump, ...data }),
      });
      const json = await res.json();
      if (json.data) {
        setHumps((prev) => [json.data, ...prev]);
        addToast('🚧 Speed hump saved!', 'success');
        setIsOnline(true);
      } else {
        addToast(json.error ?? 'Failed to save', 'error');
      }
    } catch {
      setIsOnline(false);
      addToast('No internet — could not save', 'error');
    }
    setIsSaving(false);
    setPendingHump(null);
  };

  // ── Delete hump ──────────────────────────────────────────────────────────
  const handleDeleteHump = async (id: string) => {
    // Optimistic remove
    setHumps((prev) => prev.filter((h) => h.id !== id));
    setAlertedHumps((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setDismissedHumps((prev) => { const n = new Set(prev); n.delete(id); return n; });
    try {
      const res = await fetch(`/api/humps?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      addToast('Hump deleted', 'info');
    } catch {
      // Re-fetch to restore if delete failed
      fetchHumps();
      addToast('Delete failed — refreshed data', 'error');
    }
  };

  // ── Dismiss alert ────────────────────────────────────────────────────────
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedHumps((prev) => new Set([...prev, id]));
    setActiveHumpAlerts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const severityCounts = {
    mild: humps.filter((h) => h.severity === 'mild').length,
    moderate: humps.filter((h) => h.severity === 'moderate').length,
    severe: humps.filter((h) => h.severity === 'severe').length,
  };

  return (
    <div className="flex h-screen bg-[#0d0d1a] text-white overflow-hidden">

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/5 bg-[#111127] z-10 flex-shrink-0">

        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/25">
              🚧
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">HumpAlert</h1>
              <p className="text-white/40 text-xs mt-0.5">Speed Hump Tracker</p>
            </div>
          </div>
        </div>

        {/* Status chips */}
        <div className="p-4 space-y-2">
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            userLocation ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-white/5 border border-white/10 text-white/40'
          }`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${userLocation ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <span className="truncate">
              {userLocation
                ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`
                : locationError || 'Waiting for GPS…'}
            </span>
            {userLocation && (
              <button
                onClick={() => setRecenterSignal((v) => v + 1)}
                title="Center map on me"
                className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Navigation2 size={13} />
              </button>
            )}
          </div>

          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium ${
            isOnline ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Synced with Supabase' : 'Offline — data may be stale'}
            {!isOnline && (
              <button onClick={fetchHumps} className="ml-auto" title="Retry">
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Severity stats */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Mild" value={severityCounts.mild} color="text-green-400" bg="bg-green-500/10 border border-green-500/10" />
            <StatCard label="Moderate" value={severityCounts.moderate} color="text-amber-400" bg="bg-amber-500/10 border border-amber-500/10" />
            <StatCard label="Severe" value={severityCounts.severe} color="text-red-400" bg="bg-red-500/10 border border-red-500/10" />
          </div>
        </div>

        {/* Record button */}
        <div className="px-4 pb-3 space-y-2">
          <button
            id="btn-record"
            onClick={() => { setIsRecording((v) => !v); if (!isRecording) setTab('map'); }}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isRecording
                ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400'
            }`}
          >
            {isRecording ? (
              <><div className="w-3 h-3 rounded-sm bg-white animate-pulse" /> Stop Recording</>
            ) : (
              <><Plus size={16} /> Record Hump</>
            )}
          </button>

          {/* Quick-add at current location */}
          <button
            id="btn-add-here"
            onClick={handleAddAtCurrentLocation}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
          >
            <Navigation2 size={13} />
            Add at my current location
          </button>
        </div>

        {isRecording && (
          <p className="text-center text-amber-400/70 text-xs pb-2 animate-pulse">
            👆 Tap anywhere on the map to mark a hump
          </p>
        )}

        {/* Hump list */}
        <div className="flex-1 px-4 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">Recorded</span>
            <span className="text-white/25 text-xs">{humps.length} total</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <HumpList humps={humps} onDelete={handleDeleteHump} userLocation={userLocation} distances={distances} />
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-white/40 hover:text-white/70 text-sm"
          >
            <Settings size={15} />
            Settings
            <ChevronRight size={14} className={`ml-auto transition-transform duration-200 ${showSettings ? 'rotate-90' : ''}`} />
          </button>

          {showSettings && (
            <div className="mt-2 px-3 py-3 bg-white/5 rounded-xl space-y-4">
              {/* Alert radius */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/50">Alert radius</span>
                  <span className="text-amber-400 font-bold">{alertRadius}m</span>
                </div>
                <input
                  type="range" min={30} max={500} step={10}
                  value={alertRadius}
                  onChange={(e) => setAlertRadius(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-white/20 text-xs mt-1">
                  <span>30m</span><span>500m</span>
                </div>
              </div>
              <div className="text-white/30 text-xs border-t border-white/5 pt-2">
                v1.0 · HumpAlert
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Alert banner (fixed overlay) */}
        <AlertBanner humps={activeHumpAlerts} distances={distances} onDismiss={handleDismissAlert} />

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111127] border-b border-white/5 z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚧</span>
            <span className="font-bold text-sm">HumpAlert</span>
          </div>
          <div className="flex items-center gap-3">
            {userLocation && (
              <button
                onClick={() => setRecenterSignal((v) => v + 1)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Navigation2 size={15} />
              </button>
            )}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              userLocation ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${userLocation ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
              {userLocation ? 'GPS' : 'No GPS'}
            </div>
          </div>
        </header>

        {/* Tab content area */}
        <div className="flex-1 relative overflow-hidden">

          {/* Map view */}
          <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {isRecording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600/95 backdrop-blur-md shadow-xl border border-red-400/30 text-white text-sm font-bold animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Recording — Tap to mark hump
                </div>
              </div>
            )}
            <MapView
              humps={humps}
              userLocation={userLocation}
              onAddHump={handleMapClick}
              onDeleteHump={handleDeleteHump}
              isRecording={isRecording}
              alertedHumps={alertedHumps}
              alertRadius={alertRadius}
              recenterSignal={recenterSignal}
            />
          </div>

          {/* List view (mobile) */}
          <div className={`absolute inset-0 overflow-y-auto bg-[#0d0d1a] transition-opacity duration-200 ${tab === 'list' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="p-4 space-y-4">
              {/* Severity stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard label="Mild" value={severityCounts.mild} color="text-green-400" bg="bg-green-500/10 border border-green-500/10" />
                <StatCard label="Moderate" value={severityCounts.moderate} color="text-amber-400" bg="bg-amber-500/10 border border-amber-500/10" />
                <StatCard label="Severe" value={severityCounts.severe} color="text-red-400" bg="bg-red-500/10 border border-red-500/10" />
              </div>

              {/* Quick-add */}
              <button
                onClick={handleAddAtCurrentLocation}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-400/70 text-sm font-medium hover:bg-amber-500/5 hover:text-amber-400 transition-all"
              >
                <Navigation2 size={15} />
                Add hump at my current location
              </button>

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <HumpList humps={humps} onDelete={handleDeleteHump} userLocation={userLocation} distances={distances} />
              )}
            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-end border-t border-white/5 bg-[#0d0d18] pb-safe flex-shrink-0">
          <button
            id="tab-map"
            onClick={() => setTab('map')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${tab === 'map' ? 'text-amber-400' : 'text-white/30'}`}
          >
            <MapIcon size={19} />
            Map
          </button>

          {/* FAB center button */}
          <div className="flex flex-col items-center pb-1 px-4">
            <button
              id="btn-record-fab"
              onClick={() => { setIsRecording((v) => !v); setTab('map'); }}
              className={`w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-2xl text-lg transition-all duration-200 ${
                isRecording
                  ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/50 scale-110 ring-4 ring-red-500/30'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40 hover:scale-105'
              }`}
            >
              {isRecording ? '⏹' : '🚧'}
            </button>
            <span className="text-xs text-white/30 mt-1">
              {isRecording ? 'Stop' : 'Record'}
            </span>
          </div>

          <button
            id="tab-list"
            onClick={() => setTab('list')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${tab === 'list' ? 'text-amber-400' : 'text-white/30'}`}
          >
            <List size={19} />
            List
          </button>
        </nav>
      </div>

      {/* Add hump modal */}
      {pendingHump && (
        <AddHumpModal
          lat={pendingHump.lat}
          lng={pendingHump.lng}
          onConfirm={handleConfirmHump}
          onCancel={() => setPendingHump(null)}
          isSaving={isSaving}
        />
      )}

      {/* Toast stack */}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[20000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => <Toast key={t.id} {...t} />)}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-white/35 text-xs mt-0.5 truncate">{label}</div>
    </div>
  );
}
