import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fszstqhbmpbbrunpnkmv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzenN0cWhibXBiYnJ1bnBua212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTYwNTQsImV4cCI6MjA5NDY3MjA1NH0.7jPQulUTndkbQbVRvm8sJQdaXlmbtbC3vvf3yROhiBM";

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
