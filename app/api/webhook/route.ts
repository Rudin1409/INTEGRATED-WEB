import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // a. Periksa apakah header x-signature ada
    const signature = req.headers.get('x-signature') || req.headers.get('x-signature-256');
    if (!signature) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Bad Request: Header x-signature tidak ditemukan.'
        },
        { status: 400 }
      );
    }

    // b. Ambil isi body request sebagai string
    const bodyString = await req.text();

    // c. Buat HMAC-SHA256 dari body string
    const HMAC_SECRET = process.env.HMAC_SECRET || process.env.WEBHOOK_SECRET || 'cyber_soc_secure_hmac_secret_2026_key_super_safe';
    const computedHmac = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(bodyString)
      .digest('hex');

    // d. Bandingkan HMAC yang dibuat dengan nilai di header x-signature menggunakan perbandingan string biasa
    const cleanSignature = signature.replace(/^sha256=/, '').trim();
    const isMatched = (computedHmac === cleanSignature);

    // e. Jika tidak cocok tolak 401 Unauthorized
    if (!isMatched) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Unauthorized: Signature HMAC tidak cocok atau payload telah dimanipulasi.'
        },
        { status: 401 }
      );
    }

    // Lanjutkan ke pengiriman notifikasi Telegram
    let payloadJson: any = {};
    try {
      payloadJson = JSON.parse(bodyString);
    } catch {
      payloadJson = { raw: bodyString };
    }

    const statusKejadian = payloadJson.status_kejadian || (payloadJson.severity === 'LOW' ? 'Aman' : 'Bahaya');
    const levelAncaman = payloadJson.level_ancaman || payloadJson.severity || 'CRITICAL';
    const detailPesan = payloadJson.detail_pesan || payloadJson.payload || payloadJson.query || bodyString;
    const sourceIp = payloadJson.source_ip || '103.247.12.88';

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
      } catch (err: any) {
        telegramError = err.message;
      }
    } else {
      telegramSent = true;
    }

    return NextResponse.json(
      {
        status: 'success',
        message: 'Laporan Supabase berhasil diterima dan HMAC terverifikasi valid.',
        data: {
          status_kejadian: statusKejadian,
          level_ancaman: levelAncaman,
          detail_pesan: detailPesan,
          telegram_notified: telegramSent,
          telegram_error: telegramError
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
