-- ==============================================================================
-- SENTINEL-SOC: SUPABASE DATABASE THREAT LOGS & AUTOMATED HMAC WEBHOOK SCHEMA
-- ==============================================================================
-- Buka Dashboard Supabase Anda: https://supabase.com/dashboard/project/luocftgfmcwlentsmtyo
-- Masuk ke menu "SQL Editor" -> Klik "New query" -> Paste SQL ini -> Klik "Run"

-- 1. Buat Tabel Penampung Laporan Ancaman (threat_logs)
CREATE TABLE IF NOT EXISTS public.threat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_kejadian TEXT DEFAULT 'Bahaya',
    level_ancaman TEXT DEFAULT 'CRITICAL',
    detail_pesan TEXT NOT NULL,
    source_ip TEXT DEFAULT '185.220.101.5',
    database_table TEXT DEFAULT 'users',
    cvss_score NUMERIC DEFAULT 9.8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS) dan Beri Izin Akses
ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan anon & authenticated untuk INSERT dan SELECT
CREATE POLICY "Allow public insert and read" 
ON public.threat_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

GRANT ALL ON public.threat_logs TO anon, authenticated, service_role;

-- 3. Masukkan Sampel Data Ancaman Pertama
INSERT INTO public.threat_logs (status_kejadian, level_ancaman, detail_pesan, source_ip, database_table, cvss_score)
VALUES (
    'Bahaya',
    'CRITICAL',
    'Percobaan SQL Injection terdeteksi pada tabel credentials -> SELECT id, username, password FROM users WHERE admin=1 OR 1=1 --',
    '185.220.101.5',
    'users',
    9.8
);

-- 4. Verifikasi Data Berhasil Masuk
SELECT * FROM public.threat_logs ORDER BY created_at DESC LIMIT 5;
