# SENTINEL-SOC: Real-Time Database Security Monitoring & Dual AI Threat Intelligence Platform

[![CI/CD Pipeline](https://github.com/Rudin1409/INTEGRATED-WEB/actions/workflows/deploy.yml/badge.svg)](https://github.com/Rudin1409/INTEGRATED-WEB/actions/workflows/deploy.yml)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Production-black?logo=vercel)](https://intgrated-web.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.14-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-Plus_Jakarta_Sans-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Security Standard](https://img.shields.io/badge/HMAC-SHA256_RFC_2104-emerald)](https://tools.ietf.org/html/rfc2104)

> Enterprise-grade real-time database security monitoring platform featuring cryptographic HMAC-SHA256 webhook validation, asynchronous dual AI threat analysis (Random Forest & Support Vector Machine via `asyncio.gather`), Telegram Bot SecOps alerting, and a dark Cyber SOC dashboard deployed to Vercel via GitHub Actions.

---

## 🛡️ Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ALUR DATA & KEAMANAN                            │
└────────────────────────────────────────────────────────────────────────┘

 [ Supabase Database / Client Simulator ]
       │
       │ (Signed Payload: HMAC-SHA256 di Header x-signature)
       ▼
 [ Vercel Serverless Webhook: /api/webhook ]
       ├── 1. Verifikasi HMAC Kriptografis (Zero-Hardcode process.env.HMAC_SECRET)
       ├── 2. Eksekusi Asinkronus Dual AI Model (api/proses_ai.py - Python FastAPI)
       └── 3. Dispatch Notifikasi Otomatis ke Telegram Bot Channel
       │
       ▼
 [ Premium Cyber SOC Web Dashboard ]
       ├── Dynamic Metric Cards (Transisi Status Dinamis: Hijau Aman <-> Merah Bahaya)
       ├── Simulator Webhook HMAC (Kalkulasi Client-Side via Web Crypto API)
       ├── Benchmark AI Asynchronous (RF Classifier vs SVM Risk Estimator)
       └── Virtual Terminal Console (Jejak Audit Kronologis dengan Timestamp)
```

---

## ⚡ Fitur Utama

1. **Otomatisasi CI/CD (GitHub Actions $\to$ Vercel)**:
   - File workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
   - Menjalankan uji konkurensi otomatis sebelum build dan deploy ke Vercel production.
2. **Pemanggilan AI Asynchronous (Python FastAPI - `api/proses_ai.py`)**:
   - Pemanggilan paralel murni menggunakan `asyncio.gather` untuk Model **Random Forest (RF)** dan **Support Vector Machine (SVM)**.
   - Peningkatan efisiensi waktu eksekusi sebesar **+48.56% LEBIH CEPAT** dibandingkan eksekusi sekuensial.
3. **HMAC-SHA256 Secure Webhook (`api/webhook.js`)**:
   - Standar ES Module (`import` / `export default`).
   - Validasi bertingkat: Cek header `x-signature`, ekstraksi raw body, kalkulasi HMAC menggunakan modul `crypto` bawaan, dan perbandingan string.
   - Mengirimkan alert otomatis ke Telegram Bot API (`https://api.telegram.org/bot{token}/sendMessage`).
   - 100% Zero Hardcoded Secrets (membaca dari `process.env`).
4. **Advanced UI Reconstruction (Cyber SOC Dashboard)**:
   - Desain Dark Mode Glassmorphism dengan font resmi **Plus Jakarta Sans**.
   - Metric card dinamis (berubah warna ke Merah saat Bahaya dan kembali Hijau saat Aman).
   - Simulator Webhook lengkap dengan checkbox *"Kirim tanda tangan palsu (simulasi serangan)"* dan komputasi **Web Crypto API** (`window.crypto.subtle`) di browser.
   - Virtual Console bergaya terminal Linux asli dengan timestamp live feed.
5. **Dokumen Analisis Teknis (Langkah 5)**:
   - Tersedia dalam format Word resmi: [`Technical_Analysis_System_Security_Monitoring.docx`](Technical_Analysis_System_Security_Monitoring.docx) (Standar Kertas A4, Times New Roman 12pt, Spasi 1.5).
   - Versi Markdown lengkap: [`TECHNICAL_ANALYSIS.md`](TECHNICAL_ANALYSIS.md).

---

## 🚀 Panduan Menjalankan Sistem

### 1. Instalasi Dependensi
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 2. Konfigurasi Environment Variables
Salin template konfigurasi:
```bash
cp .env.example .env.local
```
Sesuaikan nilai variabel:
```env
HMAC_SECRET=cyber_soc_secure_hmac_secret_2026_key_super_safe
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_or_group_id_here
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### 3. Menjalankan Uji Alur Keamanan HMAC & Telegram
```bash
node scripts/test_flows.js
```
*Output memverifikasi 3 skenario: 200 OK (Valid), 401 Unauthorized (Tampered), dan 400 Bad Request (Missing).*

### 4. Menjalankan Benchmark Konkurensi AI (asyncio.gather)
```bash
python test/test_ai_concurrency.py
```
*Output menampilkan perbandingan waktu paralel vs sekuensial dan respon JSON lengkap dua model.*

### 5. Menjalankan Dashboard Web Lokal
```bash
npm run dev
```
Buka browser pada `http://localhost:3000`.

---

## 📊 Matriks Pengujian & Verifikasi

| Komponen | Perintah Uji | Hasil Verifikasi | Status |
|---|---|---|---|
| **AI Concurrency** | `python test/test_ai_concurrency.py` | Total waktu ~0.30s (+48.5% lebih cepat dari sekuensial ~0.59s) | **PASS** |
| **HMAC Valid** | `node scripts/test_flows.js` (Tes 1) | HTTP 200 OK & Notifikasi Telegram Dispatched | **PASS** |
| **HMAC Tampered** | `node scripts/test_flows.js` (Tes 2) | HTTP 401 Unauthorized (Serangan Tampering Ditolak) | **PASS** |
| **HMAC Missing** | `node scripts/test_flows.js` (Tes 3) | HTTP 400 Bad Request (Missing Header Ditolak) | **PASS** |
| **Production Build** | `npm run build` | Static & Dynamic Pages compiled with zero errors | **PASS** |

---

## 👨‍💻 Kontributor
- **Repository**: [https://github.com/Rudin1409/INTEGRATED-WEB](https://github.com/Rudin1409/INTEGRATED-WEB)
- **Teknologi**: Next.js, Python FastAPI, Web Crypto API, Tailwind CSS, Vercel Serverless.
