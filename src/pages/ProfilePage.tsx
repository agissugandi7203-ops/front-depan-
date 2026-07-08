import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Phone, Calendar, Shield, ArrowLeft,
  Edit3, Save, X, Loader2, Lock, CheckCircle, Eye, EyeOff, Menu
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/auth'
import { cn } from '@/lib/utils'
import axios from 'axios'

import { API_BASE_URL } from '@/lib/apiConfig'


const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'Super Admin', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  admin: { label: 'Admin', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  petugas: { label: 'Petugas', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  user: { label: 'Warga', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('')

const GRADIENT_BG = [
  'from-violet-600 to-purple-800',
  'from-sky-600 to-blue-800',
  'from-emerald-600 to-teal-800',
  'from-rose-600 to-pink-800',
  'from-amber-600 to-orange-800',
]

function getAvatarGradient(name: string) {
  return GRADIENT_BG[(name.charCodeAt(0) || 0) % GRADIENT_BG.length]
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, checkMe, logout } = useAuthStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [namaPanggilan, setNamaPanggilan] = useState('')
  const [nomorTelepon, setNomorTelepon] = useState('')

  const [showPwdForm, setShowPwdForm] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user) {
      setNamaPanggilan(user.nama_panggilan || '')
      setNomorTelepon(user.nomor_telepon || '')
    }
  }, [user, isAuthenticated, navigate])

  const handleSaveProfile = async () => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('komunitas_access_token')
      await axios.patch(`${API_BASE_URL}/api/auth/profile`, {
        nama_panggilan: namaPanggilan.trim(),
        nomor_telepon: nomorTelepon.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await checkMe()
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan profil.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { setPwdError('Password tidak cocok.'); return }
    if (newPwd.length < 8) { setPwdError('Password minimal 8 karakter.'); return }
    setPwdSaving(true)
    setPwdError('')
    try {
      const { error: pwdErr } = await supabase.auth.updateUser({ password: newPwd })
      if (pwdErr) throw pwdErr
      setPwdSuccess(true)
      setNewPwd('')
      setConfirmPwd('')
      setShowPwdForm(false)
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err: any) {
      setPwdError(err.message || 'Gagal mengubah password.')
    } finally {
      setPwdSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user
  const initials = getInitials(user.nama_lengkap || user.email || 'U')
  const avatarGradient = getAvatarGradient(user.nama_lengkap || 'U')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-[60px] border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-6 md:px-10 flex items-center justify-between">
        {/* Brand/Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group select-none cursor-pointer"
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
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors tracking-[-0.01em] cursor-pointer"
            onClick={() => navigate('/about')}
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
                className="h-8 px-3 text-[11px] font-semibold rounded-lg tracking-wide border bg-zinc-950 text-zinc-100 border-zinc-800 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Profil
              </button>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Masuk
              </button>
              <button
                onClick={() => navigate('/register')}
                className="h-8 px-3 text-[11px] font-bold rounded-lg tracking-wide border bg-white hover:bg-zinc-100 text-zinc-950 border-white transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Daftar
              </button>
            </div>
          )}
          
          <button
            onClick={() => navigate('/chat')}
            className="h-8 px-4 text-[12px] font-medium rounded-md tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] shadow-none cursor-pointer bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white"
          >
            Mulai Percakapan
          </button>
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
      </header>

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
                  }, 100)
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
                  }, 100)
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
                className="text-left text-[15px] font-medium text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/about')
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
                    <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200">
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
                    className="w-full h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-100 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Profil Saya
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                      navigate('/')
                    }}
                    className="w-full h-10 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-rose-400 hover:text-rose-350 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/login')
                    }}
                    className="h-10 border border-zinc-800 hover:bg-zinc-900 text-zinc-250 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Masuk
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/register')
                    }}
                    className="h-10 bg-indigo-650 hover:bg-indigo-600 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Daftar
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/chat')
                }}
                className="w-full h-10 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-sm transition-all active:scale-[0.98] mt-2 cursor-pointer shadow-lg"
              >
                Mulai Percakapan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Avatar + Name Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
        >
          <div className={cn('h-20 bg-gradient-to-r opacity-50', avatarGradient)} />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl border-4 border-zinc-900 bg-gradient-to-br',
                  avatarGradient
                )}
              >
                {initials}
              </div>
              <span className={cn('px-3 py-1 rounded-full border text-xs font-semibold', roleInfo.bg, roleInfo.color)}>
                {roleInfo.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100">{user.nama_lengkap}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">@{user.nama_panggilan || '—'}</p>
          </div>
        </motion.div>

        {/* Feedback */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4" /> Profil berhasil disimpan!
          </motion.div>
        )}
        {pwdSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4" /> Password berhasil diubah!
          </motion.div>
        )}

        {/* Info Fields */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800"
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Informasi Akun</p>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setError('') }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition">
                  <X className="h-3.5 w-3.5" /> Batal
                </button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-60">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Simpan
                </button>
              </div>
            )}
          </div>

          {/* Static fields */}
          {[
            { icon: User, label: 'Nama Lengkap', value: user.nama_lengkap },
            { icon: Mail, label: 'Email', value: user.email },
            { icon: Calendar, label: 'Tanggal Lahir', value: user.tanggal_lahir ? new Date(user.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <div className="p-2 rounded-lg bg-zinc-800"><Icon className="h-4 w-4 text-zinc-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm text-zinc-200 mt-0.5 truncate">{value || '—'}</p>
              </div>
            </div>
          ))}

          {/* Editable: Nama Panggilan */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="p-2 rounded-lg bg-zinc-800"><User className="h-4 w-4 text-purple-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Nama Panggilan</p>
              {editing ? (
                <input value={namaPanggilan} onChange={e => setNamaPanggilan(e.target.value)}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Nama panggilan..." />
              ) : (
                <p className="text-sm text-zinc-200 mt-0.5">{user.nama_panggilan || '—'}</p>
              )}
            </div>
          </div>

          {/* Editable: Nomor Telepon */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="p-2 rounded-lg bg-zinc-800"><Phone className="h-4 w-4 text-purple-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Nomor Telepon</p>
              {editing ? (
                <input value={nomorTelepon} onChange={e => setNomorTelepon(e.target.value)}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                  placeholder="+62..." />
              ) : (
                <p className="text-sm text-zinc-200 mt-0.5">{user.nomor_telepon || '—'}</p>
              )}
            </div>
          </div>

          {error && <div className="px-5 py-3 text-sm text-rose-400 bg-rose-500/5">{error}</div>}
        </motion.div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800"><Lock className="h-4 w-4 text-zinc-400" /></div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Ubah Password</p>
                <p className="text-[11px] text-zinc-500">Gunakan password yang kuat dan unik</p>
              </div>
            </div>
            <button onClick={() => { setShowPwdForm(v => !v); setPwdError('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">
              {showPwdForm ? 'Batal' : 'Ubah'}
            </button>
          </div>

          {showPwdForm && (
            <div className="border-t border-zinc-800 px-5 pb-5 pt-4 space-y-3">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Password baru (min. 8 karakter)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Konfirmasi password baru"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
              />
              {pwdError && <p className="text-xs text-rose-400">{pwdError}</p>}
              <button
                onClick={handleChangePassword}
                disabled={pwdSaving || !newPwd || !confirmPwd}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Simpan Password Baru
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
