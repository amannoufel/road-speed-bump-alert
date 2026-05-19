'use client';

import dynamic from 'next/dynamic';
import type { SpeedHump } from '@/lib/supabase';

const MapComponent = dynamic(() => import('./MapInner'), { ssr: false });

export interface MapViewProps {
  humps: SpeedHump[];
  userLocation: { lat: number; lng: number } | null;
  onAddHump: (lat: number, lng: number) => void;
  onDeleteHump: (id: string) => void;
  isRecording: boolean;
  alertedHumps: Set<string>;
  alertRadius: number;
  recenterSignal: number;
}

export default function MapView(props: MapViewProps) {
  return <MapComponent {...props} />;
}
