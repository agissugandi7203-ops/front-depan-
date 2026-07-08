# 🇮🇩 KOMUNITAS — Portal Layanan Informasi Publik & Pelaporan Warga

> **Frontend Application Client**  
> Asisten AI Cerdas untuk Validasi Berita (Cek Fakta), Peta Live Pelaporan Aduan, dan Ringkasan Regulasi Birokrasi Indonesia.

---

## 🌟 Fitur Utama (Core Features)

1. **🔍 AI Fact-Checker (Cek Hoaks)**
   - Antarmuka interaktif untuk memvalidasi klaim berita secara real-time.
   - Visualisasi persentase keyakinan (Confidence Score) berbasis AI dengan animasi halus (`framer-motion`).
   - Pencantuman link referensi sumber berita terpercaya untuk mendukung transparansi data.

2. **📋 RAG Document Summarizer (Ringkas Regulasi)**
   - Fitur unggah berkas panduan birokrasi (PDF/Word/Excel) yang panjang dan membosankan.
   - Ekstraksi AI menjadi ringkasan poin-poin penting, persyaratan dokumen wajib, dan kontak instansi terkait.
   - **Bagan Alir Interaktif**: Kode Mermaid.js otomatis dirender menjadi diagram alir SVG birokrasi yang responsif.

3. **🗺️ Live Map & Laporan Warga (SSE Real-time)**
   - Halaman pelaporan warga dengan validasi NIK otomatis dan pelampiran koordinat GPS (peta interaktif Leaflet).
   - Berlangganan ke Server-Sent Events (SSE) / WebSocket untuk menampilkan notifikasi toast instan saat status aduan diperbarui oleh petugas.
   - Penyaringan regional berjenjang (*Cascading Dropdown*) dari Provinsi -> Kabupaten/Kota -> Kecamatan.

4. **💼 Admin Portal (Direktori RAG & Management)**
   - Dashboard analitik dengan statistik penggunaan AI yang interaktif.
   - Pengelolaan direktori pengetahuan RAG (menambah, menghapus, atau mengunggah PDF panduan).
   - Ekspor data laporan warga terfilter langsung ke format file CSV dengan encoding UTF-8 (BOM) agar terbaca rapi di Microsoft Excel.
   - Manajemen akun staf petugas dan admin.

---

## 🛠️ Teknologi & Libs (Tech Stack)

- **Core**: React 18, TypeScript, Vite (Next-Gen Bundler)
- **Styling**: TailwindCSS (Utility-First CSS), Vanilla CSS Variables
- **Animations**: Framer Motion (Fluid transitions & Micro-animations)
- **Icons**: Lucide React
- **Diagrams**: Mermaid.js (SVG Flowchart Renderer)
- **Maps**: Leaflet (OpenStreetMap integration)
- **State/Routing**: React Router DOM, Zustand (Minimalist State Management)

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
Pastikan Anda telah menginstal **Node.js (v18+)** dan **npm** di komputer Anda.

### 2. Klon Repositori & Install Dependencies
```bash
git clone https://github.com/agissugandi7203-ops/front-depan-.git
cd front-depan-
npm install
```

### 3. Konfigurasi Variabel Lingkungan
Buat berkas `.env` di root folder proyek dan sesuaikan nilainya:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=KOMUNITAS
VITE_APP_DESCRIPTION=Asisten AI untuk Warga Indonesia

# Supabase Auth configuration (Samakan dengan Backend)
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Jalankan Development Server
```bash
npm run dev
```
Aplikasi akan berjalan di [http://localhost:5173](http://localhost:5173).

---

## 🐋 Deploy ke Production (Google Cloud Run)

Repositori ini telah dikonfigurasi dengan `Dockerfile` multi-stage dan `nginx.conf.template` untuk deploy otomatis menggunakan Google Cloud Run via GitHub Cloud Build.

### Proses Build & Deploy
Gunakan perintah berikut untuk build image Docker Anda (ganti variabel argumen dengan URL backend produksi Anda):

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://your-backend-api-url.a.run.app \
  --build-arg VITE_SUPABASE_URL=https://your-supabase-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key-here \
  -t gcr.io/your-gcp-project/komunitas-frontend:latest .
```

### Konfigurasi Nginx di Cloud Run
Dockerfile menggunakan template server Nginx yang secara otomatis:
1. Mendukung pemetaan port internal Nginx ke port dinamis `$PORT` yang diinjeksikan oleh Google Cloud Run menggunakan `envsubst`.
2. Menyediakan rute fallback `try_files $uri $uri/ /index.html` untuk memastikan rute Single Page Application (SPA) tetap berjalan saat di-refresh.
