import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatSession, Message } from '@/types'
import { generateId } from '@/lib/utils'

interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string | null
  isSidebarOpen: boolean
  createSession: (title?: string, userId?: string | null) => string
  deleteSession: (sessionId: string) => void
  setCurrentSession: (sessionId: string) => void
  renameSession: (sessionId: string, title: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void
  toggleSidebar: () => void
  clearAllSessions: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isSidebarOpen: true,

      createSession: (title?: string, userId?: string | null) => {
        const { sessions } = get()
        // If there's an empty session that matches this userId, reuse it
        const emptySession = sessions.find((s) => s.messages.length === 0 && (s.userId === userId || (!s.userId && !userId)))
        
        // Clean up empty sessions except the matched one
        const cleanedSessions = sessions.filter((s) => s.messages.length > 0 || (emptySession && s.id === emptySession.id))
        
        if (emptySession) {
          set({
            sessions: cleanedSessions,
            currentSessionId: emptySession.id,
          })
          return emptySession.id
        }

        const id = generateId()
        const newSession: ChatSession = {
          id,
          title: title || `Chat ${new Date().toLocaleDateString('id-ID')}`,
          messages: [],
          userId: userId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set({
          sessions: [newSession, ...cleanedSessions],
          currentSessionId: id,
        })
        return id
      },

      deleteSession: (sessionId: string) => {
        const { sessions, currentSessionId } = get()
        const filtered = sessions.filter(
          (s) => s.id !== sessionId && (s.messages.length > 0 || s.id === currentSessionId)
        )
        let nextActiveId = currentSessionId

        if (currentSessionId === sessionId) {
          nextActiveId = filtered.length > 0 ? filtered[0].id : null
        }

        set({
          sessions: filtered,
          currentSessionId: nextActiveId,
        })
      },

      setCurrentSession: (sessionId: string) => {
        const { sessions } = get()
        const cleanedSessions = sessions.filter((s) => s.messages.length > 0 || s.id === sessionId)
        set({ 
          sessions: cleanedSessions,
          currentSessionId: sessionId 
        })
      },

      renameSession: (sessionId: string, title: string) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          ),
        }))
      },

      addMessage: (sessionId: string, message: Message) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: new Date(),
                  title: session.messages.length === 0 && message.role === 'user'
                    ? message.content.substring(0, 30) + '...'
                    : session.title,
                }
              : session
          ),
        }))
      },

      updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }))
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
      },

      clearAllSessions: () => {
        set({ sessions: [], currentSessionId: null })
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
)
