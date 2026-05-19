import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === 'your_supabase_project_url') {
    return null;
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured', data: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = Number(searchParams.get('radius') ?? '1000');

  if (lat && lng) {
    const latF = parseFloat(lat);
    const lngF = parseFloat(lng);
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos((latF * Math.PI) / 180));

    const { data, error } = await supabase
      .from('speed_humps')
      .select('*')
      .gte('lat', latF - latDelta)
      .lte('lat', latF + latDelta)
      .gte('lng', lngF - lngDelta)
      .lte('lng', lngF + lngDelta)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const { data, error } = await supabase
    .from('speed_humps')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { lat, lng, label, severity, notes } = body as Record<string, unknown>;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 });
  }

  const validSeverities = ['mild', 'moderate', 'severe'];
  const sev = validSeverities.includes(String(severity)) ? severity : 'moderate';

  const { data, error } = await supabase
    .from('speed_humps')
    .insert([{
      lat,
      lng,
      label: String(label ?? 'Speed Hump').slice(0, 100),
      severity: sev,
      notes: String(notes ?? '').slice(0, 500),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('speed_humps').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
