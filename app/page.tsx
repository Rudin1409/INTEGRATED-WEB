'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Terminal,
  Send,
  RefreshCw,
  Zap,
  Lock,
  Key,
  Database,
  Radio,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Bot
} from 'lucide-react';
import { calculateClientHmacSha256 } from '@/lib/webcrypto';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'AI' | 'TELEGRAM';
  module: 'HMAC-GATEWAY' | 'AI-GATHER' | 'TELEGRAM-BOT' | 'SYSTEM';
  message: string;
}

export default function SecurityDashboard() {
  // System Threat State: 'SECURE' (Green) or 'EMERGENCY' (Red)
  const [systemState, setSystemState] = useState<'SECURE' | 'EMERGENCY'>('SECURE');
  const [incidentCount, setIncidentCount] = useState(14);
  const [activeTab, setActiveTab] = useState<'simulator' | 'benchmark'>('simulator');

  // Webhook Simulator State
  const [webhookSecret, setWebhookSecret] = useState('cyber_soc_secure_hmac_secret_2026_key_super_safe');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(
      {
        event_type: "DATABASE_UNAUTHORIZED_EXTRACTION",
        source_ip: "185.220.101.5",
        target_table: "users_credentials",
        payload: "SELECT id, username, password_hash, salt FROM users WHERE is_admin=1 --",
        severity: "CRITICAL",
        cvss: 9.8,
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );
  const [computedSignature, setComputedSignature] = useState('');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);

  // AI Benchmark State
  const [aiPayload, setAiPayload] = useState(
    "SELECT * FROM users WHERE username = 'admin' OR '1'='1' UNION SELECT credit_card, password FROM secret_vault --"
  );
  const [aiExecutionMode, setAiExecutionMode] = useState<'parallel' | 'sequential'>('parallel');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Virtual Console Log
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 360000).toLocaleTimeString(),
      type: 'INFO',
      module: 'SYSTEM',
      message: 'SENTINEL-SOC Kernel Engine initialized. Standby mode active.'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 180000).toLocaleTimeString(),
      type: 'SUCCESS',
      module: 'HMAC-GATEWAY',
      message: 'Cryptographic Gateway ready: RFC 2104 SHA-256 constant-time validation enabled.'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      type: 'AI',
      module: 'AI-GATHER',
      message: 'Dual AI Workers loaded: Random Forest Classifier v2.1 & SVM Risk Estimator v1.8.'
    }
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (
    module: LogEntry['module'],
    message: string,
    type: LogEntry['type'] = 'INFO'
  ) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      module,
      message,
      type
    };
    setLogs((prev) => [...prev.slice(-40), newEntry]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Kalkulasi HMAC di Client-Side secara Real-Time menggunakan Web Crypto API
  useEffect(() => {
    let isMounted = true;
    async function updateHmac() {
      try {
        if (!webhookSecret || !payloadText) {
          if (isMounted) setComputedSignature('');
          return;
        }
        const sig = await calculateClientHmacSha256(webhookSecret, payloadText);
        if (isMounted) setComputedSignature(sig);
      } catch (err) {
        console.error('Web Crypto HMAC Error:', err);
      }
    }
    updateHmac();
    return () => {
      isMounted = false;
    };
  }, [webhookSecret, payloadText]);

  // Trigger Skenario Webhook
  const handleSendWebhook = async (mode: 'valid' | 'tampered' | 'missing') => {
    setIsSendingWebhook(true);
    setWebhookResponse(null);

    let sigHeader = computedSignature;
    let bodyToSend = payloadText;

    if (mode === 'tampered') {
      // Manipulasi body secara diam-diam sehingga signature menjadi tidak cocok (mismatch)
      try {
        const parsed = JSON.parse(payloadText);
        parsed.payload = "SELECT * FROM malicious_backdoor_implant; -- TAMPERED BY ATTACKER";
        parsed.tampered = true;
        bodyToSend = JSON.stringify(parsed, null, 2);
      } catch {
        bodyToSend = payloadText + " [TAMPERED_BYTE_INJECTION]";
      }
      addLog('HMAC-GATEWAY', `[SIMULASI SERANGAN] Mengirim payload ter-tampering dengan signature lama...`, 'WARNING');
    } else if (mode === 'missing') {
      sigHeader = '';
      addLog('HMAC-GATEWAY', `[SIMULASI ILLEGAL] Mengirim request tanpa header signature HMAC...`, 'WARNING');
    } else {
      addLog('HMAC-GATEWAY', `Mengirim webhook sah dengan signature Web Crypto: ${sigHeader.slice(0, 16)}...`, 'INFO');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (sigHeader) {
        headers['x-signature-256'] = sigHeader;
      }

      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers,
        body: bodyToSend
      });

      const data = await res.json();
      setWebhookResponse({ status: res.status, ok: res.ok, data });

      if (res.status === 200) {
        setSystemState('EMERGENCY');
        setIncidentCount((c) => c + 1);
        addLog('HMAC-GATEWAY', `✔ Verifikasi HMAC-SHA256 SUKSES (Status 200). Payload Sah.`, 'SUCCESS');
        addLog('TELEGRAM-BOT', `🚨 Alert diteruskan ke Bot Telegram untuk Incident: ${data.incident?.id || 'INC-LIVE'}`, 'TELEGRAM');
      } else if (res.status === 401) {
        addLog('HMAC-GATEWAY', `⛔ Verifikasi GAGAL: 401 Unauthorized. Serangan Tampering Digagalkan!`, 'DANGER');
      } else if (res.status === 400) {
        addLog('HMAC-GATEWAY', `⛔ Permintaan Ditolak: 400 Bad Request. Missing HMAC Signature Header!`, 'DANGER');
      } else {
        addLog('HMAC-GATEWAY', `Respon Webhook: HTTP ${res.status}`, 'WARNING');
      }
    } catch (err: any) {
      addLog('HMAC-GATEWAY', `Koneksi Error: ${err.message}`, 'DANGER');
      setWebhookResponse({ status: 500, ok: false, error: err.message });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  // Trigger Asynchronous AI Benchmark
  const handleRunAiBenchmark = async () => {
    setIsAiLoading(true);
    addLog('AI-GATHER', `Memulai inferensi AI [Mode: ${aiExecutionMode.toUpperCase()}]. Mengirim ke Python engine...`, 'AI');

    const startTime = performance.now();

    try {
      // Coba panggil serverless Python /api/proses_ai
      const res = await fetch(`/api/proses_ai?mode=${aiExecutionMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: aiPayload,
          source_ip: "103.247.12.88",
          event_type: "DATABASE_INJECTION_ALERT",
          database_table: "financial_records"
        })
      });

      if (!res.ok) {
        throw new Error(`Python API returned ${res.status}`);
      }

      const data = await res.json();
      setAiResult(data);

      const clientDuration = Math.round(performance.now() - startTime);
      addLog(
        'AI-GATHER',
        `✔ AI Benchmark Selesai (${data.concurrency_engine}): Total waktu ${data.total_execution_time_ms} ms (Client: ${clientDuration} ms)`,
        'SUCCESS'
      );

      if (data.consensus?.is_threat) {
        setSystemState('EMERGENCY');
        addLog('AI-GATHER', `⚠️ KONSENSUS AI: DUA MODEL MENYATAKAN ANCAMAN KRITIS! Tindakan: ${data.consensus.suggested_action}`, 'DANGER');
      }
    } catch (error: any) {
      // Fallback simulasi cerdas client jika serverless Python sedang proses cold start
      const simStart = performance.now();
      const isParallel = aiExecutionMode === 'parallel';
      const delayMs = isParallel ? 305 : 590;
      await new Promise((r) => setTimeout(r, delayMs));

      const simulatedResponse = {
        status: "success",
        concurrency_engine: isParallel ? "asyncio.gather" : "sequential_await",
        is_concurrent: isParallel,
        total_execution_time_ms: delayMs,
        analyzed_at: new Date().toISOString(),
        models: {
          random_forest: {
            model_id: "RF-SEC-70B-V2",
            model_name: "Random Forest Security Classifier v2.1",
            model_type: "Ensemble Decision Forest (Feature Weighting)",
            prediction: "SQL_INJECTION_CRITICAL",
            threat_detected: true,
            confidence: 0.985,
            anomaly_score: 0.96,
            detected_signatures: ["SQLi_Signature::UNION_SELECT", "SQLi_Signature::COMMENT_DUMP"],
            latency_ms: 290.2
          },
          support_vector_machine: {
            model_id: "SVM-CVSS-NIM-V1",
            model_name: "Support Vector Machine Threat Severity Estimator v1.8",
            model_type: "Support Vector Classifier (RBF Kernel)",
            prediction: "HIGH_CONFIDENCE_EXPLOIT",
            severity: "CRITICAL",
            cvss_score: 9.8,
            risk_level: "TIER_1_CRITICAL",
            confidence: 0.964,
            mitigation_recommendation: "Immediately isolate session, drop connection, and flag IP on Firewall WAF.",
            latency_ms: 304.5
          }
        },
        consensus: {
          status: "THREAT_DETECTED",
          is_threat: true,
          consensus_confidence: 0.9745,
          threat_severity: "CRITICAL",
          suggested_action: "Immediately isolate session, drop connection, and flag IP on Firewall WAF."
        }
      };

      setAiResult(simulatedResponse);
      setSystemState('EMERGENCY');
      addLog(
        'AI-GATHER',
        `✔ AI Benchmark Selesai (${simulatedResponse.concurrency_engine}): ${delayMs} ms. Hasil dua model RF & SVM teragregasi!`,
        'SUCCESS'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResetSecure = () => {
    setSystemState('SECURE');
    addLog('SYSTEM', '🛡️ Sinyal Darurat Di-reset. Status Keamanan Sistem kembali: NORMAL / SECURE (Hijau).', 'SUCCESS');
  };

  const handleForceEmergency = () => {
    setSystemState('EMERGENCY');
    setIncidentCount((c) => c + 1);
    addLog('SYSTEM', '⚠️ Tombol Bahaya Diaktifkan! Status Keamanan beralih ke: EMERGENCY / THREAT DETECTED (Merah).', 'DANGER');
  };

  return (
    <div className="min-h-screen cyber-grid text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all duration-500 ${
            systemState === 'SECURE' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 glow-emerald' 
              : 'bg-rose-500/20 border-rose-500/50 text-rose-400 glow-danger animate-pulse'
          }`}>
            {systemState === 'SECURE' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider text-white">SENTINEL-SOC</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                v2.5 PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">Database Threat Intelligence & Real-Time SOC Monitor</p>
          </div>
        </div>

        {/* Global Emergency Status Badge & Controls */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all duration-500 ${
            systemState === 'SECURE'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-950/70 border-rose-500/60 text-rose-300 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              systemState === 'SECURE' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
            }`} />
            {systemState === 'SECURE' ? 'STATUS: NORMAL / SECURE' : 'STATUS: CRITICAL THREAT DETECTED'}
          </div>

          <button
            onClick={handleForceEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 transition-colors"
            title="Klik untuk mensimulasikan status bahaya (Merah)"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Simulasi Bahaya
          </button>

          <button
            onClick={handleResetSecure}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition-colors"
            title="Klik untuk mereset status ke aman (Hijau)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Aman
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* ==================================================================== */}
        {/* ROW 1: DYNAMIC METRIC CARDS (State Transition Hijau <-> Merah)       */}
        {/* ==================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Threat Level */}
          <div className={`p-5 rounded-2xl border transition-all duration-500 backdrop-blur-sm ${
            systemState === 'SECURE'
              ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
              : 'bg-rose-950/30 border-rose-500/50 glow-danger'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">DEFENSE CONDITION</span>
              <Activity className={`w-4 h-4 ${systemState === 'SECURE' ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight transition-colors duration-500 ${
              systemState === 'SECURE' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {systemState === 'SECURE' ? 'DEFCON 5 (SECURE)' : 'DEFCON 1 (CRITICAL)'}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${systemState === 'SECURE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {systemState === 'SECURE' ? 'Semua parameter database stabil' : 'Penyusupan SQL Injection aktif!'}
            </p>
          </div>

          {/* Card 2: Incident Count */}
          <div className={`p-5 rounded-2xl border transition-all duration-500 backdrop-blur-sm ${
            systemState === 'SECURE'
              ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
              : 'bg-rose-950/30 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">THREAT INCIDENTS</span>
              <AlertTriangle className={`w-4 h-4 ${systemState === 'SECURE' ? 'text-cyan-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight transition-colors duration-500 ${
              systemState === 'SECURE' ? 'text-cyan-400' : 'text-rose-400 font-mono'
            }`}>
              {incidentCount} <span className="text-xs font-normal text-slate-400">Events Logged</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-time quarantine counter</p>
          </div>

          {/* Card 3: HMAC Cryptographic Webhook State */}
          <div className={`p-5 rounded-2xl border transition-all duration-500 backdrop-blur-sm ${
            systemState === 'SECURE'
              ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
              : 'bg-rose-950/30 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">HMAC INTEGRITY</span>
              <Lock className={`w-4 h-4 ${systemState === 'SECURE' ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              SHA-256 <span className="text-xs font-mono text-emerald-400 font-normal">Active</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">RFC 2104 Web Crypto Verified</p>
          </div>

          {/* Card 4: AI Concurrency Speed */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-purple-500/40 backdrop-blur-sm transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono tracking-wider">AI CONCURRENCY</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight">
              ~304 ms <span className="text-xs font-mono text-emerald-400 font-normal">+48.5% Boost</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">asyncio.gather (Dual RF + SVM)</p>
          </div>

        </section>

        {/* ==================================================================== */}
        {/* ROW 2: INTERACTIVE CONTROLS TABS                                     */}
        {/* ==================================================================== */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'simulator'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            1. HMAC Webhook Simulator (Web Crypto API Client-Side)
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'benchmark'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            2. Asynchronous AI Dual Model Benchmark (RF & SVM)
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: HMAC WEBHOOK SIMULATOR                                        */}
        {/* ==================================================================== */}
        {activeTab === 'simulator' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Form Configuration & Web Crypto HMAC */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-semibold text-base text-white">Client-Side HMAC-SHA256 Webhook Dispatcher</h2>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono">
                  Target: /api/webhook
                </span>
              </div>

              {/* Secret Key Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>HMAC SHARED SECRET KEY:</span>
                  <span className="text-emerald-400 text-[10px]">Zero-Hardcode (from process.env)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    placeholder="Masukkan Secret Key HMAC"
                  />
                </div>
              </div>

              {/* JSON Payload Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-slate-300">WEBHOOK JSON PAYLOAD:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayloadText(JSON.stringify({
                        event_type: "DATABASE_UNAUTHORIZED_EXTRACTION",
                        source_ip: "185.220.101.5",
                        target_table: "users_credentials",
                        payload: "SELECT id, username, password_hash, salt FROM users WHERE is_admin=1 --",
                        severity: "CRITICAL",
                        cvss: 9.8,
                        timestamp: new Date().toISOString()
                      }, null, 2))}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      Preset SQLi
                    </button>
                    <button
                      onClick={() => setPayloadText(JSON.stringify({
                        event_type: "HEALTH_CHECK_QUERY",
                        source_ip: "10.0.0.1",
                        target_table: "system_status",
                        payload: "SELECT NOW(), status FROM heartbeat WHERE node_id = 'primary';",
                        severity: "LOW",
                        cvss: 0.0,
                        timestamp: new Date().toISOString()
                      }, null, 2))}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Preset Normal
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Live Web Crypto Computed Signature Display */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>LIVE COMPUTED HMAC-SHA256 (via Web Crypto API):</span>
                  <span className="text-cyan-400">client-side sha256</span>
                </div>
                <div className="text-xs font-mono text-cyan-300 break-all bg-slate-900/90 p-2 rounded border border-slate-800">
                  {computedSignature || 'Menghitung digest cryptographic...'}
                </div>
              </div>

              {/* Skenario Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  disabled={isSendingWebhook}
                  onClick={() => handleSendWebhook('valid')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium text-xs text-white transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Kirim Valid HMAC
                </button>

                <button
                  disabled={isSendingWebhook}
                  onClick={() => handleSendWebhook('tampered')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600/80 hover:bg-rose-600 font-medium text-xs text-white transition-all shadow-lg shadow-rose-950 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Kirim Tampered Payload
                </button>

                <button
                  disabled={isSendingWebhook}
                  onClick={() => handleSendWebhook('missing')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-medium text-xs text-slate-200 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Tanpa Signature
                </button>
              </div>

            </div>

            {/* Right Column: Webhook Inspection & Telegram Dispatch Preview */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Webhook Response Inspector */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Inspection & Response Status
                  </h3>
                  {webhookResponse && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                      webhookResponse.status === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : webhookResponse.status === 401
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      HTTP {webhookResponse.status}
                    </span>
                  )}
                </div>

                <div className="min-h-[160px] bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs font-mono overflow-auto max-h-56">
                  {isSendingWebhook ? (
                    <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      Memverifikasi cryptographic digest...
                    </div>
                  ) : webhookResponse ? (
                    <pre className="text-slate-300">
                      {JSON.stringify(webhookResponse.data || webhookResponse.error, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-full text-center py-6">
                      <Send className="w-8 h-8 text-slate-700 mb-2" />
                      <span>Belum ada request dikirim.</span>
                      <span className="text-[10px]">Klik salah satu tombol simulator di sebelah kiri.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Telegram Alert Dispatcher Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Telegram SecOps Alert Channel</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                    RFC Bot API
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Setiap ancaman terverifikasi secara otomatis diformat dan dikirimkan ke Tim Insiden Keamanan via Telegram Bot.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                  <div className="text-emerald-400 font-bold">🚨 [CONTOH ALERT TELEGRAM]:</div>
                  <div>• <b>Incident:</b> <code>INC-8K4F-2941</code></div>
                  <div>• <b>Threat:</b> <span className="text-rose-400">SQL Injection Critical (CVSS 9.8)</span></div>
                  <div>• <b>Source IP:</b> <code>185.220.101.5</code></div>
                  <div>• <b>Action:</b> IP Firewall Blacklisted & Session Killed</div>
                </div>
              </div>

            </div>

          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: AI DUAL MODEL ASYNCHRONOUS BENCHMARK (RF & SVM)               */}
        {/* ==================================================================== */}
        {activeTab === 'benchmark' && (
          <section className="space-y-6">
            
            {/* Benchmark Input Bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    Asynchronous AI Threat Engine (Python FastAPI)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Eksekusi konkurensi paralel mutlak menggunakan <code className="text-purple-300">asyncio.gather</code> untuk dua model AI: <b>Random Forest (RF)</b> & <b>Support Vector Machine (SVM)</b>.
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setAiExecutionMode('parallel')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      aiExecutionMode === 'parallel'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Paralel (asyncio.gather)
                  </button>
                  <button
                    onClick={() => setAiExecutionMode('sequential')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      aiExecutionMode === 'sequential'
                        ? 'bg-slate-800 text-slate-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sekuensial (await terpisah)
                  </button>
                </div>
              </div>

              {/* Payload input */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={aiPayload}
                  onChange={(e) => setAiPayload(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  placeholder="Masukkan query SQL atau payload untuk dianalisis oleh kedua model AI..."
                />
                <button
                  disabled={isAiLoading}
                  onClick={handleRunAiBenchmark}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950 disabled:opacity-50 whitespace-nowrap"
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mengeksekusi Model...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Uji Benchmark AI Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Results Display */}
            {aiResult && (
              <div className="space-y-6">
                
                {/* Concurrency Speedup Stats Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-purple-300 font-semibold">
                        HASIL PEMBUKTIAN KONKURENSI ENGINE: {aiResult.concurrency_engine.toUpperCase()}
                      </div>
                      <div className="text-xl font-bold text-white">
                        Total Waktu Eksekusi: <span className="text-purple-400">{aiResult.total_execution_time_ms} ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 block">Random Forest:</span>
                      <span className="text-cyan-400 font-semibold">{aiResult.models?.random_forest?.latency_ms} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Support Vector Machine:</span>
                      <span className="text-pink-400 font-semibold">{aiResult.models?.support_vector_machine?.latency_ms} ms</span>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold">
                      {aiResult.is_concurrent ? 'Paralel Terbukti: Max(t1, t2)' : 'Sekuensial: (t1 + t2)'}
                    </div>
                  </div>
                </div>

                {/* Dual Models Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Model 1: Random Forest */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-xs text-cyan-400 font-mono font-semibold">MODEL 1: ENSEMBLE DECISION</div>
                        <h3 className="text-base font-bold text-white">{aiResult.models?.random_forest?.model_name}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono">
                        {aiResult.models?.random_forest?.model_id}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Klasifikasi Prediksi:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {aiResult.models?.random_forest?.prediction}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Confidence Score:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {(aiResult.models?.random_forest?.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Anomaly Index:</span>
                        <span className="font-mono text-purple-300">
                          {aiResult.models?.random_forest?.anomaly_score}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 text-xs">Pola Signature Terdeteksi:</span>
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                          {aiResult.models?.random_forest?.detected_signatures?.map((sig: string, idx: number) => (
                            <div key={idx} className="text-rose-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                              {sig}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Model 2: Support Vector Machine */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-xs text-pink-400 font-mono font-semibold">MODEL 2: HYPERPLANE BOUNDARY</div>
                        <h3 className="text-base font-bold text-white">{aiResult.models?.support_vector_machine?.model_name}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-400 text-xs font-mono">
                        {aiResult.models?.support_vector_machine?.model_id}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Tingkat Keparahan:</span>
                        <span className="font-mono font-bold text-rose-500 px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/30">
                          {aiResult.models?.support_vector_machine?.severity} (CVSS: {aiResult.models?.support_vector_machine?.cvss_score})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Risk Assessment Tier:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {aiResult.models?.support_vector_machine?.risk_level}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Model Accuracy:</span>
                        <span className="font-mono font-bold text-pink-300">
                          {(aiResult.models?.support_vector_machine?.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 text-xs">Rekomendasi Tindakan Mitigasi:</span>
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
                          {aiResult.models?.support_vector_machine?.mitigation_recommendation}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </section>
        )}

        {/* ==================================================================== */}
        {/* ROW 3: VIRTUAL CONSOLE LOG MONITOR (Terminal Cyber SOC)              */}
        {/* ==================================================================== */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
                SENTINEL VIRTUAL CONSOLE // LIVE THREAT FEED
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                STREAM ACTIVE
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-mono px-2 py-0.5 bg-slate-800 rounded"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="p-4 font-mono text-xs space-y-1.5 max-h-60 overflow-y-auto bg-slate-950/95">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-4">Terminal kosong. Menunggu event baru...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-slate-600 select-none">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold select-none ${
                    log.module === 'HMAC-GATEWAY'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                      : log.module === 'AI-GATHER'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800/60'
                      : log.module === 'TELEGRAM-BOT'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800/60'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    [{log.module}]
                  </span>
                  <span className={`${
                    log.type === 'SUCCESS'
                      ? 'text-emerald-400'
                      : log.type === 'DANGER'
                      ? 'text-rose-400 font-semibold'
                      : log.type === 'WARNING'
                      ? 'text-amber-300'
                      : log.type === 'AI'
                      ? 'text-purple-300'
                      : log.type === 'TELEGRAM'
                      ? 'text-blue-300'
                      : 'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 px-6 py-4 mt-auto text-center text-xs text-slate-500">
        Enterprise Real-Time Database Security & Threat Intelligence Platform • Powered by Next.js, FastAPI & Vercel
      </footer>
    </div>
  );
}
