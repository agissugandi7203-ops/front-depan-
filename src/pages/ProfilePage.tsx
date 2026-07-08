import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Phone, Calendar, Shield, ArrowLeft,
  Edit3, Save, X, Loader2, Lock, CheckCircle, Eye, EyeOff, Menu, Camera
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/auth'
import { cn } from '@/lib/utils'
import axios from 'axios'
import { Navbar } from '@/components/Navbar'

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
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [namaPanggilan, setNamaPanggilan] = useState('')
  const [nomorTelepon, setNomorTelepon] = useState('')

  const [showPwdForm, setShowPwdForm] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 800KB for Base64 metadata storage
    if (file.size > 800 * 1024) {
      setError('Ukuran file foto maksimal 800KB.')
      return
    }

    setAvatarUploading(true)
    setError('')
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        const { error: updateErr } = await supabase.auth.updateUser({
          data: { avatar_url: base64String }
        })
        if (updateErr) throw updateErr

        await checkMe()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui foto profil.')
    } finally {
      setAvatarUploading(false)
    }
  }

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
      <Navbar activeItem="Profil" />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-8 space-y-5">
        {/* Avatar + Name Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
        >
          <div className={cn('h-20 bg-gradient-to-r opacity-50', avatarGradient)} />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative group/avatar cursor-pointer">
                <input 
                  type="file" 
                  id="avatar-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
                <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.nama_lengkap} 
                      className="w-20 h-20 rounded-2xl object-cover shadow-xl border-4 border-zinc-900 bg-zinc-950 transition duration-300 group-hover/avatar:opacity-75"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl border-4 border-zinc-900 bg-gradient-to-br transition duration-300 group-hover/avatar:opacity-75',
                        avatarGradient
                      )}
                    >
                      {initials}
                    </div>
                  )}
                  {/* Overlay kamera saat hover */}
                  <div className="absolute inset-0 bg-black/45 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition duration-300">
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 text-zinc-200 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-zinc-200" />
                    )}
                  </div>
                </label>
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
