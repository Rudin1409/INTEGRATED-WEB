import os
from generate_full_report_docx import generate_full_report

if __name__ == '__main__':
    # Simpan ke LAPORAN_AKHIR_SISTEM_KEAMANAN.docx agar tidak terbentur lock file saat Word sedang dibuka
    target = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'LAPORAN_AKHIR_SISTEM_KEAMANAN.docx'))
    generate_full_report(target)
