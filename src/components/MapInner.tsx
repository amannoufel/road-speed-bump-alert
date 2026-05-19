'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle,
  useMapEvents, useMap, ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SpeedHump } from '@/lib/supabase';
import type { MapViewProps } from './MapView';

// ── Fix webpack icon resolution ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Hump marker icon ──────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  mild: '#22c55e',
  moderate: '#f59e0b',
  severe: '#ef4444',
};

function createHumpIcon(severity: string, alerted: boolean) {
  const color = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.moderate;
  const glow = alerted
    ? `box-shadow: 0 0 0 6px ${color}55, 0 0 0 12px ${color}22, 0 4px 16px rgba(0,0,0,0.5);`
    : 'box-shadow: 0 3px 12px rgba(0,0,0,0.5);';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 44px; height: 44px;
      ">
        <div style="
          width: 44px; height: 44px; border-radius: 50% 50% 50% 0;
          background: ${color}; border: 3px solid rgba(255,255,255,0.95);
          transform: rotate(-45deg);
          ${glow}
          ${alerted ? 'animation: hump-pulse 1.2s ease-in-out infinite;' : ''}
        "></div>
        <span style="
          position: absolute; top: 47%; left: 48%;
          transform: translate(-50%, -50%) rotate(45deg);
          font-size: 20px; line-height: 1; user-select: none;
        ">🚧</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -48],
  });
}

// ── User location icon ────────────────────────────────────────────────────
const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; width: 22px; height: 22px;">
      <div style="
        width: 22px; height: 22px; border-radius: 50%;
        background: #3b82f6; border: 3px solid white;
        box-shadow: 0 0 0 5px rgba(59,130,246,0.25), 0 3px 10px rgba(0,0,0,0.4);
      "></div>
      <div style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 7px; height: 7px; border-radius: 50%;
        background: white;
      "></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// ── LocationTracker: auto-center once on first GPS fix + recenter signal ──
function LocationTracker({
  userLocation,
  recenterSignal,
}: {
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
}) {
  const map = useMap();
  const centered = useRef(false);
  const prevSignal = useRef(recenterSignal);

  useEffect(() => {
    if (!userLocation) return;
    if (!centered.current) {
      map.setView([userLocation.lat, userLocation.lng], 17, { animate: true });
      centered.current = true;
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (recenterSignal !== prevSignal.current && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 17, { animate: true, duration: 0.8 });
      prevSignal.current = recenterSignal;
    }
  }, [recenterSignal, userLocation, map]);

  return null;
}

// ── ClickHandler: change cursor in recording mode and fire callback ────────
function ClickHandler({
  onAddHump,
  isRecording,
}: {
  onAddHump: (lat: number, lng: number) => void;
  isRecording: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = isRecording ? 'crosshair' : '';
  }, [isRecording, map]);

  useMapEvents({
    click(e) {
      if (isRecording) onAddHump(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Popup content (dark styled) ───────────────────────────────────────────
function HumpPopup({
  hump,
  onDelete,
}: {
  hump: SpeedHump;
  onDelete: (id: string) => void;
}) {
  const sev = hump.severity;
  const badgeBg =
    sev === 'severe' ? '#3f0f0f' : sev === 'moderate' ? '#3d2a00' : '#0f2e1a';
  const badgeColor =
    sev === 'severe' ? '#f87171' : sev === 'moderate' ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '210px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '22px' }}>🚧</span>
        <strong style={{ fontSize: '15px', color: '#f3f4f6' }}>{hump.label}</strong>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
        fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em',
        background: badgeBg, color: badgeColor,
      }}>
        <span style={{ fontSize: '9px', opacity: 0.8 }}>●</span>
        {sev.toUpperCase()}
      </div>

      {hump.notes && (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 8px' }}>{hump.notes}</p>
      )}
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 12px' }}>
        📅 {new Date(hump.created_at).toLocaleDateString(undefined, {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
      </p>

      <button
        onClick={() => onDelete(hump.id)}
        style={{
          width: '100%', padding: '7px 0', border: 'none',
          borderRadius: '8px', background: '#3f1515', color: '#f87171',
          cursor: 'pointer', fontSize: '13px', fontWeight: 700,
          transition: 'background 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#5a1e1e')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#3f1515')}
      >
        🗑 Delete Hump
      </button>
    </div>
  );
}

// ── Main map component ────────────────────────────────────────────────────
export default function MapInner({
  humps, userLocation, onAddHump, onDeleteHump,
  isRecording, alertedHumps, alertRadius, recenterSignal,
}: MapViewProps) {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [12.9716, 77.5946];

  return (
    <>
      {/* Pulse animation for alerted markers */}
      <style>{`
        @keyframes hump-pulse {
          0%, 100% { transform: rotate(-45deg) scale(1); }
          50% { transform: rotate(-45deg) scale(1.15); }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={16}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        {/* Zoom control at bottom-right for one-handed mobile reach */}
        <ZoomControl position="bottomright" />
        {/* Dark map tiles from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <LocationTracker userLocation={userLocation} recenterSignal={recenterSignal} />
        <ClickHandler onAddHump={onAddHump} isRecording={isRecording} />

        {/* User location + alert radius */}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', color: '#f3f4f6', fontWeight: 600 }}>
                  📍 You are here
                </div>
              </Popup>
            </Marker>

            {/* Alert radius circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={alertRadius}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '5 5',
              }}
            />
          </>
        )}

        {/* Hump markers */}
        {humps.map((hump) => (
          <Marker
            key={hump.id}
            position={[hump.lat, hump.lng]}
            icon={createHumpIcon(hump.severity, alertedHumps.has(hump.id))}
          >
            <Popup maxWidth={240} closeButton={true}>
              <HumpPopup hump={hump} onDelete={onDeleteHump} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
