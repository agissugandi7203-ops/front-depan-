import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ExternalLink, RefreshCw, CheckCircle2, Clock } from 'lucide-react'

/**
 * Halaman VerifyEmail
 * Ditampilkan setelah registrasi berhasil.
 * Menginformasikan user untuk membuka Gmail dan mengklik link konfirmasi.
 */
export function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const email: string = (location.state as any)?.email || ''

  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Jika tidak ada email dari state (akses langsung URL), redirect ke register
  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true })
    }
  }, [email, navigate])

  // Countdown untuk tombol "Kirim Ulang"
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleOpenGmail = () => {
    window.open('https://mail.google.com', '_blank', 'noopener,noreferrer')
  }

  const steps = [
    {
      num: '1',
      title: 'Buka Gmail Anda',
      desc: `Cari email dari noreply@mail.app.supabase.io yang dikirim ke ${email}`,
      icon: <Mail className="h-4 w-4 text-zinc-400" />,
    },
    {
      num: '2',
      title: 'Klik "Confirm email address"',
      desc: 'Klik tombol konfirmasi di dalam email untuk memverifikasi akun Anda',
      icon: <CheckCircle2 className="h-4 w-4 text-zinc-400" />,
    },
    {
      num: '3',
      title: 'Masuk ke Akun Anda',
      desc: 'Setelah dikonfirmasi, Anda akan otomatis diarahkan ke halaman masuk',
      icon: <ExternalLink className="h-4 w-4 text-zinc-400" />,
    },
  ]

  if (!email) return null

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100 overflow-hidden">
      {/* Background ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-950/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-zinc-800/80">
            {/* Animated envelope icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: 'backOut' }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-900/40 bg-emerald-950/30"
            >
              <Mail className="h-8 w-8 text-emerald-400" />
            </motion.div>

            <h1 className="text-base font-bold text-zinc-100 tracking-tight">
              Verifikasi Email Anda
            </h1>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Kami telah mengirimkan tautan konfirmasi ke
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-1.5">
              <Mail className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-mono font-medium text-zinc-200 break-all">{email}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
              Langkah Konfirmasi
            </p>

            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3"
              >
                {/* Step number circle */}
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-bold text-zinc-300">
                  {s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200">{s.title}</p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {/* Primary: Open Gmail */}
            <button
              onClick={handleOpenGmail}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-950 hover:bg-white active:scale-[0.98] transition-all"
            >
              <Mail className="h-4 w-4" />
              Buka Gmail Sekarang
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>

            {/* Resend / Countdown */}
            <button
              disabled={!canResend}
              onClick={() => {
                setCountdown(60)
                setCanResend(false)
                // Implementasi kirim ulang jika diperlukan
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {canResend ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Kirim Ulang Email
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Kirim ulang dalam {countdown}s
                </>
              )}
            </button>
          </div>

          {/* Footer note */}
          <div className="border-t border-zinc-800/80 bg-zinc-950/30 px-6 py-3">
            <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
              Tidak menemukan email? Cek folder <span className="text-zinc-500 font-medium">Spam</span> atau{' '}
              <span className="text-zinc-500 font-medium">Promosi</span> di Gmail Anda.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-5 text-center">
          <Link
            to="/register"
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 decoration-zinc-800 transition-colors"
          >
            Gunakan email lain? Daftar ulang
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
