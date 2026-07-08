import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail, User, Calendar, Phone, X, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/services/auth'
import { liquidGlass } from '@/lib/liquidGlass'
import { useNavigate } from 'react-router-dom'

export function AuthModal() {
  const { isOpen, view, closeModal, openModal } = useAuthModalStore()
  const { login, register, isLoading, error: storeError, clearError, isAuthenticated, user } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Login States
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register States
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    konfirmasiPassword: '',
    nama_lengkap: '',
    nama_panggilan: '',
    tanggal_lahir: '',
    nomor_telepon: '',
  })
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})
  const [showRegPass, setShowRegPass] = useState(false)
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false)
  const [regError, setRegError] = useState('')
  const [regStep, setRegStep] = useState<1 | 2>(1)

  const cardRef = useRef<HTMLDivElement>(null)

  // Clear errors when view changes
  useEffect(() => {
    setLoginError('')
    setRegError('')
    setRegErrors({})
    clearError()
  }, [view, clearError, isOpen])

  // Apply Apple Liquid Glass filter
  useEffect(() => {
    if (isOpen && cardRef.current) {
      const glass = liquidGlass(cardRef.current, {
        scale: -90,
        chroma: 5,
        border: 0.04,
        mapBlur: 10,
        blur: 16,
        saturate: 1.45,
        fallbackBlur: 20
      })
      return () => {
        glass.destroy()
      }
    }
  }, [isOpen, view, regStep])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      })
      if (error) throw error
    } catch (err: any) {
      setLoginError(err.message || 'Gagal masuk dengan Google.')
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Email dan password tidak boleh kosong.')
      return
    }

    try {
      const loggedInUser = await login(loginEmail.trim(), loginPassword)
      useChatStore.getState().clearAllSessions()
      localStorage.removeItem('komunitas_guest_contact')

      toast({
        title: "Masuk Berhasil",
        description: `Selamat datang kembali, ${loggedInUser.nama_panggilan || loggedInUser.nama_lengkap}!`,
        type: "success",
      })

      closeModal()
      if (['admin', 'superadmin', 'petugas'].includes(loggedInUser.role)) {
        navigate('/admin', { replace: true })
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setLoginError('Email atau password salah. Periksa kembali kredensial Anda.')
      } else if (msg.includes('Email not confirmed')) {
        setLoginError('Email belum dikonfirmasi. Periksa inbox email Anda.')
      } else if (msg.includes('Too many requests')) {
        setLoginError('Terlalu banyak percobaan login. Coba lagi beberapa menit kemudian.')
      } else {
        setLoginError(msg || 'Terjadi kesalahan. Silakan coba lagi.')
      }
    }
  }

  const validateRegField = (name: string, value: string): boolean => {
    let msg = ''
    if (name === 'email') {
      if (!value) {
        msg = 'Email wajib diisi'
      } else if (!/@gmail\.com$/i.test(value)) {
        msg = 'Anda harus menggunakan akun Gmail (@gmail.com)'
      }
    }
    if (name === 'password') {
      if (!value) msg = 'Password wajib diisi'
      else if (value.length < 8) msg = 'Password minimal 8 karakter'
    }
    if (name === 'konfirmasiPassword') {
      if (!value) msg = 'Konfirmasi password wajib diisi'
      else if (value !== regForm.password) msg = 'Konfirmasi password tidak cocok'
    }
    if (name === 'nama_lengkap') {
      if (!value.trim()) msg = 'Nama lengkap wajib diisi sesuai KTP'
    }
    if (name === 'nama_panggilan') {
      if (!value.trim()) msg = 'Nama panggilan wajib diisi'
    }
    if (name === 'tanggal_lahir') {
      if (!value) msg = 'Tanggal lahir wajib diisi'
    }
    if (name === 'nomor_telepon') {
      if (!value) msg = 'Nomor telepon wajib diisi'
      else if (!value.startsWith('+62')) msg = 'Nomor telepon harus diawali +62'
      else if (!/^\+62\d{10,13}$/.test(value)) msg = 'Format: +62 diikuti 10–13 digit angka'
    }
    setRegErrors(prev => ({ ...prev, [name]: msg }))
    return msg === ''
  }

  const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setRegForm(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'password' && updated.konfirmasiPassword) {
        setRegErrors(errs => ({
          ...errs,
          konfirmasiPassword: updated.konfirmasiPassword !== value ? 'Konfirmasi password tidak cocok' : ''
        }))
      }
      return updated
    })
    setRegError('')
    validateRegField(name, value)
  }

  const handleRegNext = () => {
    const fields: (keyof typeof regForm)[] = ['email', 'password', 'konfirmasiPassword']
    let valid = true
    fields.forEach(k => { if (!validateRegField(k, regForm[k])) valid = false })
    if (valid) setRegStep(2)
  }

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')

    const step2Fields: (keyof typeof regForm)[] = ['nama_lengkap', 'nama_panggilan', 'tanggal_lahir', 'nomor_telepon']
    let valid = true
    step2Fields.forEach(k => { if (!validateRegField(k, regForm[k])) valid = false })
    
    if (!valid) {
      setRegError('Silakan lengkapi semua isian formulir dengan benar.')
      return
    }

    try {
      await register({
        email: regForm.email.trim(),
        password: regForm.password,
        nama_lengkap: regForm.nama_lengkap.trim(),
        nama_panggilan: regForm.nama_panggilan.trim(),
        tanggal_lahir: regForm.tanggal_lahir,
        nomor_telepon: regForm.nomor_telepon.trim(),
      })

      closeModal()
      navigate('/verify-email', {
        replace: true,
        state: { email: regForm.email.trim() }
      })
    } catch (err: any) {
      setRegError(err.message || 'Gagal mendaftarkan akun. Silakan coba kembali.')
    }
  }

  const isStaffEmail = loginEmail.trim().toLowerCase().endsWith('@komunitas.id')
  const progressPercent = regStep === 1 ? 50 : 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px] z-10 flex flex-col"
      >
        <div 
          ref={cardRef}
          className="w-full rounded-3xl border border-zinc-800/80 bg-zinc-950/45 text-zinc-150 shadow-[0_24px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300"
        >
          {/* Header */}
          <div className="relative border-b border-zinc-850 bg-zinc-950/20 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                {view === 'login' 
                  ? (isStaffEmail ? 'Konsol Admin' : 'Masuk Akun') 
                  : 'Daftar Warga'
                }
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                {view === 'login'
                  ? 'Gunakan akun Anda untuk mengakses asisten AI.'
                  : 'Daftarkan data diri resmi sesuai KTP.'
                }
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-1.5 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {view === 'login' ? (
              /* --- LOGIN VIEW --- */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-900/30 bg-red-950/20 p-3 animate-in fade-in duration-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-[11.5px] leading-relaxed text-red-400 font-medium">{loginError}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Pengguna</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder={isStaffEmail ? 'admin@komunitas.id' : 'warga@email.com'}
                      className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700 focus:bg-zinc-950/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-10 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700 focus:bg-zinc-950/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Memproses...</>
                  ) : (
                    isStaffEmail ? 'Masuk Konsol Admin' : 'Masuk ke Akun'
                  )}
                </button>

                {!isStaffEmail && (
                  <>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-zinc-850"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-zinc-600 uppercase font-mono font-bold">atau</span>
                      <div className="flex-grow border-t border-zinc-850"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full h-10 flex items-center justify-center gap-2.5 rounded-xl text-xs font-semibold bg-zinc-900/40 border border-zinc-800 text-zinc-200 hover:bg-zinc-900/60 hover:text-white active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                  </>
                )}

                <div className="pt-2 text-center text-[12px] text-zinc-500">
                  Belum memiliki akun warga?{' '}
                  <button
                    type="button"
                    onClick={() => openModal('register')}
                    className="font-bold text-indigo-400 hover:text-indigo-350 transition-colors underline decoration-indigo-900/50 underline-offset-4 cursor-pointer"
                  >
                    Daftar Sekarang
                  </button>
                </div>
              </form>
            ) : (
              /* --- REGISTER VIEW --- */
              <form onSubmit={handleRegSubmit} className="space-y-4">
                {/* Progress bar */}
                <div className="w-full bg-zinc-900/60 rounded-full h-1 relative overflow-hidden">
                  <motion.div 
                    animate={{ width: `${progressPercent}%` }}
                    className="bg-indigo-500 h-full rounded-full"
                  />
                </div>

                {regError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-900/30 bg-red-950/20 p-3 animate-in fade-in duration-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-[11.5px] leading-relaxed text-red-400 font-medium">{regError}</p>
                  </div>
                )}

                {regStep === 1 ? (
                  /* Step 1: Kredensial */
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-250">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email (Akun Gmail)</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="email"
                          name="email"
                          value={regForm.email}
                          onChange={handleRegChange}
                          placeholder="nama@gmail.com"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                      </div>
                      {regErrors.email && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.email}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Buat Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type={showRegPass ? 'text' : 'password'}
                          name="password"
                          value={regForm.password}
                          onChange={handleRegChange}
                          placeholder="Minimal 8 karakter"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-10 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPass(!showRegPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {regErrors.password && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.password}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Konfirmasi Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type={showRegConfirmPass ? 'text' : 'password'}
                          name="konfirmasiPassword"
                          value={regForm.konfirmasiPassword}
                          onChange={handleRegChange}
                          placeholder="Ketik ulang password"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-10 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showRegConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {regErrors.konfirmasiPassword && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.konfirmasiPassword}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={handleRegNext}
                      className="w-full h-10 flex items-center justify-center rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all active:scale-[0.98] cursor-pointer mt-4"
                    >
                      Lanjutkan Ke Data Diri
                    </button>
                  </div>
                ) : (
                  /* Step 2: Data Diri */
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-250">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nama Lengkap (Sesuai KTP)</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          name="nama_lengkap"
                          value={regForm.nama_lengkap}
                          onChange={handleRegChange}
                          placeholder="Contoh: Budi Santoso"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                      </div>
                      {regErrors.nama_lengkap && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.nama_lengkap}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Panggilan</label>
                        <input
                          type="text"
                          name="nama_panggilan"
                          value={regForm.nama_panggilan}
                          onChange={handleRegChange}
                          placeholder="Budi"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                        {regErrors.nama_panggilan && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.nama_panggilan}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tgl Lahir</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                          <input
                            type="date"
                            name="tanggal_lahir"
                            value={regForm.tanggal_lahir}
                            onChange={handleRegChange}
                            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-9 pr-3 text-xs text-zinc-200 outline-none transition focus:border-zinc-700"
                          />
                        </div>
                        {regErrors.tanggal_lahir && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.tanggal_lahir}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nomor Telepon (WhatsApp)</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          name="nomor_telepon"
                          value={regForm.nomor_telepon}
                          onChange={handleRegChange}
                          placeholder="+6281234567890"
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-zinc-700"
                        />
                      </div>
                      {regErrors.nomor_telepon && <p className="text-[10.5px] text-red-400 font-medium pl-1 mt-0.5">{regErrors.nomor_telepon}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="h-10 flex items-center justify-center rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="h-10 flex items-center justify-center rounded-xl text-xs font-semibold bg-indigo-650 hover:bg-indigo-600 text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Daftar Akun'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center text-[12px] text-zinc-500">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => openModal('login')}
                    className="font-bold text-indigo-400 hover:text-indigo-350 transition-colors underline decoration-indigo-900/50 underline-offset-4 cursor-pointer"
                  >
                    Masuk Di Sini
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
