import asyncio
import time
import json
import sys
import os

# Menambahkan root direktori ke sys.path agar modul api dapat di-import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.proses_ai import ThreatAnalysisRequest, proses_ai

async def run_benchmark_and_verification():
    print("=" * 80)
    print(" [BENCHMARK & VERIFIKASI PENGUJIAN KONKURENSI AI: DUAL MODEL RF & SVM] ")
    print("=" * 80)
    
    # 1. Siapkan payload simulasi serangan SQL Injection kritis
    test_payload = "SELECT * FROM users WHERE username = 'admin' OR '1'='1' UNION SELECT credit_card, password FROM secret_vault --"
    request_data = ThreatAnalysisRequest(
        payload=test_payload,
        source_ip="103.247.12.88",
        event_type="DATABASE_INJECTION_ALERT",
        database_table="financial_records"
    )

    print(f"\n[+] Input Payload   : {test_payload[:65]}...")
    print(f"[+] Target Table    : {request_data.database_table}")
    print(f"[+] Source IP       : {request_data.source_ip}\n")

    # --------------------------------------------------------------------------
    # UJI 1: MODE ASYNCHRONOUS CONCURRENCY (WAJIB: asyncio.gather)
    # --------------------------------------------------------------------------
    print(">>> Menjalankan Pengujian 1: Asynchronous Concurrency (asyncio.gather)...")
    start_gather = time.perf_counter()
    response_gather = await proses_ai(request_data, mode="parallel")
    duration_gather_ms = round((time.perf_counter() - start_gather) * 1000, 2)

    # --------------------------------------------------------------------------
    # UJI 2: MODE SEKUENSIAL (Perbandingan: 2x await terpisah)
    # --------------------------------------------------------------------------
    print(">>> Menjalankan Pengujian 2: Sequential Execution (Dua await terpisah)...")
    start_seq = time.perf_counter()
    response_seq = await proses_ai(request_data, mode="sequential")
    duration_seq_ms = round((time.perf_counter() - start_seq) * 1000, 2)

    # --------------------------------------------------------------------------
    # ANALISIS WAKTU EKSEKUSI & PEMBUKTIAN KONKURENSI
    # --------------------------------------------------------------------------
    rf_latency = response_gather["models"]["random_forest"]["latency_ms"]
    svm_latency = response_gather["models"]["support_vector_machine"]["latency_ms"]
    theoretical_max = max(rf_latency, svm_latency)
    theoretical_sum = rf_latency + svm_latency
    efficiency_gain = round(((duration_seq_ms - duration_gather_ms) / duration_seq_ms) * 100, 2)

    print("\n" + "=" * 80)
    print(" TABEL HASIL PENGUJIAN WAKTU EKSEKUSI (BENCHMARK KONKURENSI)")
    print("=" * 80)
    print(f"  • Model 1 (Random Forest) Latency       : {rf_latency:.2f} ms")
    print(f"  • Model 2 (Support Vector Machine) Latency : {svm_latency:.2f} ms")
    print(f"  • Waktu Teoritis jika Sekuensial (Sum)  : {theoretical_sum:.2f} ms")
    print(f"  • Waktu Teoritis jika Paralel (Max)     : {theoretical_max:.2f} ms")
    print("-" * 80)
    print(f"  [>] TOTAL WAKTU EKSEKUSI (asyncio.gather) : {duration_gather_ms:.2f} ms  <-- TERBUKTI PARALEL")
    print(f"  [>] Total Waktu Eksekusi (Sekuensial)     : {duration_seq_ms:.2f} ms")
    print(f"  [>] Penghematan Latensi / Efisiensi       : +{efficiency_gain}% LEBIH CEPAT")
    print("=" * 80)

    # --------------------------------------------------------------------------
    # OUTPUT FORMAT RESPON JSON LENGKAP DUA MODEL (RF & SVM)
    # --------------------------------------------------------------------------
    print("\n[+] RESPON LENGKAP JSON HASIL ANALISIS DUA MODEL (RF & SVM):")
    print(json.dumps(response_gather, indent=2))

    # Assertions pembuktian otomatis
    assert response_gather["is_concurrent"] is True, "Harus menggunakan concurrency"
    assert response_gather["concurrency_engine"] == "asyncio.gather", "Engine harus asyncio.gather"
    assert "random_forest" in response_gather["models"], "Model RF harus ada di respon"
    assert "support_vector_machine" in response_gather["models"], "Model SVM harus ada di respon"
    assert duration_gather_ms < duration_seq_ms, "Eksekusi paralel harus lebih cepat daripada sekuensial"

    print("\n" + "=" * 80)
    print(" [HASIL VERIFIKASI]: SEMUA ASSERTION BERHASIL & TERVALIDASI 100% SUKSES! ")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(run_benchmark_and_verification())
