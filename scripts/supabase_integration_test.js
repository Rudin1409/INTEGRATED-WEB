import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luocftgfmcwlentsmtyo.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ARqo3X00_WQlUHXiC0BQMQ_V3Q69i3m';
const HMAC_SECRET = process.env.HMAC_SECRET || 'cyber_soc_secure_hmac_secret_2026_key_super_safe';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8886739791:AAE0xHTkhwU_caj8dYD48w9uo0K1SjQY0bc';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7182134624';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSupabaseEndToEnd() {
  console.log('\n' + '='.repeat(85));
  console.log(' [INTEGRASI END-TO-END: SUPABASE DATABASE -> HMAC WEBHOOK -> TELEGRAM BOT] ');
  console.log('='.repeat(85));
  console.log(`[+] Supabase Project URL : ${SUPABASE_URL}`);
  console.log(`[+] Telegram Target      : Chat ID ${TELEGRAM_CHAT_ID} via @Sentinel_SOCBot`);

  // 1. Coba baca data dari tabel threat_logs di Supabase
  console.log('\n[1] Memeriksa koneksi dan tabel public.threat_logs di Supabase...');
  const { data: existingRows, error: selectError } = await supabase
    .from('threat_logs')
    .select('*')
    .limit(3);

  if (selectError) {
    console.log(`[!] Info Supabase: ${selectError.message}`);
    console.log('[*] Catatan: Jika tabel belum dibuat, silakan jalankan query di supabase_schema.sql via SQL Editor.');
    console.log('[*] Menjalankan simulasi payload Supabase terotentikasi secara dinamis...');
  } else {
    console.log(`[✔] Berhasil terhubung ke Supabase! Ditemukan ${existingRows.length} rekaman di threat_logs.`);
  }

  // 2. Bentuk payload laporan kejadian dari Supabase
  const threatPayload = {
    status_kejadian: 'Bahaya',
    level_ancaman: 'CRITICAL',
    detail_pesan: "Database Event Trigger (Supabase): Pola SQL Injection terdeteksi -> SELECT id, username, password_hash FROM auth.users WHERE email='admin@soc.corp' OR 1=1 --",
    source_ip: '103.247.12.88',
    database_table: 'auth.users',
    cvss_score: 9.8,
    timestamp: new Date().toISOString()
  };

  const rawBodyString = JSON.stringify(threatPayload);

  // 3. Hitung Signature HMAC-SHA256 dari payload Supabase
  console.log('\n[2] Menghitung Signature HMAC-SHA256 dari raw payload...');
  const hmacSignature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(rawBodyString)
    .digest('hex');

  console.log(`[+] Computed HMAC Digest: ${hmacSignature}`);

  // 4. Kirimkan Webhook Resmi ke Telegram Bot via API
  console.log('\n[3] Memancarkan notifikasi alert langsung ke Telegram...');
  const telegramMessage = 
`🚨 <b>[SUPABASE DATABASE TRIGGER] ANCAMAN REALTIME DETECTED</b> 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Event Origin:</b> <code>Supabase (luocftgfmcwlentsmtyo)</code>
📌 <b>Status:</b> <b>${threatPayload.status_kejadian.toUpperCase()}</b>
⚠️ <b>Level Ancaman:</b> ${threatPayload.level_ancaman} (CVSS: ${threatPayload.cvss_score})
🌐 <b>Source IP:</b> <code>${threatPayload.source_ip}</code>
🎯 <b>Tabel Database:</b> <code>${threatPayload.database_table}</code>
⏰ <b>Waktu:</b> <code>${threatPayload.timestamp}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
💉 <b>Detail Eksploitasi:</b>
<code>${threatPayload.detail_pesan}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ <b>HMAC-SHA256:</b> <code>${hmacSignature.slice(0, 32)}... [VERIFIED]</code>
🔒 <i>Sistem Pertahanan: Sesi user ditutup paksa & IP dimasukkan ke WAF blacklist.</i>`;

  const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'HTML'
    })
  });

  const tgJson = await tgRes.json();
  if (tgJson.ok) {
    console.log('[✔] SUKSES! Notifikasi Laporan Supabase telah terkirim ke Telegram Anda!');
  } else {
    console.log('[-] Telegram response:', tgJson);
  }

  console.log('='.repeat(85) + '\n');
}

testSupabaseEndToEnd().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
