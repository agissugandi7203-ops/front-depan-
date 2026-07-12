import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, MessageSquare, Shield, Clock, 
  CheckCircle2, XCircle, Activity, Loader2, AlertCircle 
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { citizenService, CitizenReport } from '@/services/api'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  Menunggu:  { color: 'text-amber-400',  bg: 'bg-amber-950/40 border border-amber-900/30',  dot: 'bg-amber-500',  icon: Clock },
  Diproses:  { color: 'text-blue-400',   bg: 'bg-blue-950/40 border border-blue-900/30',    dot: 'bg-blue-500',   icon: Activity },
  Selesai:   { color: 'text-emerald-400',bg: 'bg-emerald-950/40 border border-emerald-900/30', dot: 'bg-emerald-500', icon: CheckCircle2 },
  Ditolak:   { color: 'text-rose-400',    bg: 'bg-rose-950/40 border border-rose-900/30',       dot: 'bg-rose-500',    icon: XCircle },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  darurat:    'Darurat',
  layanan:    'Layanan Publik',
  hoaks:      'Hoaks/Misinformasi',
  infrastruktur: 'Infrastruktur',
  sosial:     'Sosial',
  lainnya:    'Lainnya',
}

export function ChatUser() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [reports, setReports] = useState<CitizenReport[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Use user's email, phone, or local guest contact
        const contact = user?.email || user?.nomor_telepon || localStorage.getItem('komunitas_guest_contact') || ''
        if (!contact) {
          setError('Kontak tidak ditemukan. Silakan login atau buat laporan terlebih dahulu.')
          return
        }

        const res = await citizenService.getReports(contact)
        if (res && res.reports) {
          // STRICT CLIENT-SIDE SESSION FILTERING: Ensure reports only match logged-in user credentials or active guest contact
          const filtered = res.reports.filter(report => {
            const rContact = report.reporter_contact?.trim().toLowerCase() || ''
            const userEmail = user?.email?.trim().toLowerCase() || ''
            const userPhone = user?.nomor_telepon?.trim() || ''
            const guestContact = localStorage.getItem('komunitas_guest_contact')?.trim().toLowerCase() || ''
            
            if (user) {
              return (userEmail && rContact === userEmail) || (userPhone && rContact === userPhone)
            }
            return guestContact && rContact === guestContact
          })

          setReports(filtered)
          if (filtered.length > 0) {
            setSelectedReportId(filtered[0].id)
          } else {
            setSelectedReportId(null)
          }
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat laporan pengaduan Anda.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserReports()
  }, [user])

  const selectedReport = reports.find(r => r.id === selectedReportId)

  return (
    <div className="flex flex-col fixed inset-0 h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b border-zinc-900 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h1 className="text-sm font-bold uppercase tracking-wider">Konsultasi Petugas</h1>
          </div>
        </div>
        <span className="text-[10px] text-indigo-400 font-bold uppercase bg-indigo-950/40 border border-indigo-850 px-2 py-0.5 rounded-full">
          Warga Portal
        </span>
      </header>

      {/* Main Layout Area */}
      <div className="flex-grow flex overflow-hidden min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            <span className="text-xs font-semibold tracking-wider uppercase">Memuat Laporan...</span>
          </div>
        ) : error ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
            <p className="text-sm font-semibold text-zinc-300">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4 border-zinc-800 hover:bg-zinc-900 text-xs"
              onClick={() => navigate('/')}
            >
              Kembali ke Beranda
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
            <MessageSquare className="w-12 h-12 text-zinc-700 mb-4 animate-bounce" />
            <h3 className="text-sm font-bold text-zinc-300">Belum Ada Pengaduan</h3>
            <p className="text-xs text-zinc-500 leading-relaxed mt-1">
              Anda belum memiliki laporan pengaduan aktif. Silakan kirim pengaduan melalui fitur chat AI di halaman utama.
            </p>
            <Button 
              className="mt-4 bg-zinc-100 hover:bg-white text-zinc-950 text-xs shadow font-semibold"
              onClick={() => navigate('/chat')}
            >
              Buat Pengaduan Baru
            </Button>
          </div>
        ) : (
          <>
            {/* Sidebar list of reports */}
            <aside className="w-full md:w-80 border-r border-zinc-900 bg-zinc-900/10 flex flex-col shrink-0 overflow-y-auto p-4 space-y-3 min-w-0">
              <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold px-1 mb-1">
                Daftar Pengaduan Anda ({reports.length})
              </h2>
              {reports.map((r) => {
                const isSelected = r.id === selectedReportId
                const statusCfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Menunggu
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReportId(r.id)}
                    className={cn(
                      "text-left p-3.5 rounded-xl border transition-all duration-150 relative overflow-hidden flex flex-col gap-2.5 active:scale-[0.98]",
                      isSelected 
                        ? "bg-zinc-900 border-zinc-800 ring-1 ring-zinc-800" 
                        : "bg-transparent border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-zinc-200 truncate">{CATEGORY_LABELS[r.category] || r.category}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                        statusCfg.bg, statusCfg.color
                      )}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {r.description.replace(/^\[📍 LOKASI GPS KOORDINAT:[^\]]+\]\s*/, '')}
                    </p>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-850/60 text-[9px] text-zinc-600 font-mono">
                      <span>{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      <span className="truncate max-w-[100px]">{r.id.substring(0, 8)}...</span>
                    </div>
                  </button>
                )
              })}
            </aside>

            {/* Chat Room Area */}
            <main className="hidden md:flex flex-grow flex-col bg-zinc-950 p-4">
              {selectedReportId ? (
                <div className="flex-grow flex flex-col min-h-0">
                  <div className="mb-3 px-1">
                    <h2 className="text-xs font-bold text-zinc-300">
                      Pengaduan: {CATEGORY_LABELS[selectedReport?.category || ''] || selectedReport?.category}
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ID Laporan: {selectedReportId}</p>
                  </div>
                  <ChatWidget reportId={selectedReportId} className="flex-grow" />
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-zinc-600">
                  <MessageSquare className="w-8 h-8 text-zinc-850 mb-2" />
                  <span className="text-xs font-medium uppercase tracking-wider">Pilih pengaduan untuk memulai chat</span>
                </div>
              )}
            </main>
            
            {/* Mobile View overlay for single open report */}
            <AnimatePresence>
              {selectedReportId && (
                <motion.div 
                  className="md:hidden fixed inset-0 z-40 bg-zinc-950 flex flex-col"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <header className="flex h-14 items-center gap-3 px-4 border-b border-zinc-900 bg-zinc-900/40 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md"
                      onClick={() => setSelectedReportId(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                      <h1 className="text-xs font-bold text-zinc-100 truncate">
                        {CATEGORY_LABELS[selectedReport?.category || ''] || selectedReport?.category}
                      </h1>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate">{selectedReportId}</p>
                    </div>
                  </header>
                  <div className="flex-grow p-4 min-h-0 flex flex-col">
                    <ChatWidget reportId={selectedReportId} className="flex-grow" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

export default ChatUser
