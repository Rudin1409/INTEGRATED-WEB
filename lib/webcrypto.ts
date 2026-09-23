/**
 * Kalkulasi HMAC-SHA256 langsung di Browser (Client-Side)
 * Menggunakan Web Crypto API resmi: window.crypto.subtle
 * Mencegah kebocoran secret ke backend hanya untuk proses signing lokal.
 */
export async function calculateClientHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(message);

  // Import secret key ke format Web Crypto CryptoKey
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  // Hitung cryptographic signature
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);

  // Konversi ArrayBuffer hasil digest ke string Hexadecimal
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hexSignature;
}
