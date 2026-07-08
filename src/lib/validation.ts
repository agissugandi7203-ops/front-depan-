import { z } from 'zod'

// ── Validation regex patterns ──
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_ID: /^\+62\d{10,13}$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  NO_XSS: /^[^<>]*$/, // Disallow HTML tags
} as const

// ── Zod Schemas for Form Validations ──

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email terlalu panjang'),
  password: z.string()
    .min(1, 'Password wajib diisi')
    .min(8, 'Password minimal harus 8 karakter')
    .max(128, 'Password terlalu panjang'),
})

export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email terlalu panjang'),
  password: z.string()
    .min(8, 'Password minimal harus 8 karakter')
    .max(128, 'Password terlalu panjang')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung minimal 1 huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka')
    .regex(/[^A-Za-z0-9]/, 'Password harus mengandung minimal 1 karakter spesial/simbol'),
  konfirmasiPassword: z.string()
    .min(1, 'Konfirmasi password wajib diisi'),
  nama_lengkap: z.string()
    .min(1, 'Nama lengkap wajib diisi sesuai KTP')
    .max(255, 'Nama lengkap terlalu panjang')
    .regex(PATTERNS.NO_XSS, 'Nama tidak boleh mengandung karakter < atau >'),
  nama_panggilan: z.string()
    .min(1, 'Nama panggilan wajib diisi')
    .max(100, 'Nama panggilan terlalu panjang')
    .regex(PATTERNS.NO_XSS, 'Nama panggilan tidak boleh mengandung karakter < atau >'),
  tanggal_lahir: z.string()
    .regex(PATTERNS.DATE_ISO, 'Format tanggal lahir harus YYYY-MM-DD')
    .refine((val) => {
      const birthDate = new Date(val)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age >= 13 && age <= 120
    }, 'Usia minimal harus 13 tahun untuk mendaftar'),
  nomor_telepon: z.string()
    .regex(PATTERNS.PHONE_ID, 'Format nomor telepon harus diawali +62 diikuti 10-13 digit angka (Contoh: +6281234567890)'),
}).refine(data => data.password === data.konfirmasiPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['konfirmasiPassword'],
})

export const reportSchema = z.object({
  reporterName: z.string()
    .min(1, 'Nama pelapor tidak boleh kosong')
    .max(100, 'Nama pelapor terlalu panjang')
    .regex(PATTERNS.NO_XSS, 'Nama tidak boleh mengandung HTML'),
  reporterContact: z.string()
    .min(1, 'Kontak pelapor tidak boleh kosong')
    .max(100, 'Kontak pelapor terlalu panjang')
    .regex(PATTERNS.PHONE_ID, 'Format kontak pelapor harus nomor telepon aktif (+62...)'),
  category: z.string().min(1, 'Kategori tidak boleh kosong'),
  description: z.string()
    .min(10, 'Deskripsi laporan minimal 10 karakter')
    .max(5000, 'Deskripsi terlalu panjang (maks 5000 karakter)')
    .regex(PATTERNS.NO_XSS, 'Deskripsi tidak boleh mengandung HTML'),
})

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Pesan tidak boleh kosong')
    .max(10000, 'Pesan tidak boleh melebihi 10.000 karakter'),
})

// ── Sanitize input string helper (XSS prevention) ──
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// ── Password strength evaluation ──
export function getPasswordStrength(password: string): {
  score: number // 0 to 4
  label: string
  color: string
} {
  if (!password) return { score: 0, label: 'Sangat Lemah', color: 'bg-red-500' }
  
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  // Cap score at 4 max
  score = Math.min(score, 4)
  
  const labels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat']
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']
  
  return { score, label: labels[score], color: colors[score] }
}

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ReportFormData = z.infer<typeof reportSchema>
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>
