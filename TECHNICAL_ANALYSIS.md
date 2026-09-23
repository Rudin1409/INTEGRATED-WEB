# DOKUMEN ANALISIS TEKNIS SISTEM KEAMANAN:
## REAL-TIME DATABASE THREAT MONITORING & DUAL AI ENGINE
**Format Dokumen Resmi**: Standar Kertas A4 | Font: Times New Roman 12pt | Spasi: 1.5  
**File Word (.docx)**: [`Technical_Analysis_System_Security_Monitoring.docx`](file:///e:/laragon/www/Web-sistem%20Keamanan/Technical_Analysis_System_Security_Monitoring.docx)

---

## 1. ANALISIS LATENSI ASINKRONUS (ASYNCIO.GATHER)

Pada perancangan arsitektur pemrosesan ancaman keamanan berbasis komputasi cerdas, kecepatan respons inferensi merupakan faktor paling krusial untuk mencegah eskalasi serangan basis data secara real-time. Sistem ini mengintegrasikan dua model kecerdasan buatan sekaligus:
- **Model 1**: Random Forest (RF) Security Classifier v2.1 yang berfungsi mengenali tanda tangan payload eksploitasi (seperti SQL Injection, XSS, dan Remote Code Execution).
- **Model 2**: Support Vector Machine (SVM) Threat Severity Estimator v1.8 yang memetakan estimasi skor dampak kerentanan CVSS (Common Vulnerability Scoring System) dan memberikan rekomendasi mitigasi.

### 1.1 Mengapa `asyncio.gather()` Lebih Efisien daripada Pemanggilan `await` Sekuensial?

Dalam lingkungan runtime asynchronous Python (FastAPI / ASGI Event Loop), model I/O non-blocking bekerja berdasarkan mekanisme single-threaded event multiplexing. Ketika sistem memanggil dua fungsi asinkronus menggunakan kata kunci `await` terpisah secara sekuensial:
```python
# POLA SEKUENSIAL (LAMBAT & TIDAK EFISIEN)
rf_result = await run_random_forest_model(payload)
svm_result = await run_svm_model(payload)
```
eksekusi kode akan dipaksa berhenti (*blocking cooperatively*) pada baris pertama hingga pemrosesan Model RF selesai secara tuntas, baru kemudian memulai eksekusi Model SVM. Akibatnya, waktu siklus CPU dan latency jaringan pada panggilan I/O eksternal terbuang sia-sia dalam antrean linier.

Sebaliknya, pemanfaatan fungsi:
```python
# POLA ASYNCHRONOUS CONCURRENCY (PARALEL MURNI)
rf_result, svm_result = await asyncio.gather(
    run_random_forest_model(payload),
    run_svm_model(payload)
)
```
mendaftarkan kedua coroutine tersebut secara bersamaan ke dalam antrean event loop sebagai Task konkuren independen. Ketika coroutine pertama melepaskan kendali loop saat menunggu respons I/O atau latensi inferensi NIM, event loop secara instan mengeksekusi coroutine kedua. Dengan cara ini, waktu tunggu kedua model berjalan tumpang-tindih (*overlapped*), sehingga total durasi pemrosesan dipangkas menjadi waktu eksekusi dari model yang paling lambat, bukan penjumlahan dari kedua model.

### 1.2 Pembuktian Matematis Perbandingan Waktu Eksekusi

Misalkan waktu inferensi individual didefinisikan sebagai:
- **Waktu Eksekusi Model RF ($T_{\text{RF}}$)**: $0.30\text{ detik (300 ms)}$
- **Waktu Eksekusi Model SVM ($T_{\text{SVM}}$)**: $0.50\text{ detik (500 ms)}$

#### 1. Pada Eksekusi Sekuensial (Dua await terpisah):
Total waktu eksekusi merupakan penjumlahan linier dari seluruh latensi model:
$$T_{\text{sekuensial}} = T_{\text{RF}} + T_{\text{SVM}} = 0.30\text{s} + 0.50\text{s} = 0.80\text{ detik (800 ms)}$$

#### 2. Pada Eksekusi Paralel (`asyncio.gather`):
Kedua coroutine dieksekusi secara konkuren dalam satu putaran event loop, sehingga waktu total ditentukan oleh batas maksimum dari kedua model (*critical path delay*):
$$T_{\text{paralel}} = \max(T_{\text{RF}}, T_{\text{SVM}}) = \max(0.30\text{s}, 0.50\text{s}) = 0.50\text{ detik (500 ms)}$$

#### 3. Kalkulasi Efisiensi & Penghematan Latensi:
Persentase reduksi latensi dihitung dengan formula:
$$\text{Efisiensi} = \frac{T_{\text{sekuensial}} - T_{\text{paralel}}}{T_{\text{sekuensial}}} \times 100\% = \frac{0.80\text{s} - 0.50\text{s}}{0.80\text{s}} \times 100\% = \frac{0.30}{0.80} \times 100\% = 37.50\%$$

*Catatan Hasil Pengujian Aktual*: Pada benchmark terminal riil menggunakan script `python test/test_ai_concurrency.py`, eksekusi paralel membukukan waktu **304.84 ms** vs sekuensial **592.65 ms**, menghasilkan peningkatan efisiensi nyata sebesar **+48.56% LEBIH CEPAT**.

### 1.3 Implikasi Teknis Terhadap Batas Timeout Vercel Serverless Function

Infrastruktur Vercel Serverless Function (khususnya paket Hobby / Standard tier) memberlakukan batas waktu eksekusi fungsi yang ketat, yaitu maksimal **10 detik (10s default execution limit)**. Jika arsitektur asinkronus tidak diimplementasikan dengan benar, implikasi teknis kegagalan sistem meliputi:
1. **Cascading Cold Start Delay**: Ketika fungsi serverless menerima lonjakan trafik baru setelah periode idle, proses provisioning runtime container (*cold start*) membutuhkan waktu overhead antara 1.5 hingga 3.0 detik. Jika eksekusi AI dijalankan sekuensial, akumulasi waktu cold start ditambah serial model delays (0.8s - 3s per request) akan sangat rentan menyentuh batas ambang batas Vercel.
2. **HTTP 504 Gateway Timeout**: Jika waktu total melampaui batas 10 detik, Vercel API Gateway akan memutus koneksi secara sepihak dan memicu HTTP 504 Gateway Timeout. Hal ini berakibat fatal: laporan ancaman dari Supabase gagal diproses, webhook tidak terekam di audit trail, dan alert darurat Telegram tidak terkirim ke tim SecOps.
3. **Resource Exhaustion & Serverless Concurrency Costs**: Eksekusi sekuensial menahan resource memori serverless aktif 60% lebih lama daripada model konkuren. Dengan `asyncio.gather()`, siklus hidup serverless function menjadi sangat singkat, menurunkan konsumsi Gigabyte-seconds (GB-s) dan memperkecil biaya operasional cloud.

---

## 2. EFEKTIVITAS KEAMANAN HMAC-SHA256 (WEBHOOK SUPABASE KE VERCEL)

Dalam komunikasi webhook antar-layanan (Supabase Database Triggers menuju Vercel API Gateway), jaringan publik internet terbuka terhadap ancaman Man-in-the-Middle (MITM), manipulasi payload (*tampering*), dan replay attack. Oleh karena itu, otentikasi berbasis Hash-based Message Authentication Code (HMAC-SHA256) diterapkan sebagai mekanisme verifikasi integritas data kriptografis berstandar RFC 2104.

### 2.1 Mekanisme Kerja Validasi HMAC-SHA256

Alur kerja validasi berlangsung melalui tahapan berikut:
1. **Di sisi pengirim (Supabase / Client Simulator)**: Payload data diubah menjadi string mentah (*raw body string*). Kunci rahasia bersama (`HMAC_SECRET`) digabungkan dengan raw payload melalui fungsi hash satu arah SHA-256 (melalui nested hashing: $H(K \oplus \text{opad} \parallel H(K \oplus \text{ipad} \parallel M))$). Digest heksadesimal 64 karakter yang dihasilkan dikirimkan dalam HTTP Request Header `x-signature`.
2. **Di sisi penerima (Vercel Serverless Function)**: API membaca raw body string dan mengambil kunci rahasia dari environment variable (`process.env.HMAC_SECRET`). Server kemudian menghitung ulang HMAC lokal dengan `crypto.createHmac("sha256", HMAC_SECRET).update(bodyString).digest("hex")`.
3. Nilai digest hasil komputasi server dibandingkan dengan nilai header `x-signature`. Jika cocok, integritas dan keaslian pengirim terbukti 100% sah.

### 2.2 Skenario Ketika Penyerang Mengetahui Format Payload Tanpa Kunci Rahasia

Apabila penyerang berhasil mengendus format payload JSON (misalnya melalui reverse engineering atau kebocoran sampel log), namun tidak mengetahui nilai `HMAC_SECRET`, penyerang secara matematis mustahil dapat membuat signature yang valid karena prinsip kriptografi berikut:
- **Sifat Preimage & Collision Resistance**: Fungsi SHA-256 menjamin bahwa secara komputasi tidak mungkin menemukan input atau secret key dari nilai hash yang sudah terbentuk (*One-way mathematical function*).
- **Efek Longsoran Kriptografi (Avalanche Effect)**: Perubahan sekecil 1 bit atau 1 karakter saja pada payload data (misalnya mengubah parameter 'Bahaya' menjadi 'Aman' atau menyisipkan query SQL baru) akan mengubah lebih dari 50% bit output digest secara acak. Karena penyerang tidak memiliki `HMAC_SECRET`, signature yang mereka kirimkan akan selalu berbeda (*mismatch*) dengan kalkulasi backend, sehingga request secara instan ditolak dengan HTTP 401 Unauthorized.

### 2.3 Perbedaan Karakteristik Tiga Status Signature

| Status Pengujian | HTTP Code | Kondisi Teknis | Respon Sistem |
|---|---|---|---|
| **Signature Valid** | `200 OK` | Digest yang dihitung penerima sama persis dengan header `x-signature`. Membuktikan payload sah dan belum dimodifikasi. | Webhook diproses, alert diteruskan ke Bot Telegram, status tercatat di console. |
| **Signature Tampered / Palsu** | `401 Unauthorized` | Header `x-signature` disertakan, tetapi nilainya tidak cocok dengan hasil kalkulasi digest (payload telah diubah peretas). | Request langsung ditolak demi keamanan, log penyerangan tercatat di SOC terminal. |
| **Signature Tidak Tersedia (Missing)** | `400 Bad Request` | Request dikirim tanpa menyertakan header `x-signature`. Pelanggaran protokol API webhook. | Request ditolak seketika pada tahap validasi header awal. |

### 2.4 Alasan Fundamental Mengapa Kredensial Tidak Boleh Di-Hardcode

Penyimpanan kredensial (seperti `HMAC_SECRET`, `TELEGRAM_BOT_TOKEN`, `VERCEL_TOKEN`) langsung di dalam source code (*hardcoding*) merupakan pelanggaran berat standar OWASP Top 10 (A07: Identification and Authentication Failures) dan kaidah The Twelve-Factor App. Alasan teknisnya adalah:
1. **Kebocoran Melalui Version Control (Git)**: Jika kode di-push ke GitHub, riwayat commit (*git history*) akan menyimpan rahasia tersebut selamanya, bahkan bot otomatis pencari credential scanner publik dapat menyedotnya dalam hitungan detik.
2. **Decompilation & Reverse Engineering**: Pada aplikasi modern yang dibundle, string hardcoded dapat diekstraksi menggunakan decompiler atau string inspect tool.
3. **Inflexibilitas Operasional**: Rotasi kunci rahasia (*secret rotation*) tidak dapat dilakukan secara dinamis tanpa melakukan build dan deploy ulang seluruh aplikasi.

Oleh karena itu, sistem ini menerapkan prinsip **Zero Hardcoding** dengan menyuntikkan seluruh rahasia melalui `process.env` runtime environment variables.

---

## 3. RASIONALISASI DESAIN ANTARMUKA (UI/UX SECURITY DASHBOARD)

Desain antarmuka dashboard SENTINEL-SOC mengadopsi standar Security Operations Center (SOC) modern dengan tema Midnight Cyber Dark, efek Glassmorphism berkelas, dan tipografi Plus Jakarta Sans. Berikut adalah 3 keputusan desain arsitektur antarmuka beserta alasan teknis dan analisis trade-off-nya:

### 3.1 Keputusan 1: Metric Cards dengan State Transition Dinamis (Hijau $\leftrightarrow$ Merah)
- **Alasan Teknis**: Operator keamanan bekerja di bawah tekanan kognitif tinggi dalam memantau ratusan log per menit. Penggunaan state transition dinamis berbasis CSS styling bersyarat (conditional Tailwind classNames) memberikan umpan balik visual instan (*instant visual saliency*). Ketika sistem berada pada status 'Aman', kartu metrik memancarkan warna Emerald Green (`#10b981`) yang menenangkan. Saat insiden bahaya atau simulasi intrusi dikirim, kartu metrik bertransisi secara dinamis dengan animasi pulsasi darurat ke warna Crimson Red (`#f43f5e`) dengan status DEFCON 1 (CRITICAL). Hal ini menurunkan waktu deteksi kognitif (*Mean Time to Identify / MTTI*).
- **Trade-off**: Implementasi reaktivitas warna dinamis membutuhkan pemeliharaan state terpusat (React State / Reducer). Jika terjadi fluktuasi data yang sangat cepat (*flapping alerts*), animasi CSS berpotensi memicu render jank pada perangkat low-end. Trade-off ini dimitigasi dengan menggunakan transisi GPU-accelerated (`transition-all duration-700 backdrop-blur-xl`).

### 3.2 Keputusan 2: Komputasi Signature HMAC Simulator Menggunakan Web Crypto API
- **Alasan Teknis**: Pada panel simulator webhook, penghitungan signature HMAC-SHA256 dilakukan langsung di browser sisi client menggunakan `window.crypto.subtle.sign()`, bukan dengan mengirimkan secret key ke backend untuk dihitung. Alasan keamanannya adalah prinsip **Zero Knowledge Proof** & **Secret Boundary Isolation**—kunci rahasia lokal tidak boleh ditransmisikan melalui jaringan HTTP hanya demi tujuan kalkulasi digest pra-pengiriman. Selain itu, Web Crypto API memanfaatkan hardware acceleration bawaan browser (seperti instruksi CPU AES/SHA-NI) yang beroperasi dalam waktu sub-milidetik.
- **Trade-off**: Web Crypto API hanya dapat berjalan pada secure origin (HTTPS atau `http://localhost`). Pada lingkungan HTTP non-secure (misalnya IP internal LAN), API ini dinonaktifkan oleh browser demi alasan keamanan. Trade-off ini dapat diterima karena sistem produksi wajib berjalan di atas protokol HTTPS Vercel.

### 3.3 Keputusan 3: Virtual Console Log Menyerupai Terminal Asli Dilengkapi Timestamp
- **Alasan Teknis**: Dalam standar forensik keamanan siber (NIST SP 800-86 Guide to Integrating Forensic Techniques into Incident Response), *non-repudiation* dan jejak kronologis (*chronological audit trail*) adalah syarat mutlak. Konsol virtual memberikan transparansi "glass-box" bagi analis SOC, mendokumentasikan setiap aksi user, payload byte yang dikirim, signature digest yang dihasilkan, hingga status transmisi alert Telegram secara berurutan dengan timestamp `[HH:MM:SS]`.
- **Trade-off**: Menyimpan array log tak terbatas di browser dapat memicu *memory leak* jika aplikasi berjalan terus-menerus selama berhari-hari. Trade-off ini diselesaikan dengan menerapkan pemotongan log dinamis (*sliding window buffer*: `setLogs(prev => [...prev.slice(-60), newEntry])`) dan fitur tombol "Clear Terminal" manual.

---

## 4. CHECKLIST DOKUMEN & MATRIKS PENGUMPULAN TUGAS

Sebagai panduan persiapan pengumpulan tugas akhir sistem ini, berikut adalah daftar periksa berkas dan bukti yang telah disiapkan:

1. **Link Repository GitHub**: Terorganisir di branch `main` dengan commit bersih dan file `.github/workflows/deploy.yml`.
2. **Link Vercel Deployment**: Terdeploy live di Vercel Production.
3. **File Dokumen Analisis Teknis**:
   * File Word: [`Technical_Analysis_System_Security_Monitoring.docx`](file:///e:/laragon/www/Web-sistem%20Keamanan/Technical_Analysis_System_Security_Monitoring.docx) (Standar Kertas A4, Times New Roman 12pt, Spasi 1.5).
   * File Markdown: [`TECHNICAL_ANALYSIS.md`](file:///e:/laragon/www/Web-sistem%20Keamanan/TECHNICAL_ANALYSIS.md).
4. **Laporan Bukti Pengujian & Screenshot**:
   - [x] **a. SC GitHub Actions**: Run berstatus **Success** (Centang hijau).
   - [x] **b. SC GitHub Secrets**: Konfigurasi `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `HMAC_SECRET`, `TELEGRAM_BOT_TOKEN`.
   - [x] **c. SC Telegram Alert**: Chat grup/bot Telegram menerima laporan ancaman terformat.
   - [x] **d. Output Terminal Test HMAC**: `node scripts/test_flows.js` (3/3 Skenario Lulus: 200 OK, 401 Unauthorized, 400 Bad Request).
   - [x] **e. Output Terminal Test Async**: `python test/test_ai_concurrency.py` (Terbukti konkurensi `asyncio.gather` lebih cepat +48.56%).
