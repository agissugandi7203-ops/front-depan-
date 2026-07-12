import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface NavbarProps {
  /** Which nav item to highlight as active */
  activeItem?: 'Beranda' | 'Semua Aduan' | 'Profil' | 'Tentang'
  /** Custom CTA click handler — defaults to navigating to /chat */
  onCtaClick?: () => void
}

export function Navbar({ activeItem, onCtaClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useAuthStore()
  const { openModal } = useAuthModalStore()
  const { toast } = useToast()

  // Navigation item definitions — dynamically calculated based on auth status
  const navItems = [
    { label: 'Beranda',     route: '/',           protected: false },
    { label: 'Semua Aduan', route: '/all-reports', protected: true  },
    { label: 'Tentang',     route: '/about',      protected: false },
    ...(isAuthenticated ? [{ label: 'Profil', route: '/profile', protected: true }] : []),
  ]

  // Track window scroll to toggle background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (item: { label: string; route: string; protected: boolean }) => {
    setMobileMenuOpen(false)
    if (item.protected && !isAuthenticated) {
      openModal('login')
    } else {
      navigate(item.route)
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

  return (
    <>
      {/* ── Fixed header — flush to top, no gap, full width ── */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300',
          isScrolled
            ? 'bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 shadow-lg'
            : 'bg-transparent border-b border-transparent'
        )}
        style={isScrolled ? { willChange: 'transform' } : undefined}
      >
        <div className="flex items-center justify-between h-16 px-5 md:px-10">

          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group select-none cursor-pointer shrink-0"
          >
            <img
              src="/assets/logo/komunitas.png"
              alt="KOMUNITAS Logo"
              className="h-7 w-7 object-contain rounded-md transition-opacity group-hover:opacity-85"
            />
            <span className={cn(
              "font-semibold text-[15px] tracking-[-0.02em] transition-colors duration-300",
              isScrolled ? "text-zinc-100" : "text-zinc-950"
            )}>
              KOMUNITAS
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  'text-[13px] transition-all duration-300 tracking-[-0.01em] cursor-pointer relative py-1.5',
                  activeItem === item.label
                    ? (isScrolled ? 'text-zinc-100 font-semibold' : 'text-zinc-950 font-bold')
                    : (isScrolled ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-700 hover:text-zinc-950')
                )}
                onClick={() => handleNavClick(item)}
              >
                <span>{item.label}</span>
                {activeItem === item.label && (
                  <motion.span
                    layoutId="activeNavLine"
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                      isScrolled ? "bg-[#DEDBC8]" : "bg-zinc-950"
                    )}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className={cn(
                  "h-8 px-4 text-[11px] font-bold rounded-full tracking-wide border transition-all duration-300 active:scale-[0.97] cursor-pointer",
                  isScrolled 
                    ? "bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-rose-400 border-zinc-800 hover:border-rose-950/40" 
                    : "bg-white hover:bg-zinc-50 text-zinc-700 hover:text-rose-600 border-zinc-300 hover:border-rose-200"
                )}
              >
                Keluar
              </button>
            ) : (
              <button
                onClick={() => openModal('login')}
                className={cn(
                  "h-8 px-4 text-[12px] font-medium rounded-full border transition-all duration-300 active:scale-[0.97] cursor-pointer",
                  isScrolled
                    ? "border-zinc-800/80 hover:border-zinc-700 bg-transparent text-zinc-300 hover:text-white"
                    : "border-zinc-300 hover:border-zinc-400 bg-transparent text-zinc-800 hover:text-zinc-950"
                )}
              >
                Masuk
              </button>
            )}
            <button
              onClick={handleCta}
              className={cn(
                "h-8 px-4 text-[12px] font-medium rounded-full tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] cursor-pointer shadow hover:shadow-md",
                isScrolled
                  ? "bg-zinc-100 hover:bg-white text-zinc-950"
                  : "bg-zinc-950 hover:bg-black text-white"
              )}
            >
              Mulai Percakapan
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              className={cn(
                "p-2 transition-colors cursor-pointer rounded-md",
                isScrolled 
                  ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                  : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/50"
              )}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* ── Mobile dropdown menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed top-16 left-0 right-0 z-40 bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-900 md:hidden flex flex-col px-5 pt-3 pb-5 space-y-4"
          >
            {/* Nav links */}
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    'text-left text-[15px] font-medium py-2.5 px-2 rounded-lg cursor-pointer transition-colors',
                    activeItem === item.label
                      ? 'text-white font-semibold bg-zinc-800/50'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/40'
                  )}
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full h-10 border border-zinc-800 text-rose-400 font-medium rounded-xl text-sm transition-colors cursor-pointer hover:bg-zinc-900"
                >
                  Keluar
                </button>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); openModal('login') }}
                  className="w-full h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )}
              <button
                onClick={handleCta}
                className="w-full h-10 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-sm transition-all cursor-pointer"
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
