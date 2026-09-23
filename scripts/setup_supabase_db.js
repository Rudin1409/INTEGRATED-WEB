import pg from 'pg';
const { Client } = pg;

const password = process.env.SUPABASE_DB_PASSWORD || 'HLDlJXR1ouSQkZ3a';
const projectRef = 'luocftgfmcwlentsmtyo';

// Coba beberapa host umum Supabase direct dan session pooler
const hostsToTry = [
  `db.${projectRef}.supabase.co`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`
];

async function runMigration() {
  console.log("Menghubungkan ke PostgreSQL Supabase...");

  for (const host of hostsToTry) {
    const isPooler = host.includes('pooler');
    const user = isPooler ? `postgres.${projectRef}` : 'postgres';
    const port = isPooler ? 6543 : 5432;

    const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`;

    console.log(`Mencoba host: ${host} (port ${port})...`);
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();
      console.log(`[+] Terhubung dengan sukses ke host ${host}!`);

      // 1. Buat tabel threat_logs
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS public.threat_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          status_kejadian TEXT DEFAULT 'Bahaya',
          level_ancaman TEXT DEFAULT 'CRITICAL',
          detail_pesan TEXT NOT NULL,
          source_ip TEXT DEFAULT '185.220.101.5',
          database_table TEXT DEFAULT 'users',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      await client.query(createTableSql);
      console.log("[+] Tabel 'public.threat_logs' berhasil dibuat / diverifikasi!");

      // 2. Beri izin akses anon & authenticated
      await client.query(`
        GRANT ALL ON public.threat_logs TO anon, authenticated, service_role;
      `);
      console.log("[+] Izin (GRANT ALL) pada tabel threat_logs berhasil disetel!");

      // 3. Masukkan 1 baris sample log ancaman awal
      const insertSql = `
        INSERT INTO public.threat_logs (status_kejadian, level_ancaman, detail_pesan, source_ip, database_table)
        VALUES (
          'Bahaya',
          'CRITICAL',
          'Simulasi serangan SQL Injection via Supabase Table: SELECT * FROM users WHERE is_admin=1 --',
          '185.220.101.5',
          'users'
        ) RETURNING id, status_kejadian, detail_pesan, created_at;
      `;
      const res = await client.query(insertSql);
      console.log("[+] Berhasil menyisipkan data ancaman awal ke Supabase:", res.rows[0]);

      await client.end();
      return true;
    } catch (err) {
      console.log(`[-] Gagal pada host ${host}: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }

  return false;
}

runMigration().then(success => {
  if (success) {
    console.log("\n>>> FULL SETUP SUPABASE DATABASE SELESAI & SUKSES! <<<\n");
    process.exit(0);
  } else {
    console.log("\n[-] Tidak dapat koneksi direct port postgres. Menyiapkan panduan SQL Editor.\n");
    process.exit(1);
  }
});
