import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SpeedHump = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string;
  created_at: string;
};
