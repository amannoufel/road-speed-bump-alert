'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeedHump } from '@/lib/supabase';
import { haversineDistance } from '@/lib/geoUtils';
import MapView from '@/components/MapView';
import AddHumpModal from '@/components/AddHumpModal';
import AlertBanner from '@/components/AlertBanner';
import HumpList from '@/components/HumpList';
import Toast from '@/components/Toast';
import SettingsSheet from '@/components/SettingsSheet';
import {
  List,
  Map as MapIcon,
  Settings,
  Wifi,
  WifiOff,
  Plus,
  RotateCcw,
  Navigation2,
  MapPin,
  Square,
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
    setHumps((prev) => prev.filter((h) => h.id !== id));
    setAlertedHumps((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setDismissedHumps((prev) => { const n = new Set(prev); n.delete(id); return n; });
    try {
      const res = await fetch(`/api/humps?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      addToast('Hump deleted', 'info');
    } catch {
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

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Alert banner (fixed overlay) */}
        <AlertBanner humps={activeHumpAlerts} distances={distances} onDismiss={handleDismissAlert} />

        {/* ── MOBILE HEADER ── */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#111127]/95 backdrop-blur-md border-b border-white/5 z-10 flex-shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-lg shadow-amber-500/25">
              🚧
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">HumpAlert</h1>
              <p className="text-white/35 text-[10px] mt-0.5">Speed Hump Tracker</p>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-2">
            {/* GPS pill */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ${
              userLocation ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${userLocation ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
              {userLocation ? 'GPS' : locationError ? 'No GPS' : '…'}
            </div>

            {/* Sync status */}
            {!isOnline && (
              <button
                onClick={fetchHumps}
                className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center text-red-400"
                title="Offline — tap to retry"
              >
                <WifiOff size={14} />
              </button>
            )}

            {/* Recenter */}
            {userLocation && (
              <button
                onClick={() => setRecenterSignal((v) => v + 1)}
                className="w-8 h-8 rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/50 active:text-white transition-colors"
                title="Center on me"
              >
                <Navigation2 size={15} />
              </button>
            )}

            {/* Settings */}
            <button
              id="btn-settings"
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/50 active:text-white transition-colors"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 relative overflow-hidden">

          {/* Map view */}
          <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

            {/* Recording banner on map */}
            {isRecording && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600/95 backdrop-blur-md shadow-xl border border-red-400/30 text-white text-sm font-bold">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Recording — Tap map or use button below
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

            {/* ── IN-MAP QUICK MARK BUTTON (recording mode) ── */}
            {isRecording && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center gap-2">
                <button
                  id="btn-mark-here"
                  onClick={handleAddAtCurrentLocation}
                  className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-amber-500 active:bg-amber-400 shadow-2xl shadow-amber-500/50 text-white font-bold text-base border border-amber-400/50 transition-transform active:scale-95"
                  style={{ minWidth: 200 }}
                >
                  <MapPin size={20} />
                  Mark Hump Here
                </button>
                <p className="text-white/50 text-xs bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                  Or tap anywhere on the map
                </p>
              </div>
            )}
          </div>

          {/* List view */}
          <div className={`absolute inset-0 overflow-y-auto bg-[#0d0d1a] transition-opacity duration-200 ${tab === 'list' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="p-4 space-y-4 pb-32">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard label="Mild" value={severityCounts.mild} color="text-green-400" bg="bg-green-500/10 border border-green-500/15" />
                <StatCard label="Moderate" value={severityCounts.moderate} color="text-amber-400" bg="bg-amber-500/10 border border-amber-500/15" />
                <StatCard label="Severe" value={severityCounts.severe} color="text-red-400" bg="bg-red-500/10 border border-red-500/15" />
              </div>

              {/* Sync status pill */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium ${
                isOnline ? 'bg-blue-500/10 border border-blue-500/15 text-blue-300'
                  : 'bg-red-500/10 border border-red-500/15 text-red-300'
              }`}>
                {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                {isOnline ? `Synced · ${humps.length} humps` : 'Offline — data may be stale'}
                {!isOnline && (
                  <button onClick={fetchHumps} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-white/70">
                    <RotateCcw size={11} /> Retry
                  </button>
                )}
              </div>

              {/* Quick add button */}
              <button
                onClick={handleAddAtCurrentLocation}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-dashed border-amber-500/40 text-amber-400/80 text-sm font-semibold active:bg-amber-500/10 transition-all"
              >
                <Navigation2 size={16} />
                Add hump at my current location
              </button>

              {/* List */}
              {isLoading ? (
                <div className="space-y-2.5">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <HumpList humps={humps} onDelete={handleDeleteHump} userLocation={userLocation} distances={distances} />
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <nav
          className="flex items-end border-t border-white/5 bg-[#0d0d18]/95 backdrop-blur-md flex-shrink-0 relative z-10"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {/* Map tab */}
          <button
            id="tab-map"
            onClick={() => setTab('map')}
            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 text-xs font-medium transition-colors active:scale-95 ${tab === 'map' ? 'text-amber-400' : 'text-white/30'}`}
          >
            <MapIcon size={22} />
            <span>Map</span>
          </button>

          {/* ── Central FAB ── */}
          <div className="flex flex-col items-center px-3 -mt-8 mb-1">
            <button
              id="btn-record-fab"
              onClick={() => {
                setIsRecording((v) => !v);
                setTab('map');
              }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl text-2xl transition-all duration-200 active:scale-95 ${
                isRecording
                  ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/60 ring-4 ring-red-500/30'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/50 ring-4 ring-amber-500/20'
              }`}
            >
              {isRecording ? <Square size={26} fill="white" className="text-white" /> : <Plus size={26} />}
            </button>
            <span className={`text-[10px] font-bold mt-1.5 ${isRecording ? 'text-red-400' : 'text-amber-400/70'}`}>
              {isRecording ? 'STOP' : 'RECORD'}
            </span>
          </div>

          {/* List tab */}
          <button
            id="tab-list"
            onClick={() => setTab('list')}
            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 text-xs font-medium transition-colors active:scale-95 ${tab === 'list' ? 'text-amber-400' : 'text-white/30'}`}
          >
            <List size={22} />
            <span>List</span>
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

      {/* Settings bottom sheet */}
      {showSettings && (
        <SettingsSheet
          alertRadius={alertRadius}
          onRadiusChange={setAlertRadius}
          onClose={() => setShowSettings(false)}
          humpCount={humps.length}
          isOnline={isOnline}
        />
      )}

      {/* Toast stack */}
      <div className="fixed bottom-28 right-4 z-[20000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => <Toast key={t.id} {...t} />)}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-3.5 text-center`}>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-white/35 text-xs mt-0.5 truncate">{label}</div>
    </div>
  );
}
