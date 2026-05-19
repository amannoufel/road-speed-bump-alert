-- HumpAlert: Speed Hump Tracker
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create speed_humps table
CREATE TABLE IF NOT EXISTS speed_humps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  label TEXT NOT NULL DEFAULT 'Speed Hump',
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create an index for geospatial bounding box queries
CREATE INDEX IF NOT EXISTS idx_speed_humps_lat_lng ON speed_humps (lat, lng);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_speed_humps_updated_at
  BEFORE UPDATE ON speed_humps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE speed_humps ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (adjust for auth if needed later)
CREATE POLICY "Allow public read" ON speed_humps
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON speed_humps
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete" ON speed_humps
  FOR DELETE USING (true);

CREATE POLICY "Allow public update" ON speed_humps
  FOR UPDATE USING (true);

-- Enable realtime for live syncing
ALTER PUBLICATION supabase_realtime ADD TABLE speed_humps;

-- Sample data (optional - remove for production)
-- INSERT INTO speed_humps (lat, lng, label, severity, notes) VALUES
--   (12.9716, 77.5946, 'Main St Hump', 'moderate', 'Near the bus stop'),
--   (12.9720, 77.5950, 'Market Road Hump', 'severe', 'Large hump, slow down!');
