import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Shield,
  FileText,
  BookOpen,
  HelpCircle,
  Scale,
  ChevronDown,
  MessageSquare,
  Camera,
  ArrowRight,
  Sparkles,
  Compass,
  CheckCircle2,
  Lock,
  Eye,
  Info,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { useToast } from '@/components/ui/toast'
import Footer4Col from '@/components/ui/footer-column'

// Tabs definitions
const tabs = [
  { id: 'visi', label: 'Visi & Misi', icon: Target },
  { id: 'panduan', label: 'Panduan Pengguna', icon: BookOpen },
  { id: 'faq', label: 'Tanya Jawab', icon: HelpCircle },
  { id: 'kebijakan', label: 'Kebijakan Privasi', icon: Shield },
  { id: 'syarat', label: 'Syarat Layanan', icon: Scale },
]

// Guide steps content
const guideSteps = [
  {
    icon: MessageSquare,
    title: 'Konsultasi Asisten AI',
    description: 'Buka halaman obrolan utama untuk menanyakan informasi birokrasi, hukum, bantuan sosial, atau administrasi daerah.',
    tips: [
      'Gunakan bahasa sehari-hari yang mudah dipahami',
      'Sebutkan nama daerah Anda agar AI memberikan jawaban lebih spesifik',
      'Asisten AI aktif selama 24 jam penuh setiap hari'
    ]
  },
  {
    icon: Shield,
    title: 'Verifikasi Kebenaran Berita',
    description: 'Gunakan alat cek hoaks di halaman depan untuk memeriksa kebenaran pesan berantai WhatsApp atau klaim berita yang beredar.',
    tips: [
      'Salin teks berita mencurigakan secara utuh',
      'Sistem mencocokkan informasi dengan basis data rujukan resmi',
      'Hindari menyebarkan berita yang belum terverifikasi kebenarannya'
    ]
  },
  {
    icon: FileText,
    title: 'Meringkas Dokumen Birokrasi',
    description: 'Punya dokumen peraturan daerah atau instruksi kerja yang panjang? Tempel teks ke modul ringkasan untuk memotong kata yang bertele-tele.',
    tips: [
      'Masukkan dokumen penting yang ingin Anda pelajari poin pentingnya',
      'Sistem akan merender diagram alir jika dokumen memuat alur proses',
      'Menghemat waktu membaca hingga 90% dibanding membaca manual'
    ]
  },
  {
    icon: Camera,
    title: 'Kirim Laporan Aduan',
    description: 'Laporkan masalah sarana publik di lingkungan sekitar Anda secara resmi untuk diteruskan ke instansi terkait.',
    tips: [
      'Nyalakan izin lokasi GPS di browser Anda agar koordinat terdeteksi otomatis',
      'Ambil foto atau unggah gambar sebagai bukti visual aduan',
      'Tulis deskripsi kronologi kejadian dengan singkat dan jelas'
    ]
  }
]

// FAQ content
const faqs = [
  {
    q: 'Bagaimana cara menggunakan layanan KOMUNITAS?',
    a: 'Semua fitur di platform ini disediakan gratis untuk warga Indonesia. Anda bisa langsung menggunakan alat verifikasi di halaman utama atau masuk ke halaman obrolan untuk mulai bertanya kepada asisten AI.'
  },
  {
    q: 'Apakah data laporan aduan saya aman?',
    a: 'Ya. Seluruh data pribadi Anda, termasuk nomor telepon, foto lampiran aduan, dan titik lokasi GPS dilindungi dengan sistem enkripsi aman dan hanya dapat diakses oleh administrator resmi dari instansi terkait.'
  },
  {
    q: 'Mengapa saya wajib mengaktifkan GPS saat mengirimkan aduan?',
    a: 'Lokasi koordinat GPS diperlukan agar tim penanganan reaksi cepat di lapangan dapat mengetahui lokasi persis sarana fisik yang rusak atau tempat kejadian laporan tanpa terjadi kekeliruan lokasi.'
  },
  {
    q: 'Apakah jawaban dari asisten AI selalu akurat?',
    a: 'Asisten AI kami merujuk pada basis data informasi resmi instansi pemerintah. Namun, jawaban AI sebaiknya digunakan sebagai panduan awal. Untuk keputusan hukum atau administratif penting, kami menyarankan tetap melakukan konfirmasi ke instansi terkait.'
  },
  {
    q: 'Apakah diagram alir ringkasan dokumen dapat disimpan?',
    a: 'Diagram alir Mermaid.js dirender dalam format gambar SVG interaktif. Anda dapat mengambil tangkapan layar (screenshot) untuk dilampirkan pada materi presentasi atau laporan kerja Anda.'
  }
]

// FAQ Accordion Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border border-zinc-900 bg-zinc-950/20 rounded-xl p-1 overflow-hidden transition-all duration-300 hover:border-zinc-800/80 hover:bg-zinc-950/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left p-4 text-[13.5px] font-medium text-zinc-200 hover:text-white transition-colors duration-200 cursor-pointer"
      >
        <span className="pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="shrink-0 p-1 rounded-md bg-zinc-900 border border-zinc-800"
        >
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 pt-1 text-[12.5px] text-zinc-400 leading-relaxed font-light border-t border-zinc-900/50 mt-1">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AboutPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState('visi')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { createSession, setCurrentSession } = useChatStore()
  
  const { isAuthenticated, user, logout, checkMe } = useAuthStore()
  const { openModal } = useAuthModalStore()
  const { toast } = useToast()

  useEffect(() => {
    if (isAuthenticated && !user) {
      checkMe().catch(err => console.error('Sesi gagal dimuat:', err))
    }
  }, [isAuthenticated, user, checkMe])

  useEffect(() => {
    if (tabParam && ['visi', 'panduan', 'faq', 'kebijakan', 'syarat'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    setSearchParams({ tab: id })
  }

  const handleStartChat = () => {
    const id = createSession()
    setCurrentSession(id)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-x-hidden">
      
      {/* Background decoration grid and ambient radial light */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0e_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* ── Header / Navbar ── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 h-[60px] px-6 md:px-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
      >
        {/* Brand logo & name */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 select-none cursor-pointer group"
        >
          <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-7 w-7 object-contain rounded-md transition-opacity group-hover:opacity-85" />
          <span className="font-semibold text-[15px] tracking-[-0.02em] text-zinc-100">KOMUNITAS</span>
        </div>

        {/* Navigation links */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-7">
          <button
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors tracking-[-0.01em] cursor-pointer"
            onClick={() => {
              navigate('/')
              setTimeout(() => {
                document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }}
          >
            Layanan
          </button>
          <button
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors tracking-[-0.01em] cursor-pointer"
            onClick={() => {
              navigate('/')
              setTimeout(() => {
                document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }}
          >
            Verifikasi
          </button>
          <button
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors tracking-[-0.01em] cursor-pointer"
            onClick={() => navigate('/all-reports')}
          >
            Semua Aduan
          </button>
          <button
            className="text-[13px] text-zinc-100 font-semibold transition-colors tracking-[-0.01em] cursor-pointer"
            onClick={() => handleTabChange('visi')}
          >
            Tentang
          </button>
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* User profile info */}
              <div 
                onClick={() => navigate('/profile')}
                className="hidden md:flex flex-col items-end text-right select-none cursor-pointer hover:opacity-80 transition"
              >
                <span className="text-[12px] font-bold tracking-tight text-zinc-100">
                  {user.nama_panggilan || user.nama_lengkap}
                </span>
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold tracking-wider leading-none mt-0.5">
                  [{user.role}]
                </span>
              </div>

              {/* Profile Button */}
              <button
                onClick={() => navigate('/profile')}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Profil
              </button>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  logout()
                  toast({ title: 'Sesi Berakhir', description: 'Anda telah berhasil keluar dari sistem.', type: 'info' })
                }}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal('login')}
                className="h-8 px-4 text-[12px] font-medium rounded-full border border-zinc-800/80 hover:border-zinc-700 bg-transparent text-zinc-300 hover:text-white transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Masuk
              </button>
            </div>
          )}
          
          <Button
            onClick={handleStartChat}
            className="h-8 px-4 text-[12px] font-medium rounded-md tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] shadow-none cursor-pointer bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white"
          >
            Mulai Percakapan
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-200 hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-[60px] left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-900 md:hidden overflow-hidden flex flex-col px-6 py-6 space-y-6"
          >
            {/* Links */}
            <div className="flex flex-col space-y-4">
              <button
                className="text-left text-[15px] font-medium text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/')
                  setTimeout(() => {
                    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 150)
                }}
              >
                Layanan
              </button>
              <button
                className="text-left text-[15px] font-medium text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/')
                  setTimeout(() => {
                    document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 150)
                }}
              >
                Verifikasi
              </button>
              <button
                className="text-left text-[15px] font-medium text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/all-reports')
                }}
              >
                Semua Aduan
              </button>
              <button
                className="text-left text-[15px] font-medium text-zinc-100 font-semibold transition-colors py-1 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleTabChange('visi')
                }}
              >
                Tentang
              </button>
            </div>

            <div className="h-px bg-zinc-900 w-full" />

            {/* Auth Actions */}
            <div className="flex flex-col gap-3">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 pb-2">
                    <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200">
                      {(user.nama_panggilan || user.nama_lengkap)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-zinc-200">{user.nama_lengkap}</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">[{user.role}]</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/profile')
                    }}
                    className="w-full h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-200 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Profil Saya
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                      toast({ title: 'Sesi Berakhir', description: 'Anda telah berhasil keluar.', type: 'info' })
                    }}
                    className="w-full h-10 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-rose-400 hover:text-rose-350 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openModal('login')
                    }}
                    className="w-full h-10 border border-zinc-850 hover:bg-zinc-900 text-zinc-250 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Masuk
                  </button>
                </div>
              )}

              <Button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleStartChat()
                }}
                className="w-full h-10 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-sm transition-all active:scale-[0.98] mt-2 cursor-pointer shadow-lg"
              >
                Mulai Percakapan
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content Container ── */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-6 pt-24 pb-28 flex flex-col gap-10">
        
        {/* ── Hero Section ── */}
        <section className="text-center space-y-4 max-w-2xl mx-auto pt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.05] text-[11px] font-medium text-emerald-400 select-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pusat Informasi & Panduan Layanan</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
            className="text-[32px] md:text-[44px] font-extrabold text-zinc-100 tracking-[-0.03em] leading-none"
          >
            Tentang KOMUNITAS
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="text-[13.5px] md:text-[14.5px] text-zinc-400 font-light leading-relaxed"
          >
            Portal asisten AI terpadu yang dirancang untuk mempermudah akses informasi birokrasi, verifikasi kebenaran berita, serta memfasilitasi pelaporan masalah fasilitas publik bagi seluruh warga Indonesia.
          </motion.p>
        </section>

        {/* ── Tabs Navigation Row ── */}
        <section className="w-full">
          <div className="w-full border border-zinc-900 bg-zinc-950/60 backdrop-blur-md p-1.5 rounded-2xl">
            <div className="flex flex-wrap md:flex-nowrap gap-1 w-full relative">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex items-center justify-center gap-2.5 py-2.5 px-4 text-[12.5px] font-medium rounded-xl transition-all duration-300 cursor-pointer whitespace-nowrap flex-1 min-w-max z-10 ${
                      isActive
                        ? 'text-zinc-100 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-zinc-900 border border-zinc-800 rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Tab Content Box ── */}
        <section className="w-full min-h-[460px] bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 md:p-10 backdrop-blur-md relative overflow-hidden">
          {/* Subtle interior glow in content area */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/[0.015] rounded-full blur-[80px] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            
            {/* ── Tab VISI & MISI ── */}
            {activeTab === 'visi' && (
              <motion.div
                key="visi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-[17px] font-bold text-zinc-100 flex items-center gap-2.5 tracking-tight">
                    <Compass className="w-5 h-5 text-emerald-500" />
                    Visi & Misi Kami
                  </h2>
                  <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light">
                    Misi kami adalah mendemokrasikan informasi publik dan mempermudah interaksi warga dengan prosedur birokrasi pemerintahan Indonesia secara merdeka dan bebas dari hoaks.
                  </p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-8 space-y-4 relative overflow-hidden shadow-2xl">
                  {/* Subtle blur overlay */}
                  <div className="absolute inset-0 bg-dot-pattern opacity-10" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest block font-mono">Pilar Utama</span>
                  <p className="text-[16px] md:text-[18px] text-zinc-200 leading-relaxed font-light tracking-[-0.015em] relative z-10">
                    "Menyediakan akses informasi publik yang cepat, transparan, dan terpercaya untuk seluruh warga Indonesia melalui bantuan teknologi kecerdasan buatan."
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block font-mono">Misi Strategis</span>
                  
                  {/* Asymmetric 2-column list layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'Membantu warga mendapatkan jawaban cepat seputar syarat administrasi daerah.',
                      'Melakukan klarifikasi otomatis atas hoaks dan berita bohong di internet.',
                      'Menyederhanakan naskah peraturan hukum menjadi poin yang mudah dibaca.',
                      'Menyediakan sistem laporan masalah sarana publik dengan titik koordinat presisi.'
                    ].map((m, idx) => (
                      <div 
                        key={idx} 
                        className="bg-zinc-950/20 border border-zinc-900/60 p-5 rounded-xl flex items-start gap-4 transition-all duration-300 hover:border-zinc-800/80 hover:bg-zinc-950/40"
                      >
                        <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] text-zinc-300 shrink-0 font-bold font-mono">
                          {idx + 1}
                        </div>
                        <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light">
                          {m}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab PANDUAN PENGGUNA ── */}
            {activeTab === 'panduan' && (
              <motion.div
                key="panduan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-[17px] font-bold text-zinc-100 flex items-center gap-2.5 tracking-tight">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                    Panduan Pengguna
                  </h2>
                  <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light">
                    Pelajari langkah mudah menggunakan empat pilar fitur utama yang tersedia di platform kami.
                  </p>
                </div>

                {/* Customized Timeline */}
                <div className="relative border-l border-zinc-900 pl-6 ml-4 space-y-10 py-2">
                  {guideSteps.map((step, idx) => {
                    const StepIcon = step.icon
                    return (
                      <div 
                        key={idx}
                        className="relative group"
                      >
                        {/* Timeline bubble node indicator */}
                        <div className="absolute -left-[37px] top-1 w-5.5 h-5.5 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-zinc-900 transition-all duration-300 shrink-0 shadow-lg">
                          <span className="text-[10px] font-bold text-zinc-500 group-hover:text-emerald-400 font-mono">{idx + 1}</span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all duration-300">
                              <StepIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-[14px] font-bold text-zinc-200 tracking-tight group-hover:text-zinc-100 transition-colors">
                              {step.title}
                            </h3>
                          </div>
                          
                          <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light max-w-2xl">
                            {step.description}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1.5">
                            {step.tips.map((tip, tipIdx) => (
                              <div 
                                key={tipIdx} 
                                className="bg-zinc-950/65 border border-zinc-900 rounded-lg px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-400 hover:border-zinc-800 transition-all duration-300 flex items-center gap-2 font-light"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Tab FAQ ── */}
            {activeTab === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-[17px] font-bold text-zinc-100 flex items-center gap-2.5 tracking-tight">
                    <HelpCircle className="w-5 h-5 text-emerald-500" />
                    Pertanyaan yang Sering Diajukan
                  </h2>
                  <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light">
                    Temukan jawaban atas kendala dan pertanyaan mendasar yang sering diajukan oleh pengguna platform kami.
                  </p>
                </div>

                <div className="space-y-3 pt-2 max-w-3xl">
                  {faqs.map((faq, idx) => (
                    <FAQItem key={idx} question={faq.q} answer={faq.a} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Tab KEBIJAKAN PRIVASI ── */}
            {activeTab === 'kebijakan' && (
              <motion.div
                key="kebijakan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <h2 className="text-[17px] font-bold text-zinc-100 flex items-center gap-2.5 tracking-tight">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    Kebijakan Privasi
                  </h2>
                  <span className="inline-block text-[9px] font-bold text-zinc-500 font-mono tracking-widest uppercase border border-zinc-900 px-2 py-0.5 rounded">
                    Pembaruan: 24 Juni 2026
                  </span>
                  <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light max-w-2xl">
                    Kebijakan Privasi ini menjelaskan bagaimana platform KOMUNITAS mengumpulkan, melindungi, dan menggunakan informasi Anda saat menggunakan layanan kami. Kami berkomitmen menjaga keamanan data pribadi warga sesuai dengan undang-undang perlindungan data yang berlaku di Indonesia.
                  </p>
                </div>

                <div className="h-[1px] bg-zinc-900/60" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {[
                    {
                      icon: Compass,
                      title: 'Pengumpulan Data',
                      desc: 'Kami hanya mengumpulkan data yang Anda berikan secara sadar dan sukarela, seperti nomor telepon, gambar visual aduan, serta koordinat lokasi GPS saat menggunakan fitur Laporan Warga.'
                    },
                    {
                      icon: Target,
                      title: 'Penggunaan Data',
                      desc: 'Data yang masuk digunakan sepenuhnya untuk memvalidasi laporan aduan Anda, memetakannya pada GIS Admin daerah, dan memberikan respon asisten AI yang akurat.'
                    },
                    {
                      icon: Lock,
                      title: 'Perlindungan & Kerahasiaan',
                      desc: 'Semua berkas aduan dan informasi warga disimpan dalam database aman terenkripsi di server kami. Kami tidak pernah menjual atau membagikan data Anda kepada pihak ketiga tanpa izin resmi.'
                    },
                    {
                      icon: Eye,
                      title: 'Izin Perangkat',
                      desc: 'Fitur pelaporan membutuhkan izin akses kamera browser untuk mengambil foto asli kejadian dan izin lokasi GPS untuk memetakan pin koordinat laporan secara presisi.'
                    }
                  ].map((item, idx) => {
                    const ItemIcon = item.icon
                    return (
                      <div key={idx} className="space-y-2 p-5 rounded-xl border border-zinc-950 bg-zinc-950/20 hover:border-zinc-900 transition-colors">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <ItemIcon className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-[13px] font-bold">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[12px] text-zinc-400 leading-relaxed font-light">
                          {item.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Tab SYARAT LAYANAN ── */}
            {activeTab === 'syarat' && (
              <motion.div
                key="syarat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <h2 className="text-[17px] font-bold text-zinc-100 flex items-center gap-2.5 tracking-tight">
                    <Scale className="w-5 h-5 text-emerald-500" />
                    Syarat Ketentuan Layanan
                  </h2>
                  <span className="inline-block text-[9px] font-bold text-zinc-500 font-mono tracking-widest uppercase border border-zinc-900 px-2 py-0.5 rounded">
                    Pembaruan: 24 Juni 2026
                  </span>
                  <p className="text-[12.5px] text-zinc-400 leading-relaxed font-light max-w-2xl">
                    Dengan mengakses dan menggunakan platform KOMUNITAS, Anda setuju untuk terikat oleh Syarat Ketentuan Layanan ini. Harap baca seluruh aturan berikut dengan bijak.
                  </p>
                </div>

                <div className="h-[1px] bg-zinc-900/60" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {[
                    {
                      icon: CheckCircle2,
                      title: 'Kelayakan Layanan',
                      desc: 'Layanan ini disediakan gratis untuk warga Indonesia. Setiap pengguna wajib menyampaikan informasi yang benar dan tidak bermaksud merusak ketertiban umum.'
                    },
                    {
                      icon: Lock,
                      title: 'Batasan Penggunaan',
                      desc: 'Dilarang keras menyebarkan berita bohong (hoaks) yang disengaja, konten fitnah, pornografi, kebencian bermuansa SARA, atau ancaman kekerasan melalui layanan aduan.'
                    },
                    {
                      icon: Info,
                      title: 'Tanggung Jawab Jawaban AI',
                      desc: 'Jawaban dari asisten AI diproses otomatis berdasarkan rujukan data pemerintah. Jawaban ini digunakan sebagai panduan awal dan bukan pengganti saran resmi perundang-undangan.'
                    },
                    {
                      icon: Shield,
                      title: 'Penangguhan Layanan',
                      desc: 'Kami berhak menonaktifkan akun atau memblokir akses pengguna yang menyalahgunakan layanan ini secara berulang untuk kepentingan yang melanggar hukum.'
                    }
                  ].map((item, idx) => {
                    const ItemIcon = item.icon
                    return (
                      <div key={idx} className="space-y-2 p-5 rounded-xl border border-zinc-950 bg-zinc-950/20 hover:border-zinc-900 transition-colors">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <ItemIcon className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-[13px] font-bold">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[12px] text-zinc-400 leading-relaxed font-light">
                          {item.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

        {/* ── Call To Action Box ── */}
        <section className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-zinc-800 transition-all duration-300 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-[14.5px] font-bold text-zinc-100 tracking-tight">Butuh Asistensi Birokrasi Langsung?</h3>
            <p className="text-[12.5px] text-zinc-500 font-light leading-relaxed max-w-md">
              Dapatkan jawaban instan dan akurat mengenai berbagai prosedur pelayanan masyarakat dengan asisten pintar kami.
            </p>
          </div>
          <button
            onClick={handleStartChat}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-[12.5px] font-bold px-6 py-3 rounded-xl tracking-tight transition-all active:scale-[0.98] cursor-pointer shrink-0 shadow-lg"
          >
            Mulai Obrolan AI
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

      </main>

      {/* ── Footer ── */}
      <Footer4Col />
    </div>
  )
}

export default AboutPage
