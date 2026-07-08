import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/services/auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Gagal masuk dengan Google.')
    }
  }

  const { login, isAuthenticated, user, clearError } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = (location.state as any)?.from?.pathname || '/'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (['admin', 'superadmin', 'petugas'].includes(user.role)) {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
    return () => {
      clearError()
    }
  }, [isAuthenticated, user, navigate, from, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email dan password tidak boleh kosong.')
      return
    }

    setLoading(true)
    try {
      const loggedInUser = await login(email.trim(), password)
      
      // Reset guest chat store and remove guest contact data upon successful login
      useChatStore.getState().clearAllSessions()
      localStorage.removeItem('komunitas_guest_contact')
      
      toast({
        title: "Masuk Berhasil",
        description: `Selamat datang kembali, ${loggedInUser.nama_panggilan || loggedInUser.nama_lengkap}!`,
        type: "success",
      })

      if (['admin', 'superadmin', 'petugas'].includes(loggedInUser.role)) {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email atau password salah. Periksa kembali kredensial Anda.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Email belum dikonfirmasi. Periksa inbox email Anda.')
      } else if (msg.includes('Too many requests')) {
        setError('Terlalu banyak percobaan login. Coba lagi beberapa menit kemudian.')
      } else {
        setError(msg || 'Terjadi kesalahan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Check if staff email for dynamic rendering
  const isStaffEmail = email.trim().toLowerCase().endsWith('@komunitas.id')

  return (
    <div className="relative flex min-h-[100dvh] bg-zinc-950 overflow-hidden text-zinc-100 font-sans">
      
      {/* ─── LEFT PANEL: BRAND & INTEGRITY STATS (DESKTOP ONLY) ────────── */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-zinc-950 border-r border-zinc-900 relative bg-dot-pattern bg-noise overflow-hidden">
        {/* Ambient glow top-left */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-zinc-900/30 blur-3xl" />
        
        {/* Header brand */}
        <div className="flex items-center gap-3 relative z-10 select-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden p-1.5">
            <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">KOMUNITAS</span>
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 leading-none mt-0.5">Portal Utama</span>
          </div>
        </div>

        {/* System Integrity & Description */}
        <div className="space-y-6 max-w-sm relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-semibold">Security System Active</span>
            <h2 className="text-4xl font-extrabold tracking-tighter text-zinc-100 leading-none">KOMUNITAS</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">Console v1.0.4 // SSL Enforced</p>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed font-light">
            Selamat datang di Portal Utama KOMUNITAS. Sistem ini dirancang untuk memproses aduan warga, memperbarui informasi layanan masyarakat, mengakses asisten AI, serta memantau operasional pelayanan publik secara real-time. Hak akses dibatasi bagi pengguna terdaftar.
          </p>
          
          <div className="pt-6 space-y-2 border-t border-zinc-900">
            <div className="flex items-center justify-between text-[11px] py-2 border-b border-zinc-900/40 font-mono">
              <span className="text-zinc-400">Pengaduan Warga</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[8px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktif</span>
            </div>
            <div className="flex items-center justify-between text-[11px] py-2 border-b border-zinc-900/40 font-mono">
              <span className="text-zinc-400">Direktori Layanan</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[8px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sinkron</span>
            </div>
            <div className="flex items-center justify-between text-[11px] py-2 border-b border-zinc-900/40 font-mono">
              <span className="text-zinc-400">Verifikasi Informasi</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[8px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktif</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-zinc-600 font-mono select-none relative z-10">
          Copyright &copy; 2026 KOMUNITAS. Secure Administration Console.
        </div>
      </div>

      {/* ─── RIGHT PANEL: LOGIN FORM (DESKTOP & MOBILE) ────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-zinc-950 relative overflow-hidden bg-dot-pattern bg-noise md:bg-none">
        {/* Background ambient glow for mobile */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900/20 blur-3xl md:hidden" />
        
        {/* Mobile Header Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 md:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden p-2">
            <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-full w-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-md font-bold text-zinc-100 uppercase tracking-wider">KOMUNITAS</h1>
            <p className="mt-0.5 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Portal Terpadu</p>
          </div>
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          {/* Glassmorphic Card */}
          <div className={`overflow-hidden rounded-xl border transition-all duration-300 bg-zinc-900/60 backdrop-blur-xl shadow-xl ${
            isStaffEmail ? 'border-indigo-500/30' : 'border-zinc-800'
          }`}>
            <div className="border-b border-zinc-800/80 bg-zinc-950/40 p-6">
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                {isStaffEmail ? 'Masuk ke Konsol Admin' : 'Masuk ke Akun'}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 font-light leading-relaxed">
                {isStaffEmail 
                  ? 'Gunakan kredensial admin terdaftar Anda untuk membuka kunci konsol manajemen.'
                  : 'Gunakan kredensial akun terdaftar Anda untuk mengakses seluruh layanan.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2.5 rounded-lg border border-red-900/30 bg-red-950/20 p-3"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs leading-relaxed text-red-400 font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <div className="space-y-2">
                <label 
                  htmlFor="email" 
                  className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider"
                >
                  {isStaffEmail ? 'Email Admin' : 'Email Pengguna'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={isStaffEmail ? 'admin@komunitas.id' : 'warga@email.com'}
                    autoComplete="email"
                    disabled={loading}
                    className={`h-10 w-full rounded-lg border bg-zinc-950/50 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:bg-zinc-950 disabled:opacity-50 ${
                      isStaffEmail ? 'border-indigo-950/50 focus:border-indigo-500/40' : 'border-zinc-800 focus:border-zinc-700'
                    }`}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label 
                  htmlFor="password" 
                  className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    className={`h-10 w-full rounded-lg border bg-zinc-950/50 pl-10 pr-10 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:bg-zinc-950 disabled:opacity-50 ${
                      isStaffEmail ? 'border-indigo-950/50 focus:border-indigo-500/40' : 'border-zinc-800 focus:border-zinc-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-55 ${
                  isStaffEmail ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  isStaffEmail ? 'Masuk ke Konsol Admin' : 'Masuk ke Akun'
                )}
              </button>

              {!isStaffEmail && (
                <>
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-zinc-900"></div>
                    <span className="flex-shrink mx-4 text-[9px] text-zinc-600 uppercase font-mono font-bold">atau</span>
                    <div className="flex-grow border-t border-zinc-900"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg text-xs font-bold bg-zinc-900/40 border border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all disabled:opacity-55 cursor-pointer"
                  >
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Masuk dengan Google
                  </button>
                </>
              )}
            </form>

            {/* Registration call to action */}
            {!isStaffEmail && (
              <div className="border-t border-zinc-800/80 bg-zinc-950/20 px-6 py-4 text-center">
                <p className="text-xs text-zinc-500">
                  Belum memiliki akun warga?{' '}
                  <Link 
                    to="/register" 
                    className="font-bold text-zinc-300 hover:text-zinc-100 transition-colors underline decoration-zinc-800 underline-offset-4"
                  >
                    Daftar Sekarang
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Footer Back Button */}
          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4 decoration-zinc-800 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
