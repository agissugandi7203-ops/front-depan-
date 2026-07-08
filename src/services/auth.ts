/**
 * Auth service untuk Admin Login menggunakan Supabase Auth
 */
import { createClient } from '@supabase/supabase-js'

// Ambil env variables Supabase (sama dengan yang dipakai backend)
// Untuk frontend, kita pakai VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qaenpoqkwixilczeqwyv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZW5wb3Frd2l4aWxjemVxd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTc3NzksImV4cCI6MjA5ODg5Mzc3OX0.o4ZfQSsA_6vpTbEvTh9mBgVXix2jbeaL6T5GCNeNnp4'


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
