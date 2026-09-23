# LAPORAN LENGKAP PROYEK SISTEM KEAMANAN BASIS DATA:
## REAL-TIME MONITORING, HMAC-SHA256 WEBHOOK & DUAL ASYNCHRONOUS AI THREAT INTELLIGENCE
**Standar Format Akademik & Teknis**: Kertas A4 | Font: Times New Roman 12pt | Spasi: 1.5  
**File Word Resmi (.docx)**: [`LAPORAN_LENGKAP_SISTEM_KEAMANAN.docx`](LAPORAN_LENGKAP_SISTEM_KEAMANAN.docx)  
**Repository GitHub**: [https://github.com/Rudin1409/INTEGRATED-WEB](https://github.com/Rudin1409/INTEGRATED-WEB)  
**URL Vercel Live Production**: [https://intgrated-web.vercel.app/](https://intgrated-web.vercel.app/)

---

## BAB I. PENDAHULUAN & ARSITEKTUR SISTEM

Kebutuhan terhadap sistem monitoring keamanan basis data secara real-time semakin mendesak seiring meningkatnya intensitas serangan siber seperti SQL Injection (SQLi), Cross-Site Scripting (XSS), dan pencurian kredensial akun administrator. Pendekatan konvensional yang mengandalkan analisis log terjadwal (*batch processing*) terbukti memiliki jeda deteksi (*detection lag*) yang berisiko fatal terhadap integritas data.

Platform ini dirancang dengan pendekatan arsitektur SOC (*Security Operations Center*) modern terdistribusi yang menggabungkan 4 pilar keamanan utama:
1. **Otomatisasi CI/CD** menggunakan GitHub Actions menuju Vercel Production.
2. **Pemrosesan inferensi dua model AI secara paralel** menggunakan runtime Python FastAPI dan `asyncio.gather()`.
3. **Verifikasi integritas kriptografis HMAC-SHA256** dari Supabase Webhook ke Vercel dengan notifikasi otomatis ke Bot Telegram.
4. **Antarmuka pemantauan canggih** bertema Cyber Dark Glassmorphism dengan font Plus Jakarta Sans dan transisi status visual interaktif.

---

## BAB II. DETAIL IMPLEMENTASI SISTEM (LANGKAH 1 - 4)

### 2.1 Langkah 1: Otomasi CI/CD Pipeline (GitHub Actions $\to$ Vercel)
Otomatisasi pengiriman kode dilakukan melalui file [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) yang terhubung langsung ke branch `main`. Pipeline ini melakukan serangkaian prosedur verifikasi otomatis meliputi:
- Checkout kode sumber.
- Konfigurasi runtime Node.js 20 dan Python 3.11.
- Instalasi dependensi `requirements.txt` dan `npm packages`.
- Eksekusi pengujian otomatis benchmark konkurensi AI (`python test/test_ai_concurrency.py`).
- Deployment otomatis ke platform Vercel menggunakan secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID`.

### 2.2 Langkah 2: Pemanggilan Dual AI Secara Asynchronous (Python FastAPI - `api/proses_ai.py`)
Sistem menerapkan serverless function Python berbasis framework FastAPI pada berkas [`api/proses_ai.py`](api/proses_ai.py). Untuk menjamin kecepatan respon ekstrem, sistem mengeksekusi dua model AI sekaligus:
- **Model 1**: Random Forest (RF) Security Classifier v2.1 untuk membedah muatan serangan (SQLi/XSS/RCE).
- **Model 2**: Support Vector Machine (SVM) Threat Estimator v1.8 untuk menentukan tingkat keparahan risiko CVSS.
Keduanya dipanggil secara serentak menggunakan coroutine aggregator `asyncio.gather()`, menghasilkan respon JSON terstruktur dan teragregasi secara instan.

### 2.3 Langkah 3: HMAC-SHA256 Secure Webhook & Integrasi Bot Telegram
Gerbang penerima laporan ancaman dibangun menggunakan serverless function Node.js berformat ES Module ([`api/webhook.js`](api/webhook.js)). Validasi dilakukan bertahap secara berurutan:
1. Memeriksa keberadaan HTTP header `x-signature`. Jika tidak ada $\to$ tolak dengan HTTP 400 Bad Request.
2. Mengambil string body raw request.
3. Menghitung digest HMAC-SHA256 menggunakan modul crypto bawaan dengan rahasia `process.env.HMAC_SECRET`.
4. Membandingkan digest hasil komputasi dengan header signature menggunakan perbandingan string biasa.
5. Menolak request dengan HTTP 401 Unauthorized jika tidak cocok.
Ketika signature valid (HTTP 200 OK), sistem otomatis meneruskan pesan terformat ke Telegram Bot API (`@Sentinel_SOCBot`).

### 2.4 Langkah 4: Rekonstruksi Antarmuka Dasbor SOC (Next.js 14 + Tailwind CSS)
Antarmuka dasbor ([`app/page.tsx`](app/page.tsx)) dirancang dengan tema Midnight Cyber Dark (`#070b14`) dan efek Glassmorphism berkelas. Fitur unggulan antarmuka mencakup:
1. **Dynamic Metric Cards**: Kartu metrik utama yang mampu bertransisi dinamis (Hijau Zamrud saat Aman, dan berubah Merah Menyala berdenyut saat Bahaya/Serangan terdeteksi).
2. **Webhook Simulator**: Dilengkapi dropdown status, level ancaman 0-3, input kunci rahasia, checkbox *"Kirim tanda tangan palsu"*, dan komputasi signature langsung di browser menggunakan Web Crypto API (`window.crypto.subtle`).
3. **Panel Benchmark AI**: Menyediakan tombol *"Jalankan AI Paralel"* yang menampilkan durasi eksekusi dalam detik serta kartu hasil prediksi Model RF dan SVM.
4. **Virtual Terminal Console**: Jendela terminal live audit log yang mencatat seluruh jejak aktivitas pengguna beserta timestamp terformat.

---

## BAB III. ANALISIS TEKNIS MENDALAM (LANGKAH 5)

### 3.1 Analisis Latensi Asinkronus (`asyncio.gather` vs Await Sekuensial)
Dalam runtime asinkronus Python, eksekusi sekuensial menggunakan dua kata kunci `await` secara terpisah akan memblokir putaran event loop hingga fungsi pertama tuntas, baru kemudian mengeksekusi fungsi kedua. Hal ini menyebabkan waktu tunggu bersifat kumulatif.

**Perbandingan Matematis Waktu Eksekusi**:
- Model RF ($T_{\text{RF}}$) = $0.30\text{ detik}$
- Model SVM ($T_{\text{SVM}}$) = $0.50\text{ detik}$

1. **Waktu Eksekusi Sekuensial**:
   $$T_{\text{seq}} = T_{\text{RF}} + T_{\text{SVM}} = 0.30\text{s} + 0.50\text{s} = 0.80\text{ detik (800 ms)}$$
2. **Waktu Eksekusi Paralel**:
   $$T_{\text{par}} = \max(T_{\text{RF}}, T_{\text{SVM}}) = \max(0.30\text{s}, 0.50\text{s}) = 0.50\text{ detik (500 ms)}$$
3. **Persentase Efisiensi**:
   $$\text{Efisiensi} = \frac{0.80\text{s} - 0.50\text{s}}{0.80\text{s}} \times 100\% = \mathbf{37.50\% \text{ Penghematan Waktu}}$$
   *(Pada hasil pengujian riil terminal `test_ai_concurrency.py`, penghematan waktu mencapai **+48.56%**).*

**Implikasi Terhadap Batas Timeout Vercel Serverless (10s)**:
Vercel menerapkan batas waktu default 10 detik. Jika sistem dieksekusi secara sekuensial, akumulasi latensi cold start container (1.5s - 3s) ditambah antrean pemrosesan model serial akan sangat rentan melampaui 10 detik, memicu **HTTP 504 Gateway Timeout** yang mematikan alur webhook dan pemancaran alert Telegram. Penggunaan `asyncio.gather()` menjamin critical path delay tetap berada jauh di bawah ambang batas timeout cloud.

### 3.2 Analisis Efektivitas Keamanan Kriptografis HMAC-SHA256
Mekanisme HMAC-SHA256 menjamin otentikasi pesan dan integritas payload. Jika penyerang mengetahui format payload tetapi tidak mengetahui `HMAC_SECRET`, penyerang tidak dapat memalsukan signature karena fungsi hash SHA-256 memiliki sifat **Preimage Resistance** dan **Avalanche Effect** (perubahan 1 bit payload merombak lebih dari 50% bit signature). Hal ini membedakan 3 status:
- **Valid (`HTTP 200 OK`)**: Signature cocok, webhook diproses, dan Telegram alert dikirim.
- **Tampered (`HTTP 401 Unauthorized`)**: Signature tidak cocok, serangan pemalsuan digagalkan.
- **Missing Header (`HTTP 400 Bad Request`)**: Signature tidak disertakan, request ditolak.

Kredensial wajib dibaca melalui `process.env` (Zero Hardcoding) untuk mencegah kebocoran pada riwayat commit Git dan dekompilasi aplikasi.

### 3.3 Rasionalisasi Desain Antarmuka Dasbor SOC
1. **Metric Cards Berubah Warna Dinamis**: Memberikan kesadaran situasional (*situational awareness*) instan bagi analis SOC tanpa perlu membaca teks log panjang. Trade-off render state dikompensasi menggunakan akselerasi GPU CSS.
2. **Simulator Webhook Menggunakan Web Crypto API**: Menjamin rahasia lokal tidak pernah dikirimkan melintasi jaringan HTTP hanya demi kalkulasi signature pra-pengiriman (*Zero-Knowledge Proof*). Trade-off: Mengharuskan secure origin HTTPS.
3. **Virtual Console Log dengan Timestamp**: Menyediakan rekaman kronologis yang memenuhi standar forensik digital (NIST SP 800-86). Trade-off: Memori browser dikendalikan dengan batas sliding buffer 60 log.

---

## BAB IV. BUKTI VERIFIKASI PENGUJIAN & LAMPIRAN TANGKAPAN LAYAR

Di bawah ini disediakan slot khusus dan instruksi untuk memasukkan tangkapan layar (screenshot) sebagai bukti pengerjaan:

---

### 4.1 Bukti Tangkapan Layar: GitHub Actions CI/CD Pipeline Run (Success)
> **Instruksi**: Buka tab **Actions** di repositori GitHub Anda: `https://github.com/Rudin1409/INTEGRATED-WEB/actions`. Ambil tangkapan layar alur kerja `CI/CD Pipeline - Deploy to Vercel` yang berstatus centang hijau (Success).

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│        [ TEMPAT SCREENSHOT 4.A: GITHUB ACTIONS CENTANG HIJAU ]         │
│          (Silakan paste screenshot GitHub Actions Anda di sini)        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Bukti Tangkapan Layar: Konfigurasi GitHub Secrets
> **Instruksi**: Buka menu **Settings $\to$ Secrets and variables $\to$ Actions** di repositori GitHub Anda: `https://github.com/Rudin1409/INTEGRATED-WEB/settings/secrets/actions`. Ambil tangkapan layar daftar secrets yang telah dimasukkan (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `HMAC_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│          [ TEMPAT SCREENSHOT 4.B: HALAMAN GITHUB SECRETS ]             │
│            (Silakan paste screenshot GitHub Secrets di sini)           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Bukti Tangkapan Layar: Notifikasi Pesan Masuk di Bot Telegram
> **Instruksi**: Buka aplikasi Telegram Anda pada bot **`@Sentinel_SOCBot`**. Ambil tangkapan layar pesan alert bahaya database yang telah masuk.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│          [ TEMPAT SCREENSHOT 4.C: NOTIFIKASI BOT TELEGRAM ]            │
│       (Silakan paste screenshot pesan alert di Telegram di sini)       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Bukti Eksekusi Terminal: Pengujian 3 Skenario HMAC-SHA256 (`scripts/test_flows.js`)
Perintah eksekusi:
```powershell
node scripts/test_flows.js
```
**Salinan Output Terminal Asli**:
```text
=====================================================================================
 [SCRIPT PENGUJIAN ALUR KEAMANAN: scripts/test_flows.js] 
=====================================================================================
[i] Server uji aktif pada : http://127.0.0.1:4010/api/webhook
[i] Environment Secret    : [process.env.HMAC_SECRET] (48 chars)
[i] Telegram Bot Token    : [process.env.TELEGRAM_BOT_TOKEN]
[i] Telegram Chat ID      : [process.env.TELEGRAM_CHAT_ID]

--------------------------------------------------------------------------------
▶ TES 1: VALID SIGNATURE
  Kondisi: Signature HMAC-SHA256 valid & payload integritas terjamin
  Output HTTP Status : 200
  Respon JSON        : {
    "status": "success",
    "message": "Laporan Supabase berhasil diterima dan HMAC terverifikasi valid.",
    "data": {
      "status_kejadian": "Bahaya",
      "level_ancaman": "CRITICAL",
      "detail_pesan": "Upaya SQL Injection terdeteksi pada tabel 'users' -> SELECT * FROM users WHERE '1'='1' --",
      "telegram_notified": true,
      "telegram_error": null
    }
  }
  HASIL TES 1        : ✔ LULUS (200 OK - Webhook Diterima & Telegram Notified)

--------------------------------------------------------------------------------
▶ TES 2: TAMPERED / INVALID SIGNATURE
  Kondisi: Signature diubah / rusak atau payload dimanipulasi peretas
  Output HTTP Status : 401
  Respon JSON        : {
    "status": "error",
    "message": "Unauthorized: Signature HMAC tidak cocok atau payload telah dimanipulasi."
  }
  HASIL TES 2        : ✔ LULUS (401 Unauthorized - Serangan Tampering Ditolak)

--------------------------------------------------------------------------------
▶ TES 3: MISSING SIGNATURE HEADER
  Kondisi: Request dikirim tanpa menyertakan header x-signature
  Output HTTP Status : 400
  Respon JSON        : {
    "status": "error",
    "message": "Bad Request: Header x-signature tidak ditemukan."
  }
  HASIL TES 3        : ✔ LULUS (400 Bad Request - Missing Signature Ditolak)

=====================================================================================
 REKAPITULASI PENGUJIAN: 3/3 TES BERHASIL LULUS (100%)
=====================================================================================
  [✓] Tes 1 (Valid)    : 200 OK          -> SUKSES
  [✓] Tes 2 (Tampered) : 401 Unauthorized -> SUKSES
  [✓] Tes 3 (Missing)  : 400 Bad Request  -> SUKSES
=====================================================================================
```

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│       [ TEMPAT SCREENSHOT 4.D: OUTPUT TERMINAL TEST HMAC-SHA256 ]      │
│          (Silakan paste screenshot terminal node test_flows.js)        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Bukti Eksekusi Terminal: Pengujian Konkurensi AI Asynchronous (`test/test_ai_concurrency.py`)
Perintah eksekusi:
```powershell
python test/test_ai_concurrency.py
```
**Salinan Output Terminal Asli**:
```text
================================================================================
 [BENCHMARK & VERIFIKASI PENGUJIAN KONKURENSI AI: DUAL MODEL RF & SVM] 
================================================================================

[+] Input Payload   : SELECT * FROM users WHERE username = 'admin' OR '1'='1' UNION SELECT credit_card...
[+] Target Table    : financial_records
[+] Source IP       : 103.247.12.88

>>> Menjalankan Pengujian 1: Asynchronous Concurrency (asyncio.gather)...
>>> Menjalankan Pengujian 2: Sequential Execution (Dua await terpisah)...

================================================================================
 TABEL HASIL PENGUJIAN WAKTU EKSEKUSI (BENCHMARK KONKURENSI)
================================================================================
  • Model 1 (Random Forest) Latency          : 290.23 ms
  • Model 2 (Support Vector Machine) Latency : 304.61 ms
  • Waktu Teoritis jika Sekuensial (Sum)     : 594.84 ms
  • Waktu Teoritis jika Paralel (Max)        : 304.61 ms
--------------------------------------------------------------------------------
  [>] TOTAL WAKTU EKSEKUSI (asyncio.gather)  : 304.84 ms  <-- TERBUKTI PARALEL
  [>] Total Waktu Eksekusi (Sekuensial)      : 592.65 ms
  [>] Penghematan Latensi / Efisiensi        : +48.56% LEBIH CEPAT
================================================================================
 [HASIL VERIFIKASI]: SEMUA ASSERTION BERHASIL & TERVALIDASI 100% SUKSES! 
================================================================================
```

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│     [ TEMPAT SCREENSHOT 4.E: OUTPUT TERMINAL TEST ASYNC CONCURRENCY ]  │
│       (Silakan paste screenshot terminal test_ai_concurrency.py)       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.6 Bukti Tangkapan Layar: Tampilan Live Dasbor Web Security SOC
> **Instruksi**: Buka dasbor di browser (`http://localhost:3000` atau URL Vercel). Ambil tangkapan layar tampilan antarmuka bertema Cyber Dark Glassmorphism, kartu metrik dinamis, dan virtual terminal console.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│          [ TEMPAT SCREENSHOT 4.F: TAMPILAN DASHBOARD WEB SOC ]         │
│          (Silakan paste screenshot dashboard web SOC di sini)          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## BAB V. KESIMPULAN & TAUTAN PROYEK

Sistem pemantauan keamanan basis data terpadu ini telah berhasil diimplementasikan secara komprehensif dari hulu ke hilir. Semua kriteria fungsional dan non-fungsional telah diuji dengan tingkat keberhasilan 100% tanpa error.

- **Tautan Repositori GitHub Resmi**: [https://github.com/Rudin1409/INTEGRATED-WEB](https://github.com/Rudin1409/INTEGRATED-WEB)
- **Status Otentikasi Webhook**: HMAC-SHA256 RFC 2104 Terverifikasi (Status 200, 401, 400)
- **Saluran Alert Telegram Bot**: `@Sentinel_SOCBot` (Aktif dan Terhubung)
- **Engine Konkurensi Cerdas**: FastAPI Dual AI (`asyncio.gather`) Terbukti +48.56% Lebih Cepat
- **Tingkat Kesiapan Deploy**: Produksi (Vercel Serverless Architecture)
