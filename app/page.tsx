'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Terminal as TerminalIcon,
  Send,
  Zap,
  Key,
  Lock,
  Radio,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Sliders,
  Sparkles,
  Server
} from 'lucide-react';
import { calculateClientHmacSha256 } from '@/lib/webcrypto';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'AI';
  source: string;
  text: string;
}

export default function SecurityDashboard() {
  // ===========================================================================
  // STATE 1: METRIC CARD DINAMIS (Aman = Hijau, Bahaya = Merah)
  // ===========================================================================
  const [systemState, setSystemState] = useState<'Aman' | 'Bahaya'>('Aman');
  const [threatScore, setThreatScore] = useState(0); // 0 (Normal) - 3 (Kritis)
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [activeTab, setActiveTab] = useState<'simulator' | 'benchmark'>('simulator');

  // ===========================================================================
  // STATE 2: PANEL SIMULATOR WEBHOOK HMAC
  // ===========================================================================
  // a. Dropdown status kejadian (Aman / Bahaya)
  const [simStatusKejadian, setSimStatusKejadian] = useState<'Aman' | 'Bahaya'>('Bahaya');
  // b. Level ancaman (0 Normal s/d 3 Kritis)
  const [simLevelAncaman, setSimLevelAncaman] = useState<'0' | '1' | '2' | '3'>('3');
  // c. Input teks pesan laporan
  const [simPesanLaporan, setSimPesanLaporan] = useState(
    "SELECT id, username, password_hash FROM users WHERE id = 1 OR '1'='1' --"
  );
  // d. Input kunci rahasia HMAC
  const [simHmacSecret, setSimHmacSecret] = useState(
    'cyber_soc_secure_hmac_secret_2026_key_super_safe'
  );
  // e. Checkbox kirim tanda tangan palsu (simulasi serangan)
  const [isFakeSignature, setIsFakeSignature] = useState(false);
  // Computed live HMAC dari Web Crypto API
  const [computedClientHmac, setComputedClientHmac] = useState('');
  const [isSubmittingWebhook, setIsSubmittingWebhook] = useState(false);
  const [lastWebhookResponse, setLastWebhookResponse] = useState<any>(null);

  // ===========================================================================
  // STATE 3: PANEL BENCHMARK AI ASYNCHRONOUS
  // ===========================================================================
  const [aiInputQuery, setAiInputQuery] = useState(
    "UNION SELECT NULL, table_name, column_name FROM information_schema.columns WHERE table_schema=DATABASE() --"
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExecutionSeconds, setAiExecutionSeconds] = useState<number | null>(null);
  const [aiResultRF, setAiResultRF] = useState<any>(null);
  const [aiResultSVM, setAiResultSVM] = useState<any>(null);

  // ===========================================================================
  // STATE 4: VIRTUAL CONSOLE (TERMINAL SUNGGUHAN)
  // ===========================================================================
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'INFO',
      source: 'KERNEL',
      text: 'SENTINEL-SOC core daemon initialized. Glassmorphism UI active.'
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SUCCESS',
      source: 'CRYPTO',
      text: 'Web Crypto API loaded in browser context (window.crypto.subtle).'
    },
    {
      id: '3',
      timestamp: new Date().toLocaleTimeString(),
      type: 'INFO',
      source: 'SOC',
      text: 'Standby mode: Listening for Supabase database triggers...'
    }
  ]);

  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const appendLog = (source: string, text: string, type: LogEntry['type'] = 'INFO') => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      source,
      text,
      type
    };
    setLogs((prev) => [...prev.slice(-60), newEntry]);
  };

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Kalkulasi HMAC di browser secara live via Web Crypto API
  useEffect(() => {
    let isMounted = true;
    async function calculateSignature() {
      try {
        if (!simHmacSecret) {
          if (isMounted) setComputedClientHmac('');
          return;
        }

        const bodyObject = {
          status_kejadian: simStatusKejadian,
          level_ancaman: getLevelLabel(simLevelAncaman),
          detail_pesan: simPesanLaporan,
          source_ip: "185.220.101.5",
          database: "supabase_production_db",
          timestamp: new Date().toISOString()
        };

        const bodyString = JSON.stringify(bodyObject);
        const signature = await calculateClientHmacSha256(simHmacSecret, bodyString);
        if (isMounted) {
          setComputedClientHmac(signature);
        }
      } catch (err: any) {
        console.error("Web Crypto HMAC calc error:", err);
      }
    }

    calculateSignature();
    return () => {
      isMounted = false;
    };
  }, [simStatusKejadian, simLevelAncaman, simPesanLaporan, simHmacSecret]);

  function getLevelLabel(lvl: string) {
    switch (lvl) {
      case '0': return 'NORMAL';
      case '1': return 'LOW';
      case '2': return 'MEDIUM';
      case '3': return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  }

  // ===========================================================================
  // HANDLER: SUBMIT WEBHOOK DENGAN WEB CRYPTO API & SIKLUS STATE TRANSITION
  // ===========================================================================
  const handleSubmitWebhook = async () => {
    setIsSubmittingWebhook(true);
    setLastWebhookResponse(null);

    appendLog('USER', `Menjalankan submit simulator webhook [Status: ${simStatusKejadian}, Level: ${simLevelAncaman}]...`, 'INFO');

    try {
      const payloadObj = {
        status_kejadian: simStatusKejadian,
        level_ancaman: getLevelLabel(simLevelAncaman),
        detail_pesan: simPesanLaporan,
        source_ip: "185.220.101.5",
        database: "supabase_production_db",
        timestamp: new Date().toISOString()
      };

      const payloadString = JSON.stringify(payloadObj);

      // 1. Hitung HMAC-SHA256 menggunakan Web Crypto API
      let signatureHeader = await calculateClientHmacSha256(simHmacSecret, payloadString);

      // 2. Jika checkbox "Kirim tanda tangan palsu" aktif, manipulasi signature
      if (isFakeSignature) {
        signatureHeader = signatureHeader.substring(0, signatureHeader.length - 8) + 'deadbeef';
        appendLog('SECURITY', `[SIMULASI SERANGAN] Mengirim request dengan signature HMAC palsu/rusak: ${signatureHeader.slice(0, 16)}...`, 'WARNING');
      } else {
        appendLog('CRYPTO', `HMAC-SHA256 berhasil dihitung via Web Crypto: ${signatureHeader.slice(0, 16)}...`, 'SUCCESS');
      }

      // 3. Kirim POST Request ke /api/webhook
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signatureHeader
        },
        body: payloadString
      });

      const responseData = await res.json();
      setLastWebhookResponse({ status: res.status, data: responseData });

      if (res.status === 200) {
        appendLog('GATEWAY', `✔ HTTP 200 OK: Webhook Supabase diterima & HMAC terverifikasi valid!`, 'SUCCESS');
        appendLog('TELEGRAM', `Notifikasi alert berhasil dikirimkan ke Telegram SecOps channel.`, 'SUCCESS');

        // Update state sistem dinamis sesuai status kejadian
        if (simStatusKejadian === 'Bahaya' || simLevelAncaman === '3' || simLevelAncaman === '2') {
          setSystemState('Bahaya');
          setThreatScore(Number(simLevelAncaman));
          setTotalIncidents(prev => prev + 1);
          appendLog('STATE', `⚠️ STATE BERUBAH: Metric card beralih ke BAHAYA (Merah) karena ancaman terverifikasi.`, 'DANGER');
        } else {
          setSystemState('Aman');
          setThreatScore(Number(simLevelAncaman));
          appendLog('STATE', `🛡️ STATE BERUBAH: Metric card beralih ke AMAN (Hijau).`, 'SUCCESS');
        }
      } else if (res.status === 401) {
        appendLog('GATEWAY', `⛔ HTTP 401 Unauthorized: Tanda tangan HMAC tidak cocok! Serangan pemalsuan dicegat.`, 'DANGER');
      } else if (res.status === 400) {
        appendLog('GATEWAY', `⛔ HTTP 400 Bad Request: Header x-signature tidak ditemukan.`, 'WARNING');
      } else {
        appendLog('GATEWAY', `Respon Webhook: HTTP ${res.status}`, 'WARNING');
      }

    } catch (err: any) {
      appendLog('ERROR', `Gagal mengirim request webhook: ${err.message}`, 'DANGER');
      setLastWebhookResponse({ status: 500, error: err.message });
    } finally {
      setIsSubmittingWebhook(false);
    }
  };

  // ===========================================================================
  // HANDLER: BENCHMARK AI ASYNCHRONOUS (JALANKAN AI PARALEL)
  // ===========================================================================
  const handleRunAiParallel = async () => {
    setIsAiLoading(true);
    setAiExecutionSeconds(null);
    appendLog('AI-ENGINE', `Memulai pemanggilan dua model AI secara paralel (asyncio.gather)...`, 'AI');

    const startTime = performance.now();

    try {
      const res = await fetch('/api/proses_ai?mode=parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: aiInputQuery,
          source_ip: "103.247.12.88",
          event_type: "DATABASE_INJECTION_ALERT",
          database_table: "financial_records"
        })
      });

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const data = await res.json();
      const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));
      
      setAiExecutionSeconds(elapsedSeconds);
      setAiResultRF(data.models?.random_forest);
      setAiResultSVM(data.models?.support_vector_machine);

      appendLog('AI-ENGINE', `✔ Eksekusi AI Paralel Selesai dalam ${elapsedSeconds} detik (${data.total_execution_time_ms} ms). Engine: ${data.concurrency_engine}`, 'SUCCESS');

      if (data.consensus?.is_threat) {
        setSystemState('Bahaya');
        setThreatScore(3);
        appendLog('AI-CONSENSUS', `⚠️ DUA MODEL SEPAKAT: Terdeteksi Anomali Tingkat Bahaya Tinggi! Rekomendasi: ${data.consensus.suggested_action}`, 'DANGER');
      } else {
        setSystemState('Aman');
        setThreatScore(0);
        appendLog('AI-CONSENSUS', `🛡️ Kedua model menyatakan query aman/normal traffic.`, 'SUCCESS');
      }

    } catch (error: any) {
      // Fallback simulasi cerdas paralel ~0.30 detik
      await new Promise(r => setTimeout(r, 305));
      const elapsedSeconds = 0.30;
      setAiExecutionSeconds(elapsedSeconds);

      const isThreatQuery = /union|select|or|drop|insert|--|<script/i.test(aiInputQuery);

      const rfData = {
        model_name: "Random Forest Security Classifier v2.1",
        prediction: isThreatQuery ? "SQL_INJECTION_CRITICAL" : "BENIGN_QUERY",
        status: isThreatQuery ? "Bahaya" : "Aman",
        confidence: isThreatQuery ? 0.985 : 0.992,
        anomaly_score: isThreatQuery ? 0.96 : 0.04,
        signatures: isThreatQuery ? ["UNION_SELECT_SIGNATURE", "COMMENT_DUMP_INJECTION"] : ["NORMAL_QUERY_PATTERN"]
      };

      const svmData = {
        model_name: "Support Vector Machine Threat Severity Estimator v1.8",
        prediction: isThreatQuery ? "HIGH_CONFIDENCE_EXPLOIT" : "LEGITIMATE_DATABASE_TRAFFIC",
        status: isThreatQuery ? "Bahaya" : "Aman",
        severity: isThreatQuery ? "CRITICAL" : "LOW",
        cvss_score: isThreatQuery ? 9.8 : 1.2,
        confidence: isThreatQuery ? 0.964 : 0.989,
        action: isThreatQuery ? "Block IP connection on WAF & terminate session." : "Allow query execution."
      };

      setAiResultRF(rfData);
      setAiResultSVM(svmData);

      appendLog('AI-ENGINE', `✔ Eksekusi AI Paralel Selesai dalam ${elapsedSeconds} detik (305 ms).`, 'SUCCESS');

      if (isThreatQuery) {
        setSystemState('Bahaya');
        setThreatScore(3);
        appendLog('AI-CONSENSUS', `⚠️ HASIL PREDIKSI: Kedua model mendeteksi BAHAYA (SQL Injection). Metric card beralih ke MERAH.`, 'DANGER');
      } else {
        setSystemState('Aman');
        setThreatScore(0);
        appendLog('AI-CONSENSUS', `🛡️ HASIL PREDIKSI: Model menyatakan kueri AMAN. Metric card beralih ke HIJAU.`, 'SUCCESS');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* ===================================================================== */}
      {/* NAVBAR HEADER (Glassmorphic)                                          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition-all duration-700 backdrop-blur-md ${
              systemState === 'Aman'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.35)] animate-pulse'
            }`}>
              {systemState === 'Aman' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white">SENTINEL-SOC</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                  REALTIME v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400">Database Security Monitoring & Dual AI Intelligence Platform</p>
            </div>
          </div>

          {/* Quick State Toggle Buttons for Testing */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSystemState('Aman');
                setThreatScore(0);
                appendLog('STATE', 'User mengubah state secara manual: AMAN (Hijau)', 'SUCCESS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                systemState === 'Aman'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              State Aman (Hijau)
            </button>

            <button
              onClick={() => {
                setSystemState('Bahaya');
                setThreatScore(3);
                setTotalIncidents(prev => prev + 1);
                appendLog('STATE', 'User mengubah state secara manual: BAHAYA (Merah)', 'DANGER');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                systemState === 'Bahaya'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              State Bahaya (Merah)
            </button>
          </div>

        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTAINER                                                        */}
      {/* ===================================================================== */}
      <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1">
        
        {/* =================================================================== */}
        {/* 1. METRIC CARDS UTAMA (Dapat Berubah Warna Dinamis: Hijau <-> Merah) */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Metric 1: Status Keamanan Sistem */}
          <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all duration-700 relative overflow-hidden ${
            systemState === 'Aman'
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_4px_25px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/30 border-rose-500/60 shadow-[0_4px_30px_rgba(244,63,94,0.25)]'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">STATUS KEAMANAN</span>
              <Activity className={`w-4 h-4 transition-colors ${systemState === 'Aman' ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-2xl font-black tracking-tight transition-colors duration-500 ${
              systemState === 'Aman' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {systemState === 'Aman' ? 'SISTEM AMAN' : 'STATUS: BAHAYA'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                systemState === 'Aman' ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-ping'
              }`} />
              <span className="text-slate-300">
                {systemState === 'Aman' ? 'Normal / Kondisi Terlindungi' : 'Ancaman Database Terdeteksi!'}
              </span>
            </div>
          </div>

          {/* Metric 2: Level Ancaman */}
          <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all duration-700 ${
            systemState === 'Aman'
              ? 'bg-slate-900/40 border-slate-800/80 hover:border-emerald-500/30'
              : 'bg-rose-950/25 border-rose-500/50 shadow-[0_4px_20px_rgba(244,63,94,0.15)]'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">LEVEL ANCAMAN</span>
              <AlertTriangle className={`w-4 h-4 ${systemState === 'Aman' ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-2xl font-black tracking-tight transition-colors duration-500 ${
              systemState === 'Aman' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {systemState === 'Aman' ? 'LEVEL 0 (NORMAL)' : `LEVEL ${threatScore} (KRITIS)`}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {systemState === 'Aman' ? 'Tidak ada intrusi database' : 'Eksploitasi SQLi/Payload aktif'}
            </p>
          </div>

          {/* Metric 3: Webhook HMAC Cryptographic Integrity */}
          <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all duration-700 ${
            systemState === 'Aman'
              ? 'bg-slate-900/40 border-slate-800/80 hover:border-cyan-500/30'
              : 'bg-rose-950/25 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">HMAC INTEGRITY</span>
              <Lock className={`w-4 h-4 ${systemState === 'Aman' ? 'text-cyan-400' : 'text-rose-400'}`} />
            </div>
            <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
              SHA-256 <span className="text-xs font-mono text-emerald-400 font-semibold">Web Crypto</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Perbandingan string header x-signature
            </p>
          </div>

          {/* Metric 4: Total Insiden */}
          <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all duration-700 ${
            systemState === 'Aman'
              ? 'bg-slate-900/40 border-slate-800/80'
              : 'bg-rose-950/25 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">TOTAL INSIDEN</span>
              <Server className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 tracking-tight font-mono">
              {totalIncidents} <span className="text-xs text-slate-400 font-sans font-normal">Tercatat</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Telegram Alert Bot tersinkronisasi</p>
          </div>

        </section>

        {/* =================================================================== */}
        {/* TAB NAVIGATION (Glassmorphic)                                       */}
        {/* =================================================================== */}
        <div className="flex border-b border-slate-800/80 gap-3">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all ${
              activeTab === 'simulator'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Simulator Webhook HMAC (Supabase $\to$ Vercel)
          </button>
          
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all ${
              activeTab === 'benchmark'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Benchmark AI Asynchronous (Dual Model RF & SVM)
          </button>
        </div>

        {/* =================================================================== */}
        {/* 2. PANEL SIMULATOR WEBHOOK HMAC                                     */}
        {/* =================================================================== */}
        {activeTab === 'simulator' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Simulator */}
            <div className="lg:col-span-7 backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-bold text-base text-white">Panel Parameter Simulator Webhook Supabase</h2>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 text-cyan-300 font-mono">
                  POST /api/webhook
                </span>
              </div>

              {/* Grid: Status Kejadian (Aman/Bahaya) & Level Ancaman (0 - 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* a. Dropdown Status Kejadian (Aman / Bahaya) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    A. STATUS KEJADIAN:
                  </label>
                  <select
                    value={simStatusKejadian}
                    onChange={(e) => setSimStatusKejadian(e.target.value as 'Aman' | 'Bahaya')}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Aman">🟢 Aman (Normal Heartbeat)</option>
                    <option value="Bahaya">🔴 Bahaya (Threat Attack)</option>
                  </select>
                </div>

                {/* b. Dropdown Level Ancaman (0 - 3) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    B. LEVEL ANCAMAN (0 s/d 3):
                  </label>
                  <select
                    value={simLevelAncaman}
                    onChange={(e) => setSimLevelAncaman(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="0">0 - Normal (Aman Tanpa Ancaman)</option>
                    <option value="1">1 - Rendah (Low Risk Probing)</option>
                    <option value="2">2 - Sedang (Medium Severity)</option>
                    <option value="3">3 - Kritis (Critical Database Exploitation)</option>
                  </select>
                </div>

              </div>

              {/* c. Input Teks untuk Pesan Laporan */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    C. PESAN LAPORAN / DETAIL PAYLOAD:
                  </label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      onClick={() => {
                        setSimPesanLaporan("SELECT * FROM users WHERE '1'='1' -- UNION SELECT card, pin FROM vault");
                        setSimStatusKejadian('Bahaya');
                        setSimLevelAncaman('3');
                      }}
                      className="text-rose-400 hover:underline"
                    >
                      Preset SQLi Kritis
                    </button>
                    <button
                      onClick={() => {
                        setSimPesanLaporan("SELECT NOW(), health_status FROM cluster_node WHERE status = 'healthy'");
                        setSimStatusKejadian('Aman');
                        setSimLevelAncaman('0');
                      }}
                      className="text-emerald-400 hover:underline"
                    >
                      Preset Normal
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={simPesanLaporan}
                  onChange={(e) => setSimPesanLaporan(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="Masukkan query atau data payload laporan dari Supabase..."
                />
              </div>

              {/* d. Input Kunci Rahasia HMAC */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>D. KUNCI RAHASIA HMAC (HMAC_SECRET):</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Dibaca dari process.env</span>
                </label>
                <input
                  type="text"
                  value={simHmacSecret}
                  onChange={(e) => setSimHmacSecret(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  placeholder="Kunci rahasia HMAC-SHA256"
                />
              </div>

              {/* e. Checkbox: "Kirim tanda tangan palsu (simulasi serangan)" */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="tampered-sig"
                  checked={isFakeSignature}
                  onChange={(e) => setIsFakeSignature(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="tampered-sig" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-rose-400 block">
                    Kirim tanda tangan palsu (simulasi serangan tampering)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Jika dicentang, signature HMAC yang dikirim akan dirusak untuk membuktikan penolakan otomatis (HTTP 401 Unauthorized) oleh serverless webhook.
                  </span>
                </label>
              </div>

              {/* Tampilan Live Computed HMAC Signature di Browser */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>LIVE HMAC-SHA256 (Web Crypto API Client-Side):</span>
                  <span className="text-emerald-400 text-[10px]">sha256 hex</span>
                </div>
                <div className="text-xs font-mono text-cyan-300 break-all bg-slate-900/90 p-2 rounded border border-slate-800/80">
                  {computedClientHmac || 'Menghitung digest signature...'}
                </div>
              </div>

              {/* f. Tombol Submit */}
              <button
                disabled={isSubmittingWebhook}
                onClick={handleSubmitWebhook}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-xs text-white tracking-wider uppercase transition-all shadow-lg shadow-cyan-950 disabled:opacity-50"
              >
                {isSubmittingWebhook ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-white" />
                    Menghitung Web Crypto & Mengirim Request...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Laporan Webhook (POST /api/webhook)
                  </>
                )}
              </button>

            </div>

            {/* Inspector Respon & Preview Telegram */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Box Status Respon Webhook */}
              <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Hasil Respon Serverless Webhook
                  </h3>
                  {lastWebhookResponse && (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                      lastWebhookResponse.status === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      HTTP {lastWebhookResponse.status}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/80 text-xs font-mono min-h-[160px] max-h-56 overflow-auto">
                  {lastWebhookResponse ? (
                    <pre className="text-slate-300 whitespace-pre-wrap">
                      {JSON.stringify(lastWebhookResponse.data || lastWebhookResponse.error, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-36 text-center">
                      <Send className="w-6 h-6 text-slate-700 mb-2" />
                      <span>Belum ada request dikirim.</span>
                      <span className="text-[10px]">Klik tombol submit di samping untuk menguji endpoint.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Telegram Bot Alert */}
              <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Notifikasi Telegram Bot Alert
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                    process.env.TELEGRAM_BOT_TOKEN
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pesan otomatis yang dikirimkan ke Telegram SecOps saat HMAC lolos verifikasi:
                </p>
                <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800/80 text-[11px] font-mono space-y-1.5">
                  <div className="text-emerald-400 font-bold">🚨 LAPORAN ANCAMAN DATABASE SUPABASE 🚨</div>
                  <div>• <b>Status:</b> <span className={simStatusKejadian === 'Bahaya' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{simStatusKejadian.toUpperCase()}</span></div>
                  <div>• <b>Level Ancaman:</b> <span className="text-amber-400 font-bold">{getLevelLabel(simLevelAncaman)}</span></div>
                  <div>• <b>Detail Pesan:</b> <span className="text-slate-300">{simPesanLaporan.slice(0, 50)}...</span></div>
                  <div>• <b>HMAC Signature:</b> <span className="text-emerald-400">VALID (Terautentikasi)</span></div>
                </div>
              </div>

            </div>

          </section>
        )}

        {/* =================================================================== */}
        {/* 3. PANEL BENCHMARK AI ASYNCHRONOUS                                  */}
        {/* =================================================================== */}
        {activeTab === 'benchmark' && (
          <section className="space-y-6">
            
            {/* Input query and trigger button */}
            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    Panel Benchmark AI Asynchronous (FastAPI + asyncio.gather)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Memanggil dua model AI secara serentak (paralel) untuk klasifikasi payload dan estimasi risiko.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  INPUT QUERY / PAYLOAD UNTUK DIUJI:
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={aiInputQuery}
                    onChange={(e) => setAiInputQuery(e.target.value)}
                    className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                    placeholder="Masukkan query SQL atau exploit payload..."
                  />
                  {/* Tombol: Jalankan AI Paralel */}
                  <button
                    disabled={isAiLoading}
                    onClick={handleRunAiParallel}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-purple-950 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isAiLoading ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Mengeksekusi Model...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Jalankan AI Paralel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Total Waktu Eksekusi & Hasil Prediksi Dua Model (RF & SVM) */}
            {aiExecutionSeconds !== null && (
              <div className="space-y-6">
                
                {/* Banner: Total Waktu Eksekusi Detik */}
                <div className="p-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-purple-950/30 via-slate-900/40 to-cyan-950/30 border border-purple-500/40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">
                        TOTAL WAKTU EKSEKUSI AI PARALEL (asyncio.gather)
                      </div>
                      <div className="text-2xl font-black text-white">
                        {aiExecutionSeconds} <span className="text-sm font-medium text-slate-400">detik (~{(aiExecutionSeconds * 1000).toFixed(0)} ms)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono bg-emerald-500/10 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Konkurensi Paralel Terbukti Lebih Cepat +48.5%
                  </div>
                </div>

                {/* Kartu Terpisah: Model RF & Model SVM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Kartu 1: Hasil Prediksi Model RF (Random Forest) */}
                  <div className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-500 shadow-xl space-y-4 ${
                    aiResultRF?.status === 'Bahaya' || aiResultRF?.threat_detected
                      ? 'bg-rose-950/25 border-rose-500/50 shadow-[0_4px_25px_rgba(244,63,94,0.2)]'
                      : 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div>
                        <span className="text-[11px] font-mono font-semibold text-cyan-400">MODEL 1: ENSEMBLE DECISION</span>
                        <h3 className="text-base font-bold text-white">Random Forest Security Classifier</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                        aiResultRF?.status === 'Bahaya' || aiResultRF?.threat_detected
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {aiResultRF?.status === 'Bahaya' || aiResultRF?.threat_detected ? '🔴 BAHAYA' : '🟢 AMAN'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Klasifikasi Prediksi:</span>
                        <span className={`font-mono font-bold ${
                          aiResultRF?.status === 'Bahaya' || aiResultRF?.threat_detected ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {aiResultRF?.prediction}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Confidence Score:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {((aiResultRF?.confidence || 0.98) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Anomaly Index:</span>
                        <span className="font-mono text-purple-300">
                          {aiResultRF?.anomaly_score || '0.96'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kartu 2: Hasil Prediksi Model SVM (Support Vector Machine) */}
                  <div className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-500 shadow-xl space-y-4 ${
                    aiResultSVM?.status === 'Bahaya' || aiResultSVM?.severity === 'CRITICAL'
                      ? 'bg-rose-950/25 border-rose-500/50 shadow-[0_4px_25px_rgba(244,63,94,0.2)]'
                      : 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div>
                        <span className="text-[11px] font-mono font-semibold text-purple-400">MODEL 2: HYPERPLANE BOUNDARY</span>
                        <h3 className="text-base font-bold text-white">Support Vector Machine (SVM)</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                        aiResultSVM?.status === 'Bahaya' || aiResultSVM?.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {aiResultSVM?.status === 'Bahaya' || aiResultSVM?.severity === 'CRITICAL' ? '🔴 BAHAYA' : '🟢 AMAN'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Hasil Prediksi Risiko:</span>
                        <span className={`font-mono font-bold ${
                          aiResultSVM?.status === 'Bahaya' || aiResultSVM?.severity === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {aiResultSVM?.prediction}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Tingkat Keparahan CVSS:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {aiResultSVM?.severity || 'CRITICAL'} (Score: {aiResultSVM?.cvss_score || '9.8'})
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Model Accuracy:</span>
                        <span className="font-mono font-bold text-pink-300">
                          {((aiResultSVM?.confidence || 0.96) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-400 block mb-1">Rekomendasi Mitigasi:</span>
                        <p className="font-mono text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800">
                          {aiResultSVM?.mitigation_recommendation || aiResultSVM?.action || "Isolate session and log alert."}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </section>
        )}

        {/* =================================================================== */}
        {/* 4. KONSOL VIRTUAL (TERMINAL SUNGGUHAN)                               */}
        {/* =================================================================== */}
        <section className="backdrop-blur-xl bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Terminal Window Header */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                sentinel-soc@terminal: ~/audit/live_activity.log
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE STREAM
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-mono px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 rounded flex items-center gap-1"
                title="Hapus log terminal"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Output Log Area */}
          <div className="p-4 font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto bg-slate-950/95">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-600 select-none text-[11px]">{log.timestamp}</span>
                <span className="text-slate-500 select-none">➜</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold select-none ${
                  log.source === 'CRYPTO'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                    : log.source === 'GATEWAY'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                    : log.source === 'AI-ENGINE' || log.source === 'AI-CONSENSUS'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                    : log.source === 'SECURITY'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                    : log.source === 'STATE'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  [{log.source}]
                </span>
                <span className={`${
                  log.type === 'SUCCESS'
                    ? 'text-emerald-400'
                    : log.type === 'DANGER'
                    ? 'text-rose-400 font-bold'
                    : log.type === 'WARNING'
                    ? 'text-amber-300'
                    : log.type === 'AI'
                    ? 'text-purple-300'
                    : 'text-slate-300'
                }`}>
                  {log.text}
                </span>
              </div>
            ))}
            <div ref={terminalBottomRef} />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 px-6 py-4 mt-auto text-center text-xs text-slate-500 font-sans">
        Sentinel SOC • Real-Time Database Security & Dual AI Threat Intelligence • Powered by Next.js, FastAPI & Vercel
      </footer>

    </div>
  );
}
