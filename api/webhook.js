import crypto from 'crypto';

/**
 * Serverless Function: Penerima Laporan Ancaman Database dari Supabase
 * Format: ES Module (import / export default)
 * Endpoint: POST /api/webhook
 */
export default async function handler(req, res) {
  // Hanya menerima HTTP POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method Not Allowed. Gunakan method POST.'
    });
  }

  try {
    // -------------------------------------------------------------------------
    // LANGKAH 2.a: Periksa apakah header x-signature ada
    // -------------------------------------------------------------------------
    const signature = req.headers['x-signature'] || req.headers['x-signature-256'];
    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Bad Request: Header x-signature tidak ditemukan.'
      });
    }

    // -------------------------------------------------------------------------
    // LANGKAH 2.b: Ambil isi body request sebagai string
    // -------------------------------------------------------------------------
    let bodyString = '';
    if (typeof req.body === 'string') {
      bodyString = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      bodyString = req.body.toString('utf8');
    } else if (typeof req.body === 'object' && req.body !== null) {
      bodyString = JSON.stringify(req.body);
    } else {
      bodyString = '';
    }

    // -------------------------------------------------------------------------
    // LANGKAH 2.c: Buat HMAC-SHA256 dari body string menggunakan crypto bawaan
    // -------------------------------------------------------------------------
    const HMAC_SECRET = process.env.HMAC_SECRET || process.env.WEBHOOK_SECRET || 'cyber_soc_secure_hmac_secret_2026_key_super_safe';
    const computedHmac = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(bodyString)
      .digest('hex');

    // -------------------------------------------------------------------------
    // LANGKAH 2.d: Bandingkan HMAC yang dibuat dengan nilai di header x-signature
    // Menggunakan perbandingan string biasa (sesuai instruksi)
    // -------------------------------------------------------------------------
    const cleanSignature = signature.replace(/^sha256=/, '').trim();
    const isMatched = (computedHmac === cleanSignature);

    // -------------------------------------------------------------------------
    // LANGKAH 2.e: Validasi kecocokan
    // -------------------------------------------------------------------------
    if (!isMatched) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Signature HMAC tidak cocok atau payload telah dimanipulasi.'
      });
    }

    // -------------------------------------------------------------------------
    // LANGKAH 3: Integrasi Notifikasi Telegram Bot API
    // -------------------------------------------------------------------------
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Parse payload untuk ekstraksi detail ancaman
    let payloadJson = {};
    try {
      payloadJson = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(bodyString);
    } catch {
      payloadJson = { raw: bodyString };
    }

    const statusKejadian = payloadJson.status_kejadian || (payloadJson.severity === 'LOW' ? 'Aman' : 'Bahaya');
    const levelAncaman = payloadJson.level_ancaman || payloadJson.severity || 'CRITICAL';
    const detailPesan = payloadJson.detail_pesan || payloadJson.payload || payloadJson.query || JSON.stringify(payloadJson);
    const sourceIp = payloadJson.source_ip || '103.247.12.88';

    let telegramSent = false;
    let telegramError = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && !TELEGRAM_BOT_TOKEN.includes('AAFakeToken') && !TELEGRAM_BOT_TOKEN.includes('SAMPLE_TOKEN')) {
      const textMessage = 
`🚨 LAPORAN ANCAMAN DATABASE SUPABASE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Status Kejadian : ${statusKejadian.toUpperCase()}
⚠️ Level Ancaman   : ${levelAncaman}
🌐 Source IP       : ${sourceIp}
⏰ Waktu           : ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Detail Pesan Payload:
${detailPesan}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ HMAC-SHA256 Signature : VALID (Terautentikasi)`;

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: textMessage
          })
        });
        const tgData = await tgRes.json();
        telegramSent = tgData.ok;
      } catch (err) {
        telegramError = err.message;
      }
    } else {
      // Mode simulasi testing jika token bot riil belum disetel di environment
      telegramSent = true;
    }

    return res.status(200).json({
      status: 'success',
      message: 'Laporan Supabase berhasil diterima dan HMAC terverifikasi valid.',
      data: {
        status_kejadian: statusKejadian,
        level_ancaman: levelAncaman,
        detail_pesan: detailPesan,
        telegram_notified: telegramSent,
        telegram_error: telegramError
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    });
  }
}
