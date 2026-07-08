import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface NavbarProps {
  /** Floating pill style (HomePage) vs sticky bar style (other pages) */
  variant?: 'floating' | 'sticky'
  /** Which nav item to highlight as active */
  activeItem?: 'Layanan' | 'Verifikasi' | 'Semua Aduan' | 'Tentang'
  /** Custom CTA click handler — defaults to navigating to /chat */
  onCtaClick?: () => void
}

// Navigation item definitions — data-driven, never hardcoded
const NAV_ITEMS = [
  { label: 'Layanan',     action: 'scroll' as const, scrollId: 'features-section', route: null,          protected: false },
  { label: 'Verifikasi',  action: 'scroll' as const, scrollId: 'tools-section',    route: null,          protected: false },
  { label: 'Semua Aduan', action: 'route' as const,  scrollId: null,               route: '/all-reports', protected: true  },
  { label: 'Tentang',     action: 'route' as const,  scrollId: null,               route: '/about',       protected: false },
] as const

export function Navbar({ variant = 'sticky', activeItem, onCtaClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { openModal } = useAuthModalStore()
  const { toast } = useToast()

  const handleNavClick = (item: typeof NAV_ITEMS[number]) => {
    setMobileMenuOpen(false)

    if (item.action === 'scroll') {
      // If we're not on homepage, navigate there first then scroll
      if (location.pathname !== '/') {
        navigate('/')
        setTimeout(() => {
          document.getElementById(item.scrollId!)?.scrollIntoView({ behavior: 'smooth' })
        }, 120)
      } else {
        document.getElementById(item.scrollId!)?.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // Route-based navigation
      if (item.protected && !isAuthenticated) {
        // Protected page — open login modal instead of navigating
        openModal('login')
      } else {
        navigate(item.route!)
      }
    }
  }

  const handleCta = () => {
    setMobileMenuOpen(false)
    if (onCtaClick) {
      onCtaClick()
    } else {
      navigate('/chat')
    }
  }

  const handleLogout = () => {
    setMobileMenuOpen(false)
    logout()
    toast({ title: 'Sesi Berakhir', description: 'Anda telah berhasil keluar dari sistem.', type: 'info' })
  }

  // ── Floating variant (HomePage style) ───────────────────────────────────────
  if (variant === 'floating') {
    return (
      <>
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-5 left-4 right-4 z-50 h-[72px] max-w-5xl mx-auto px-8 flex items-center justify-between transition-all duration-300 rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
        >
          {/* Logo */}
          <div className="flex-1 flex justify-start">
            <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => navigate('/')}>
              <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-9 w-9 object-contain rounded-md" loading="lazy" />
              <span className="font-semibold text-[17px] tracking-[-0.02em] text-white">KOMUNITAS</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-initial items-center gap-10">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "group relative py-1.5 text-[14px] font-medium transition-colors duration-300 tracking-[-0.01em] cursor-pointer",
                  activeItem === item.label ? "text-white" : "text-zinc-400 hover:text-white"
                )}
                onClick={() => handleNavClick(item)}
              >
                <span>{item.label}</span>
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all duration-300",
                  activeItem === item.label ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </button>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex flex-1 justify-end items-center gap-5">
            {isAuthenticated && user ? (
              <>
                <div
                  onClick={() => navigate('/profile')}
                  className="flex flex-col items-end text-right select-none cursor-pointer hover:opacity-80 transition animate-fade-in mr-1"
                >
                  <span className="text-[13px] font-medium tracking-tight text-zinc-100">{user.nama_panggilan || user.nama_lengkap}</span>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-medium tracking-wider leading-none mt-0.5">[{user.role}]</span>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="h-10 px-5 text-[13px] font-medium text-zinc-200 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 rounded-full transition-all duration-300 active:scale-[0.97] cursor-pointer"
                >
                  Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="h-10 px-5 text-[13px] font-medium text-zinc-400 hover:text-rose-400 bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800 hover:border-rose-950/50 rounded-full transition-all duration-300 active:scale-[0.97] cursor-pointer"
                >
                  Keluar
                </button>
              </>
            ) : (
              <button
                onClick={() => openModal('login')}
                className="h-10 px-5 text-[13px] font-medium text-zinc-300 hover:text-white bg-transparent border border-zinc-800/80 hover:border-zinc-700 rounded-full transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Masuk
              </button>
            )}
            <button
              onClick={handleCta}
              className="h-10 px-6 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 rounded-full transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Mulai Percakapan
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center justify-end flex-1">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-200 hover:text-white transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.header>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-[96px] left-4 right-4 z-40 max-w-5xl mx-auto bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 md:hidden overflow-hidden flex flex-col px-6 py-6 space-y-6 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
            >
              <div className="flex flex-col space-y-4">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    className={cn(
                      "text-left text-[15px] font-medium transition-colors py-1 cursor-pointer",
                      activeItem === item.label ? "text-white" : "text-zinc-300 hover:text-white"
                    )}
                    onClick={() => handleNavClick(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="h-px bg-zinc-800 w-full" />

              <div className="flex flex-col gap-3">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 pb-2">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200">
                        {(user.nama_panggilan || user.nama_lengkap)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-zinc-200">{user.nama_lengkap}</div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase">[{user.role}]</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/profile') }}
                      className="w-full h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-200 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Profil Saya
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full h-10 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-rose-400 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Keluar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); openModal('login') }}
                    className="w-full h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Masuk
                  </button>
                )}
                <button
                  onClick={handleCta}
                  className="w-full h-10 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-sm transition-all active:scale-[0.98] mt-2 cursor-pointer shadow-lg"
                >
                  Mulai Percakapan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Sticky variant (AllReports / About style) ────────────────────────────────
  return (
    <>
      <header className="sticky top-0 z-50 h-[60px] border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 md:px-10 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group select-none cursor-pointer"
        >
          <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-7 w-7 object-contain rounded-md transition-opacity group-hover:opacity-85" />
          <span className="font-semibold text-[15px] tracking-[-0.02em] text-zinc-100">KOMUNITAS</span>
        </div>

        {/* Desktop Nav — centered */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={cn(
                "text-[13px] transition-colors tracking-[-0.01em] cursor-pointer",
                activeItem === item.label
                  ? "text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
              onClick={() => handleNavClick(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div
                onClick={() => navigate('/profile')}
                className="hidden md:flex flex-col items-end text-right select-none cursor-pointer hover:opacity-80 transition"
              >
                <span className="text-[12px] font-bold tracking-tight text-zinc-100">{user.nama_panggilan || user.nama_lengkap}</span>
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold tracking-wider leading-none mt-0.5">[{user.role}]</span>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Profil
              </button>
              <button
                onClick={handleLogout}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="h-8 px-4 text-[12px] font-medium rounded-full border border-zinc-800/80 hover:border-zinc-700 bg-transparent text-zinc-300 hover:text-white transition-all duration-300 active:scale-[0.97] cursor-pointer"
            >
              Masuk
            </button>
          )}
          <button
            onClick={handleCta}
            className="h-8 px-4 text-[12px] font-medium rounded-md tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] cursor-pointer bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
          >
            Mulai Percakapan
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[60px] left-0 right-0 z-40 bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-800 md:hidden flex flex-col px-6 py-5 space-y-5"
          >
            <div className="flex flex-col space-y-3">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    "text-left text-[15px] font-medium py-1 cursor-pointer transition-colors",
                    activeItem === item.label ? "text-white font-semibold" : "text-zinc-300 hover:text-white"
                  )}
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-zinc-800" />

            <div className="flex flex-col gap-2.5">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 pb-1">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-sm">
                      {(user.nama_panggilan || user.nama_lengkap)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-zinc-200">{user.nama_panggilan || user.nama_lengkap}</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">[{user.role}]</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/profile') }}
                    className="w-full h-9 border border-zinc-800 hover:bg-zinc-900 text-zinc-200 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full h-9 border border-zinc-800 text-rose-400 font-medium rounded-lg text-sm transition-colors cursor-pointer hover:bg-zinc-900"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); openModal('login') }}
                  className="w-full h-9 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )}
              <button
                onClick={handleCta}
                className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-sm transition-all cursor-pointer"
              >
                Mulai Percakapan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
