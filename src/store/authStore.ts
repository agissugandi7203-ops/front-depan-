import { create } from 'zustand'
import axios from 'axios'
import { supabase } from '@/services/auth'

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${host}:3000`

export interface UserProfile {
  id: string
  email: string
  nama_lengkap: string
  nama_panggilan: string
  tanggal_lahir: string
  nomor_telepon: string
  role: 'user' | 'petugas' | 'admin' | 'superadmin'
}

interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<UserProfile>
  register: (data: Omit<UserProfile, 'id' | 'role'> & { password: string }) => Promise<void>
  logout: () => Promise<void>
  checkMe: () => Promise<UserProfile | null>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('komunitas_access_token'),
  isAuthenticated: !!localStorage.getItem('komunitas_access_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password })
      const { session, user } = response.data

      localStorage.setItem('komunitas_access_token', session.access_token)
      localStorage.setItem('komunitas_refresh_token', session.refresh_token)

      set({
        user,
        token: session.access_token,
        isAuthenticated: true,
        isLoading: false,
      })

      return user
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal masuk. Silakan periksa kembali kredensial Anda.'
      set({ error: errMsg, isLoading: false })
      throw new Error(errMsg)
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, data)
      set({ isLoading: false })
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal melakukan registrasi.'
      set({ error: errMsg, isLoading: false })
      throw new Error(errMsg)
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      // Sign out from local Supabase Auth for completeness
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Supabase signout warning:', err)
    } finally {
      localStorage.removeItem('komunitas_access_token')
      localStorage.removeItem('komunitas_refresh_token')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  checkMe: async () => {
    const token = localStorage.getItem('komunitas_access_token')
    if (!token) {
      set({ user: null, isAuthenticated: false })
      return null
    }

    set({ isLoading: true })
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const { user } = response.data
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
      return user
    } catch (err) {
      console.warn('Token expired or invalid. Clearing session.', err)
      localStorage.removeItem('komunitas_access_token')
      localStorage.removeItem('komunitas_refresh_token')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return null
    }
  }
}))
