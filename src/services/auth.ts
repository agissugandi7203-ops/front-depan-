/**
 * Auth service untuk Admin Login menggunakan Supabase Auth
 */
import { createClient } from '@supabase/supabase-js'

// Ambil env variables Supabase (sama dengan yang dipakai backend)
// Untuk frontend, kita pakai VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const authService = {
  /**
   * Login admin dengan email dan password
   */
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  /**
   * Logout admin
   */
  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  /**
   * Ambil sesi user saat ini
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) return null
    return data.session
  },

  /**
   * Cek apakah user sedang login
   */
  isAuthenticated: async (): Promise<boolean> => {
    const session = await authService.getSession()
    return session !== null
  },

  /**
   * Daftarkan listener perubahan auth state
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}
