import { useState, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { chatService } from '@/services/api'
import { Message, SearchResultItem, SearchProgress } from '@/types'
import { generateId } from '@/lib/utils'

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${host}:3000`

export function useChat() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchPhase, setSearchPhase] = useState<SearchProgress | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const { 
    sessions, 
    currentSessionId, 
    addMessage, 
    updateMessage,
    createSession, 
    setCurrentSession 
  } = useChatStore()

  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  const sendMessage = useCallback(async (content: string, image?: { base64: string; mimeType: string }) => {
    if ((!content.trim() && !image) || isLoading) return

    setIsLoading(true)
    setError(null)
    setSearchPhase(null)
    setSearchResults([])

    // Ambil riwayat percakapan yang ada sebelum menambahkan pesan baru (untuk stateless guest mode)
    const previousHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      image: image ? `data:${image.mimeType};base64,${image.base64}` : undefined,
    }

    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = createSession()
      setCurrentSession(sessionId)
    }

    addMessage(sessionId, userMessage)

    // Tambah placeholder asisten kosong untuk di-stream
    const assistantMessageId = generateId()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    addMessage(sessionId, assistantMessage)
    setStreamingMessageId(assistantMessageId)

    try {
      const token = localStorage.getItem('komunitas_access_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content.trim(),
          sessionId,
          image: image?.base64,
          mimeType: image?.mimeType,
          history: !token ? previousHistory : undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Gagal terhubung dengan asisten AI')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('ReadableStream tidak didukung pada browser ini.')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        buffer = lines.pop() || ''

        for (const line of lines) {
          const cleanedLine = line.trim()
          if (!cleanedLine) continue

          if (cleanedLine.startsWith('data:')) {
            const jsonStr = cleanedLine.slice(5).trim()
            try {
              const event = JSON.parse(jsonStr)

              if (event.type === 'search_progress') {
                setSearchPhase({
                  phase: event.phase,
                  count: event.count,
                  sites: event.sites
                })
              } else if (event.type === 'search_result') {
                setSearchResults(event.items || [])
                setSearchPhase(null)
                updateMessage(sessionId, assistantMessageId, {
                  searchResults: event.items || []
                })
              } else if (event.type === 'token') {
                accumulatedContent += event.content
                updateMessage(sessionId, assistantMessageId, {
                  content: accumulatedContent,
                })
              } else if (event.type === 'error') {
                throw new Error(event.message || 'Terjadi kesalahan saat memproses streaming')
              } else if (event.type === 'done') {
                setStreamingMessageId(null)
              }
            } catch (e) {
              // Abaikan parsing parsial
            }
          }
        }
      }

    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pesan')
      updateMessage(sessionId, assistantMessageId, {
        content: err.message || 'Maaf, terjadi kesalahan pada server. Silakan coba lagi.',
        isError: true,
      })
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
      setSearchPhase(null)
    }
  }, [currentSessionId, sessions, isLoading, addMessage, updateMessage, createSession, setCurrentSession])

  const validateClaim = useCallback(async (claim: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await chatService.validateClaim(claim)
      return result
    } catch (err: any) {
      setError(err.message || 'Gagal verifikasi klaim')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const summarizeDocument = useCallback(async (text: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await chatService.summarizeDocument(text)
      return result
    } catch (err: any) {
      setError(err.message || 'Gagal meringkas dokumen')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    messages,
    isLoading,
    error,
    searchPhase,
    searchResults,
    streamingMessageId,
    sendMessage,
    validateClaim,
    summarizeDocument,
    clearError,
    currentSessionId,
    sessionId: currentSessionId,
    sessions,
  }
}

