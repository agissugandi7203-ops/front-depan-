import axios, { AxiosError } from 'axios'
import { 
  ChatRequest, 
  ChatResponse, 
  ClaimValidationRequest, 
  ClaimValidationResponse,
  SummaryRequest,
  SummaryResponse,
  HistoryResponse,
  ApiError,
  CitizenReportRequest,
  CitizenReportResponse
} from '@/types'

import { API_BASE_URL } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for AI responses
})

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('komunitas_access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Automatically log out user if token is invalid or expired
      useAuthStore.getState().logout()
    }
    const message = error.response?.data?.error || error.message || 'Terjadi kesalahan pada server'
    return Promise.reject(new Error(message))
  }
)

// High-quality fallback mock data in case backend is offline
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const MOCK_ANSWERS = [
  {
    keywords: ['anak', 'kpai', 'kekerasan', 'bullying', 'perundungan', 'perlindungan'],
    content: `Saya sangat memahami kekhawatiran Anda mengenai keselamatan dan hak anak. Di Indonesia, **Komisi Perlindungan Anak Indonesia (KPAI)** bekerja sama dengan **Kementerian Pemberdayaan Perempuan dan Perlindungan Anak (KPPPA)** menyediakan kanal aduan resmi.

Berikut adalah langkah-langkah yang dianjurkan untuk melaporkan atau mendapatkan bantuan terkait kasus kekerasan anak:
1. **Identifikasi Kejadian**: Catat tanggal, lokasi, kronologi singkat, dan identitas terduga pelaku (jika diketahui).
2. **Kumpulkan Bukti**: Amankan tangkapan layar, foto, video, atau dokumen lain yang relevan secara hati-hati tanpa melanggar privasi korban.
3. **Pemberian Pendampingan Psikologis**: Prioritaskan kesehatan mental anak terlebih dahulu sebelum melakukan aduan hukum yang mendalam.
4. **Lapor Resmi**: Hubungi Call Center SAPA 129 atau datangi Polres bagian PPA (Pelayanan Perempuan dan Anak) terdekat.`
  },
  {
    keywords: ['bencana', 'gempa', 'banjir', 'pmi', 'darurat', 'ambulans', 'darah'],
    content: `Dalam situasi darurat bencana alam, kecelakaan, atau kebutuhan donor darah, **Palang Merah Indonesia (PMI)** dan **Badan Nasional Penanggulangan Bencana (BNPB)** adalah lembaga utama yang dapat dihubungi. 

Jika Anda atau warga sekitar sedang menghadapi bencana alam:
1. **Evakuasi Mandiri**: Segera menuju ke titik kumpul aman yang ditentukan oleh RT/RW setempat.
2. **Koneksi Darurat**: Hubungi nomor ambulans atau call center penanggulangan bencana terdekat.
3. **Persiapkan Tas Siaga Bencana (TSB)**: Isi dengan surat penting, obat-obatan pribadi, pakaian hangat, dan persediaan air minum/makanan instan.
4. **Hindari Berita Simpang Siur**: Dapatkan update situasi resmi dari BMKG atau BNPB, jangan percaya hoaks yang beredar di grup obrolan.`
  },
  {
    keywords: ['ham', 'komnas', 'diskriminasi', 'hak asasi', 'polisi', 'intimidasi'],
    content: `Jika Anda atau orang terdekat mengalami pelanggaran hak asasi manusia, diskriminasi ras/gender/agama, intimidasi dari pihak berwenang, atau kriminalisasi yang tidak sah, Anda berhak melapor ke **Komisi Nasional Hak Asasi Manusia (Komnas HAM)**.

Langkah pengaduan pelanggaran HAM:
1. **Uraikan Kronologi**: Tulis kejadian secara berurutan beserta dasar klaim pelanggaran HAM yang diderita.
2. **Identifikasi Pihak**: Sebutkan korban, terduga pelaku (misal institusi negara atau swasta), serta saksi-saksi kunci.
3. **Lampirkan Berkas Pendukung**: Fotokopi KTP pelapor, laporan medis/visum (jika ada kekerasan fisik), surat penahanan, atau dokumen terkait.
4. **Kirim Pengaduan**: Melalui pos, email aduan@komnasham.go.id, atau sistem pengaduan online resmi.`
  },
  {
    keywords: ['bansos', 'bantuan sosial', 'pkh', 'dtks', 'kip', 'pemerintah', 'daftar'],
    content: `Untuk memeriksa status kepesertaan bantuan sosial dari pemerintah (seperti PKH, BPNT, KIP, atau KIS), Kementerian Sosial telah menyediakan portal **DTKS (Data Terpadu Kesejahteraan Sosial)** yang dapat diakses secara transparan.

Prosedur resmi untuk mendaftar atau mengecek bantuan sosial:
1. **Cek Kepesertaan**: Kunjungi situs resmi cekbansos.kemensos.go.id dan masukkan nama sesuai KTP serta wilayah administratif Anda.
2. **Syarat Pendaftaran Baru**: Wajib terdaftar di DTKS. Proses pendaftaran diusulkan melalui Musyawarah Desa/Kelurahan (Musdes/Muskel) di balai desa/kantor kelurahan setempat.
3. **Siapkan Dokumen**: Bawa Kartu Keluarga (KK) asli, KTP asli, dan Surat Keterangan Tidak Mampu (SKTM) jika diminta.
4. **Waspadai Modus Penipuan**: Pemerintah **tidak pernah** membagikan tautan formulir pendaftaran bansos melalui pesan WhatsApp, Telegram, atau Facebook. Gunakan hanya aplikasi resmi "Cek Bansos" Kemensos RI.`
  }
]

export const chatService = {
  /**
   * Kirim pesan chat ke AI
   */
  sendMessage: async (message: string, sessionId?: string, history?: any[], image?: string, mimeType?: string) => {
    try {
      const request: ChatRequest = { message, sessionId, history, image, mimeType }
      const response = await api.post<ChatResponse>('/api/chat', request)
      return response.data
    } catch (error) {
      console.warn('Axios backend request failed. Falling back to frontend mock service...', error)
      await delay(1200)

      const lowercaseMsg = message.toLowerCase()
      let reply = `Halo! Saya asisten AI **KOMUNITAS**, portal verifikasi informasi dan aduan publik terpercaya.

Saya mendeteksi pertanyaan Anda berkaitan dengan informasi umum. Untuk memberikan panduan yang valid:
1. **Lembaga Terkait**: Sebutkan lembaga atau instansi yang ingin Anda tuju (misalnya: PMI, KPAI, Komnas HAM, atau Kementerian Sosial).
2. **Kebutuhan Spesifik**: Deskripsikan apakah Anda membutuhkan panduan darurat, informasi bansos, prosedur hukum, atau verifikasi berita.

*Tips: Anda juga bisa menyalin teks berita/rumor di menu dashboard "Cek Validitas Hoaks" untuk memverifikasi kebenaran informasi.*`

      for (const item of MOCK_ANSWERS) {
        if (item.keywords.some(kw => lowercaseMsg.includes(kw))) {
          reply = item.content
          break
        }
      }

      return {
        content: reply,
        timestamp: new Date().toISOString(),
        sessionId: sessionId || 'mock-session-id'
      }
    }
  },

  /**
   * Kirim Laporan Aduan Warga Baru
   * Jika backend gagal, error NYATA akan dilempar ke UI — tidak ada fallback palsu.
   */
  createReport: async (reportData: CitizenReportRequest) => {
    const response = await api.post<CitizenReportResponse>('/api/reports', reportData)
    return response.data
  },

  /**
   * Unggah Gambar Dokumen untuk OCR
   * Jika backend gagal, error NYATA akan dilempar ke UI.
   */
  uploadOcrImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ text: string }>('/api/chat/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Verifikasi klaim
   * Jika backend gagal, error NYATA akan dilempar ke UI.
   */
  validateClaim: async (claim: string, image?: string, mimeType?: string) => {
    const request: ClaimValidationRequest = { claim, image, mimeType }
    const response = await api.post<ClaimValidationResponse>('/api/chat/validate', request)
    return response.data
  },

  /**
   * Mengekstrak teks dari berkas dokumen (PDF, DOCX, XLSX, TXT, MD)
   */
  extractFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ text: string, name: string, size: number, type: string }>('/api/chat/extract-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Ringkas dokumen
   * Jika backend gagal, error NYATA akan dilempar ke UI.
   */
  summarizeDocument: async (text: string) => {
    const request: SummaryRequest = { text }
    const response = await api.post<SummaryResponse>('/api/chat/summarize', request)
    return response.data
  },

  /**
   * Ambil riwayat chat
   */
  getHistory: async (sessionId: string) => {
    const response = await api.get<HistoryResponse>(`/api/chat/history/${sessionId}`)
    return response.data
  },

  /**
   * Hapus riwayat chat
   */
  deleteHistory: async (sessionId: string) => {
    const response = await api.delete(`/api/chat/history/${sessionId}`)
    return response.data
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    const response = await api.get('/health')
    return response.data
  },

  /**
   * Ambil daftar obrolan aktif (admin)
   */
  getActiveChats: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/chat/active')
    return response.data
  },
}

// ─── Admin Service ─────────────────────────────────────────────────────────────

export interface CitizenReport {
  id: string
  reporter_name: string
  reporter_contact: string
  category: string
  description: string
  status: 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak'
  session_id?: string
  admin_note?: string
  latitude?: number
  longitude?: number
  image_url?: string
  province?: string
  city?: string
  district?: string
  created_at: string
  updated_at: string
}

export interface ReportsResponse {
  reports: CitizenReport[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  totalReports: number
  totalSessions: number
  totalClaims: number
  totalSummaries: number
  statusCounts: {
    Menunggu: number
    Diproses: number
    Selesai: number
    Ditolak: number
  }
  urgencyCounts?: {
    Kritis: number
    Tinggi: number
    Sedang: number
    Rendah: number
  }
  timestamp: string
}

export interface PublicService {
  id: string
  name: string
  institution: string
  category: string
  description: string
  requirements: string[]
  procedures: string[]
  contactPhone?: string
  contactEmail?: string
  address?: string
  website?: string
  createdAt?: string
}

export interface ClaimVerification {
  id: string
  claim_text: string
  is_credible: boolean
  confidence_score: number
  reasoning: string
  sources: string[]
  category: string
  search_count: number
  created_at: string
  updated_at: string
}

export interface DocumentSummary {
  id: string
  original_hash: string
  original_text: string
  summary: string
  key_points: string[]
  created_at: string
}

export interface RAGDocument {
  id: string
  filename: string
  file_size: number
  file_type: string
  file_path?: string
  created_at: string
}

export interface ChatHistorySession {
  session_id: string
  messages: { role: string; content: any }[]
  created_at: string
  updated_at: string
}

export const adminService = {
  /**
   * Ambil semua laporan aduan (admin)
   */
  getReports: async (status?: string, page = 1, limit = 20, province?: string, city?: string, district?: string): Promise<ReportsResponse> => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (province && province !== 'all') params.set('province', province)
    if (city && city !== 'all') params.set('city', city)
    if (district && district !== 'all') params.set('district', district)
    params.set('page', String(page))
    params.set('limit', String(limit))
    const response = await api.get<ReportsResponse>(`/api/reports?${params.toString()}`)
    return response.data
  },

  /**
   * Update status laporan (admin)
   */
  updateReportStatus: async (id: string, status: string, adminNote?: string) => {
    const response = await api.patch(`/api/reports/${id}`, { status, adminNote })
    return response.data
  },

  /**
   * Ambil statistik dashboard admin
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/api/admin/stats')
    return response.data
  },

  /**
   * Ambil statistik sebaran wilayah aduan
   */
  getReportsStatistics: async (): Promise<any> => {
    const response = await api.get('/api/reports/statistics')
    return response.data
  },

  /**
   * Ambil semua layanan publik (RAG)
   */
  getServices: async (category?: string): Promise<{ services: PublicService[] }> => {
    const url = category && category !== 'all' ? `/api/services?category=${category}` : '/api/services'
    const response = await api.get<{ services: PublicService[] }>(url)
    return response.data
  },

  /**
   * Tambah layanan publik baru (RAG)
   */
  createService: async (serviceData: Omit<PublicService, 'id' | 'createdAt'>): Promise<{ id: string; message: string }> => {
    const response = await api.post<{ id: string; message: string }>('/api/services', serviceData)
    return response.data
  },

  /**
   * Menganalisis dokumen panduan layanan menggunakan AI
   */
  parseServiceDocument: async (text: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.post<{ success: boolean; data: any }>('/api/services/parse-doc', { text })
    return response.data
  },

  /**
   * Hapus layanan publik (RAG)
   */
  deleteService: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/services/${id}`)
    return response.data
  },

  /**
   * Ambil semua dokumen RAG
   */
  getRAGDocuments: async (): Promise<{ success: boolean; data: RAGDocument[] }> => {
    const response = await api.get<{ success: boolean; data: RAGDocument[] }>('/api/services/documents')
    return response.data
  },

  /**
   * Tambah data metadata dokumen RAG baru
   */
  createRAGDocument: async (docData: { filename: string; file_size: number; file_type: string; file_path?: string }): Promise<{ success: boolean; data: RAGDocument }> => {
    const response = await api.post<{ success: boolean; data: RAGDocument }>('/api/services/documents', docData)
    return response.data
  },

  /**
   * Hapus dokumen RAG
   */
  deleteRAGDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/services/documents/${id}`)
    return response.data
  },

  /**
   * Ambil semua verifikasi klaim hoaks (admin)
   */
  getClaims: async (page = 1, limit = 20): Promise<{ claims: ClaimVerification[]; total: number; totalPages: number }> => {
    const response = await api.get<{ claims: ClaimVerification[]; total: number; totalPages: number }>(`/api/claims?page=${page}&limit=${limit}`)
    return response.data
  },

  /**
   * Hapus verifikasi klaim hoaks (admin)
   */
  deleteClaim: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/claims/${id}`)
    return response.data
  },

  /**
   * Ambil semua ringkasan dokumen (admin)
   */
  getSummaries: async (page = 1, limit = 20): Promise<{ summaries: DocumentSummary[]; total: number; totalPages: number }> => {
    const response = await api.get<{ summaries: DocumentSummary[]; total: number; totalPages: number }>(`/api/summaries?page=${page}&limit=${limit}`)
    return response.data
  },

  /**
   * Hapus ringkasan dokumen (admin)
   */
  deleteSummary: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/summaries/${id}`)
    return response.data
  },

  /**
   * Ambil semua riwayat sesi chat warga (admin)
   */
  getChatHistories: async (page = 1, limit = 20): Promise<{ histories: ChatHistorySession[]; total: number; totalPages: number }> => {
    const response = await api.get<{ histories: ChatHistorySession[]; total: number; totalPages: number }>(`/api/histories?page=${page}&limit=${limit}`)
    return response.data
  },

  /**
   * Hapus riwayat sesi chat warga (admin)
   */
  deleteChatHistory: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/histories/${sessionId}`)
    return response.data
  },

  /**
   * Buat user staff baru (admin/superadmin)
   */
  createStaffUser: async (staffData: any): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/admin/create-user', staffData)
    return response.data
  },

  /**
   * Ambil daftar akun staf (admin/superadmin)
   */
  getStaffUsers: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/admin/staff')
    return response.data
  },

  /**
   * Ambil database kata kunci hoaks WhatsApp (admin/superadmin)
   */
  getHoaxes: async (search?: string, page = 1, limit = 50): Promise<{ hoaxes: any[]; total: number; page: number; totalPages: number; usingFallback: boolean }> => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', String(page))
    params.set('limit', String(limit))
    const response = await api.get<{ hoaxes: any[]; total: number; page: number; totalPages: number; usingFallback: boolean }>(`/api/admin/hoax?${params.toString()}`)
    return response.data
  },

  /**
   * Buat entri kata kunci hoaks baru (admin/superadmin)
   */
  createHoax: async (hoaxData: any): Promise<{ hoax: any; message: string }> => {
    const response = await api.post<{ hoax: any; message: string }>('/api/admin/hoax', hoaxData)
    return response.data
  },

  /**
   * Update entri kata kunci hoaks (admin/superadmin)
   */
  updateHoax: async (id: string, hoaxData: any): Promise<{ hoax: any; message: string }> => {
    const response = await api.put<{ hoax: any; message: string }>(`/api/admin/hoax/${id}`, hoaxData)
    return response.data
  },

  /**
   * Hapus entri kata kunci hoaks (admin/superadmin)
   */
  deleteHoax: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/admin/hoax/${id}`)
    return response.data
  },

  /**
   * Ambil daftar obrolan aktif (admin)
   */
  getActiveChats: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/chat/active')
    return response.data
  },
}



// ─── Citizen Service ────────────────────────────────────────────────────────────

export const citizenService = {
  getReports: async (contact: string, page = 1, limit = 10): Promise<ReportsResponse> => {
    const response = await api.get<ReportsResponse>(`/api/reports?contact=${encodeURIComponent(contact)}&page=${page}&limit=${limit}`)
    return response.data
  }
}

export default api
