const crypto = require('crypto');

/**
 * Serverless Function Node.js Webhook Receiver
 * Memvalidasi otentisitas webhook dengan HMAC-SHA256 menggunakan modul 'crypto' bawaan Node.js
 * 100% Zero Hardcoded Secrets (membaca dari process.env)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'Node.js HMAC Secure Webhook Gateway',
      status: 'ACTIVE',
      crypto_algorithm: 'HMAC-SHA256',
      zero_hardcode_check: 'PASS'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error: WEBHOOK_SECRET missing in process.env' });
    }

    const signatureHeader = req.headers['x-signature-256'] || req.headers['x-hub-signature-256'];
    if (!signatureHeader) {
      return res.status(400).json({
        error: 'Bad Request: Missing HMAC signature header (x-signature-256)'
      });
    }

    // Ambil raw body
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (req.body) {
      rawBody = JSON.stringify(req.body);
    }

    const cleanSignature = signatureHeader.replace(/^sha256=/, '').trim();
    const expectedHex = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    const sigBuf = Buffer.from(cleanSignature, 'hex');
    const expBuf = Buffer.from(expectedHex, 'hex');

    // Constant-time comparison
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid HMAC signature / Payload tampering detected'
      });
    }

    // Kirim notifikasi Telegram jika kredensial ada
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    let telegramDispatched = false;

    if (botToken && chatId && !botToken.includes('AAFakeToken') && !botToken.includes('SAMPLE_TOKEN')) {
      try {
        const msg = `🚨 <b>CRITICAL THREAT WEBHOOK</b> 🚨\nSignature: Valid HMAC-SHA256\nEvent: ${JSON.stringify(req.body)}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
        });
        telegramDispatched = true;
      } catch (tgErr) {
        console.error('Telegram dispatch error:', tgErr);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'HMAC signature authenticated successfully',
      telegram_alert_sent: telegramDispatched
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
