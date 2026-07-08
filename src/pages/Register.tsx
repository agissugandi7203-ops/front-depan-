import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Loader2, AlertCircle, Lock, Mail, User,
  Calendar, Phone, CheckCircle2, ShieldCheck,
  MessageSquare, Bot, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function Register() {
  const [formData, setForm] = useState({
    email: '',
    password: '',
    konfirmasiPassword: '',
    nama_lengkap: '',
    nama_panggilan: '',
    tanggal_lahir: '',
    nomor_telepon: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1) // Step 1: Kredensial, Step 2: Data Diri

  const { register, isLoading, error: storeError, clearError, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
    return () => { clearError() }
  }, [isAuthenticated, navigate, clearError])

  // ── Validators ──────────────────────────────────────────────────────────────

  const validateField = (name: string, value: string): boolean => {
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
      else if (value !== formData.password) msg = 'Konfirmasi password tidak cocok'
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

    setErrors(prev => ({ ...prev, [name]: msg }))
    return msg === ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'password' && updated.konfirmasiPassword) {
        setErrors(errs => ({
          ...errs,
          konfirmasiPassword: updated.konfirmasiPassword !== value ? 'Konfirmasi password tidak cocok' : ''
        }))
      }
      return updated
    })
    if (storeError) clearError()
    setLocalError(null)
    validateField(name, value)
  }

  // ── Step 1 → Step 2 transition ───────────────────────────────────────────────

  const handleNextStep = () => {
    const fields: (keyof typeof formData)[] = ['email', 'password', 'konfirmasiPassword']
    let valid = true
    fields.forEach(k => { if (!validateField(k, formData[k])) valid = false })
    if (valid) setStep(2)
  }

  // ── Final Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const step2Fields: (keyof typeof formData)[] = ['nama_lengkap', 'nama_panggilan', 'tanggal_lahir', 'nomor_telepon']
    let valid = true
    step2Fields.forEach(k => { if (!validateField(k, formData[k])) valid = false })
    if (!valid) {
      setLocalError('Silakan lengkapi semua isian formulir dengan benar.')
      return
    }

    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        nama_lengkap: formData.nama_lengkap.trim(),
        nama_panggilan: formData.nama_panggilan.trim(),
        tanggal_lahir: formData.tanggal_lahir,
        nomor_telepon: formData.nomor_telepon.trim(),
      })

      // Redirect ke halaman verifikasi email (bukan login langsung)
      navigate('/verify-email', {
        replace: true,
        state: { email: formData.email.trim() }
      })

    } catch (err: any) {
      setLocalError(err.message || 'Gagal mendaftarkan akun. Silakan coba kembali.')
    }
  }

  // ── Step progress percentage ────────────────────────────────────────────────
  const progress = step === 1 ? 50 : 100

  // ── Shared input class ──────────────────────────────────────────────────────
  const inputClass = (field: string) =>
    `h-10 w-full rounded-lg border bg-zinc-950/50 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition focus:bg-zinc-950 disabled:opacity-50 ${errors[field] ? 'border-red-900/50 focus:border-red-500/40' : 'border-zinc-800 focus:border-zinc-600'}`

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-zinc-950 text-zinc-100">

      {/* ── LEFT PANEL: Desktop only ─────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[42%] flex-col justify-between p-10 border-r border-zinc-900 relative overflow-hidden flex-shrink-0">
        {/* Ambient */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-zinc-800/20 blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 overflow-hidden">
            <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">KOMUNITAS</span>
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 leading-none mt-0.5">Portal Warga</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-5 relative z-10">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-semibold">Layanan Premium Aktif</span>
            <h2 className="text-3xl font-extrabold tracking-tighter text-zinc-100 leading-tight mt-1">
              Daftar Akun<br />Warga Digital
            </h2>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Daftarkan diri sebagai warga terverifikasi untuk melaporkan kendala publik, berkonsultasi dengan petugas daerah, memvalidasi hoaks, dan memantau statistik wilayah secara transparan.
          </p>

          {/* Feature list */}
          <div className="space-y-0 border-t border-zinc-900 pt-4">
            {[
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Keamanan Enkripsi Penuh', status: 'Aman' },
              { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Diskusi Chat Dua Arah', status: 'Realtime' },
              { icon: <Bot className="h-3.5 w-3.5" />, label: 'Akses Asisten AI', status: 'Aktif' },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between py-2.5 border-b border-zinc-900/50 text-[11px]">
                <span className="flex items-center gap-2 text-zinc-400">
                  <span className="text-zinc-600">{f.icon}</span>
                  {f.label}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[8px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-zinc-700 font-mono relative z-10">
          © 2026 KOMUNITAS. Data dienkripsi SSL.
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto min-h-[100dvh] py-8 px-4 sm:px-6">

        {/* Mobile Logo */}
        <div className="mb-5 flex flex-col items-center gap-2 md:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 overflow-hidden">
            <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-full w-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">KOMUNITAS</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Portal Warga</p>
          </div>
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-xl overflow-hidden">

            {/* Card Header */}
            <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Pendaftaran Warga Baru</h2>
                  <p className="text-[10px] text-zinc-500 font-light mt-0.5">
                    {step === 1 ? 'Langkah 1 dari 2 — Kredensial Akun' : 'Langkah 2 dari 2 — Data Kependudukan'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{progress}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Form body */}
            <div className="p-5 space-y-4">

              {/* Error banner */}
              <AnimatePresence mode="wait">
                {(localError || storeError) && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2.5 rounded-lg border border-red-900/30 bg-red-950/20 p-3"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs leading-relaxed text-red-400 font-medium">{localError || storeError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">

                {/* ── STEP 1: Kredensial ───────────────────────────────────── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Alamat Email Gmail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="nama@gmail.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className={inputClass('email')}
                        />
                      </div>
                      {errors.email ? (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {errors.email}
                        </p>
                      ) : (
                        <p className="text-[9px] text-zinc-600 font-mono">Hanya akun Gmail (@gmail.com) yang diterima</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label htmlFor="password" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="password"
                          type={showPass ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Minimal 8 karakter"
                          autoComplete="new-password"
                          disabled={isLoading}
                          className={`${inputClass('password')} pr-10`}
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
                      {errors.password && (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.password}
                        </p>
                      )}
                    </div>

                    {/* Konfirmasi Password */}
                    <div className="space-y-1.5">
                      <label htmlFor="konfirmasiPassword" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Konfirmasi Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="konfirmasiPassword"
                          type={showConfirmPass ? 'text' : 'password'}
                          name="konfirmasiPassword"
                          value={formData.konfirmasiPassword}
                          onChange={handleChange}
                          placeholder="Ulangi password"
                          autoComplete="new-password"
                          disabled={isLoading}
                          className={`${inputClass('konfirmasiPassword')} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(v => !v)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.konfirmasiPassword ? (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.konfirmasiPassword}
                        </p>
                      ) : formData.konfirmasiPassword && formData.password === formData.konfirmasiPassword ? (
                        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Password cocok
                        </p>
                      ) : null}
                    </div>

                    {/* Next button */}
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isLoading}
                      className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-950 hover:bg-white active:scale-[0.98] transition-all disabled:opacity-55 cursor-pointer"
                    >
                      Lanjutkan ke Data Diri
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* ── STEP 2: Data Kependudukan ────────────────────────────── */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >


                    {/* Nama Lengkap */}
                    <div className="space-y-1.5">
                      <label htmlFor="nama_lengkap" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Nama Lengkap (sesuai KTP)
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="nama_lengkap"
                          type="text"
                          name="nama_lengkap"
                          value={formData.nama_lengkap}
                          onChange={handleChange}
                          placeholder="Sesuai kartu identitas"
                          disabled={isLoading}
                          className={inputClass('nama_lengkap')}
                        />
                      </div>
                      {errors.nama_lengkap && (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.nama_lengkap}
                        </p>
                      )}
                    </div>

                    {/* Nama Panggilan */}
                    <div className="space-y-1.5">
                      <label htmlFor="nama_panggilan" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Nama Panggilan
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="nama_panggilan"
                          type="text"
                          name="nama_panggilan"
                          value={formData.nama_panggilan}
                          onChange={handleChange}
                          placeholder="Nama sapaan akrab"
                          disabled={isLoading}
                          className={inputClass('nama_panggilan')}
                        />
                      </div>
                      {errors.nama_panggilan && (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.nama_panggilan}
                        </p>
                      )}
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="space-y-1.5">
                      <label htmlFor="tanggal_lahir" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Tanggal Lahir
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="tanggal_lahir"
                          type="date"
                          name="tanggal_lahir"
                          value={formData.tanggal_lahir}
                          onChange={handleChange}
                          disabled={isLoading}
                          className={`${inputClass('tanggal_lahir')} custom-calendar-dark`}
                        />
                      </div>
                      {errors.tanggal_lahir && (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.tanggal_lahir}
                        </p>
                      )}
                    </div>

                    {/* Nomor Telepon */}
                    <div className="space-y-1.5">
                      <label htmlFor="nomor_telepon" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Nomor Telepon / Handphone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="nomor_telepon"
                          type="text"
                          name="nomor_telepon"
                          value={formData.nomor_telepon}
                          onChange={handleChange}
                          placeholder="+6281234567890"
                          disabled={isLoading}
                          className={inputClass('nomor_telepon')}
                        />
                      </div>
                      {errors.nomor_telepon ? (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />{errors.nomor_telepon}
                        </p>
                      ) : (
                        <p className="text-[9px] text-zinc-600 font-mono">Awali dengan +62 diikuti 10–13 angka</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setStep(1); setLocalError(null) }}
                        disabled={isLoading}
                        className="h-10 w-24 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all disabled:opacity-50"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-950 hover:bg-white active:scale-[0.98] transition-all disabled:opacity-55 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Mendaftarkan...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Daftarkan Akun
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Card Footer */}
            <div className="border-t border-zinc-800/80 bg-zinc-950/20 px-5 py-3.5 text-center">
              <p className="text-xs text-zinc-500">
                Sudah memiliki akun?{' '}
                <Link
                  to="/login"
                  className="font-bold text-zinc-300 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-700"
                >
                  Masuk Sekarang
                </Link>
              </p>
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-5 text-center">
            <Link
              to="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 decoration-zinc-800 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
