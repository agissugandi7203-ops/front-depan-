import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'
import { ChatSidebar } from './ChatSidebar'

// Lazy load large subcomponents to optimize initial page loading
const CitizenReportModal = React.lazy(() => import('./CitizenReportModal').then(m => ({ default: m.CitizenReportModal })))
const SearchResultsSidebar = React.lazy(() => import('./SearchResultsSidebar').then(m => ({ default: m.SearchResultsSidebar })))

import { Button } from '@/components/ui/button'
import { Home, Menu, X, FileText, Activity, Users, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { citizenService, CitizenReport } from '@/services/api'

// Suggested prompts for empty state
const SUGGESTED = [
  { icon: Users,    text: 'Bagaimana cara melapor kekerasan anak ke KPAI?',    label: 'Perlindungan Anak' },
  { icon: FileText, text: 'Apa saja syarat mendaftar bantuan sosial PKH?',      label: 'Bansos & PKH' },
  { icon: Activity, text: 'Kontak darurat ambulans PMI di daerah saya',          label: 'Kesehatan Darurat' },
]

import { API_BASE_URL as API_BASE, getWsUrl } from '@/lib/apiConfig'


export function ChatInterface() {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    error, 
    clearError,
    searchPhase,
    streamingMessageId,
    sessionId: chatSessionId,
  } = useChat()

  const { isSidebarOpen, toggleSidebar, sessions, currentSessionId, createSession, setCurrentSession } = useChatStore()
  const { user, token } = useAuthStore()
  const { openModal } = useAuthModalStore()
  
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [activeReport, setActiveReport] = useState<CitizenReport | null>(null)
  const [wsMessages, setWsMessages] = useState<any[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const wsReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmountedRef = useRef(false)

  // AI Quota state
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [quotaLimit, setQuotaLimit] = useState<number>(7)
  const [quotaResetAt, setQuotaResetAt] = useState<string | null>(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isSearchSidebarOpen, setIsSearchSidebarOpen] = useState(false)
  const [activeSearchResults, setActiveSearchResults] = useState<any[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const isResizingRef = useRef(false)
  const navigate = useNavigate()

  // Fetch AI quota on mount and after each message
  const fetchQuota = useCallback(async () => {
    try {
      const sessionId = chatSessionId || localStorage.getItem('chat-storage') || ''
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const url = `${API_BASE}/api/chat/quota${!token && sessionId ? `?sessionId=${sessionId}` : ''}`
      const res = await fetch(url, { headers })
      if (res.ok) {
        const data = await res.json()
        setQuotaRemaining(data.remaining)
        setQuotaLimit(data.limit)
        setQuotaResetAt(data.resetAt)
        setQuotaExhausted(data.remaining === 0)
      }
    } catch { /* silent */ }
  }, [token, chatSessionId])

  useEffect(() => { fetchQuota() }, [fetchQuota])

  // Re-check quota after each AI message completes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      fetchQuota()
    }
  }, [isLoading, messages.length, fetchQuota])

  // WebSocket connect function with auto-reconnect
  const connectWs = useCallback((reportId: string) => {
    if (isUnmountedRef.current) return
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }
    const wsUrl = getWsUrl(`/api/ws/chat?reportId=${reportId}&userId=${user?.id || 'citizen'}&role=user&name=${encodeURIComponent(user?.nama_lengkap || 'Warga')}`)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type === 'message' && payload.data) {
          setWsMessages((prev) => {
            const exists = prev.some(m => m.id === payload.data.id || (m.created_at === payload.data.created_at && m.message === payload.data.message))
            if (exists) return prev
            return [...prev, payload.data]
          })
        }
      } catch (err) {
        console.error('Failed to parse websocket payload:', err)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      if (!isUnmountedRef.current) {
        wsReconnectTimer.current = setTimeout(() => connectWs(reportId), 3000)
      }
    }

    ws.onerror = () => {
      setWsConnected(false)
      ws.close()
    }
  }, [user])

  // Load report detail and connect to room WebSocket
  useEffect(() => {
    isUnmountedRef.current = false
    if (!activeReportId) {
      setWsMessages([])
      setActiveReport(null)
      setWsConnected(false)
      if (wsRef.current) wsRef.current.close()
      return
    }

    const fetchReportDetail = async () => {
      try {
        const contact = user?.email || user?.nomor_telepon || localStorage.getItem('komunitas_guest_contact') || ''
        if (contact) {
          const res = await citizenService.getReports(contact)
          if (res?.reports) {
            const found = res.reports.find(r => r.id === activeReportId)
            if (found) setActiveReport(found)
          }
        }
      } catch (err) { console.error('Failed to fetch report detail:', err) }
    }

    const fetchChatHistory = async () => {
      try {
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const response = await fetch(`${API_BASE}/api/reports/${activeReportId}/messages`, { headers })
        const result = await response.json()
        if (result.success && result.data) setWsMessages(result.data)
      } catch (err) { console.error('Failed to fetch report messages history:', err) }
    }

    fetchReportDetail()
    fetchChatHistory()
    connectWs(activeReportId)

    return () => {
      isUnmountedRef.current = true
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [activeReportId, user, token, connectWs])

  const handleOpenSearchResults = useCallback((results: any[]) => {
    setActiveSearchResults(results)
    setIsSearchSidebarOpen(true)
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const threshold = 150
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
    
    setShouldAutoScroll(isAtBottom)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      
      const newWidth = e.clientX
      const minWidth = 200
      const maxWidth = Math.max(280, window.innerWidth * 0.25) // Max 25% area
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
         setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!currentSessionId && !activeReportId) {
      if (sessions.length > 0) {
        setCurrentSession(sessions[0].id)
      } else {
        const id = createSession()
        setCurrentSession(id)
      }
    }
  }, [currentSessionId, sessions, createSession, setCurrentSession, activeReportId])

  // Combine standard and WS messages
  const displayedMessages = activeReportId
    ? wsMessages.map((m) => ({
        id: m.id || Math.random().toString(),
        role: (m.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `**${m.sender_name}**: ${m.message}`,
        timestamp: m.created_at
      }))
    : messages

  const lastMessageCountRef = useRef(displayedMessages.length)

  useEffect(() => {
    if (displayedMessages.length > lastMessageCountRef.current) {
      const lastMsg = displayedMessages[displayedMessages.length - 1]
      if (lastMsg && lastMsg.role === 'user') {
        setShouldAutoScroll(true)
      }
    }
    lastMessageCountRef.current = displayedMessages.length
  }, [displayedMessages])

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayedMessages, isLoading, shouldAutoScroll])

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 5000)
      return () => clearTimeout(t)
    }
  }, [error, clearError])

  useEffect(() => {
    setIsSearchSidebarOpen(false)
  }, [currentSessionId])

  // Main sending coordinator
  const handleSendMessage = async (text: string, image?: { base64: string; mimeType: string }) => {
    if (activeReportId) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const payload: any = {
          type: 'message',
          senderId: user?.id || 'citizen',
          senderType: 'user',
          senderName: user?.nama_lengkap || 'Warga',
          text: text
        }
        if (image) {
          payload.image = image.base64
          payload.mimeType = image.mimeType
        }
        wsRef.current.send(JSON.stringify(payload))
      } else {
        console.error('WebSocket is closed or offline')
      }
    } else {
      sendMessage(text, image)
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <motion.div
        animate={{ width: isSidebarOpen ? sidebarWidth : 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ borderRadius: 0 }}
        className={cn(
          'hidden lg:block shrink-0 overflow-hidden bg-transparent'
        )}
      >
        <div className="h-full py-2 pl-2">
          <div className="h-full rounded-2xl overflow-hidden" style={{ width: sidebarWidth - 8 }}>
            <ChatSidebar 
              onOpenReportModal={() => setIsReportModalOpen(true)} 
              activeReportId={activeReportId}
              onSelectReport={setActiveReportId}
            />
          </div>
        </div>
      </motion.div>

      {/* Drag Handle Divider */}
      {isSidebarOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="hidden lg:block w-1 h-full hover:bg-zinc-700 active:bg-indigo-600 cursor-col-resize shrink-0 transition-colors duration-150 relative z-30"
          title="Geser untuk mengubah ukuran sidebar"
        >
          <div className="absolute inset-y-0 left-[1px] w-[1px] bg-zinc-800/50" />
        </div>
      )}

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden fixed top-0 left-0 h-full w-64 z-50 shadow-xl"
            >
              <ChatSidebar 
                onOpenReportModal={() => { setIsReportModalOpen(true); setIsMobileSidebarOpen(false) }} 
                activeReportId={activeReportId}
                onSelectReport={(id) => { setActiveReportId(id); setIsMobileSidebarOpen(false) }}
              />
              <button
                className="absolute top-3.5 right-3 text-zinc-400 hover:text-zinc-100 transition-colors"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Header */}
        <ChatHeader
          title={activeReportId && activeReport ? `Aduan: ${activeReport.category}` : "Asisten KOMUNITAS"}
          subtitle={
            activeReportId
              ? wsConnected ? 'Terhubung dengan Petugas' : 'Menghubungkan kembali...'
              : "Terverifikasi"
          }
          leftActions={
            <>
              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md"
                onClick={toggleSidebar}
              >
                <Menu className="w-4 h-4" />
              </Button>
              {/* Mobile sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            </>
          }
        >
          {/* WS Connection Indicator (only when in report chat mode) */}
          {activeReportId && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium border',
                wsConnected
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
                  : 'bg-amber-950/50 border-amber-800/60 text-amber-400'
              )}
              title={wsConnected ? 'WebSocket terhubung' : 'Sedang menyambungkan kembali...'}
            >
              {wsConnected
                ? <Wifi className="w-3 h-3" />
                : <WifiOff className="w-3 h-3 animate-pulse" />
              }
              {wsConnected ? 'Online' : 'Offline'}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" />
          </Button>
        </ChatHeader>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 mt-3 p-3 rounded-lg border border-rose-800 bg-rose-950/50 text-rose-400 text-[12px] text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages — overflow-anchor:none prevents layout jumps during streaming */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          style={{ overflowAnchor: 'none' }}
        >
          {displayedMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full flex flex-col items-center justify-center px-4 text-center select-none"
            >
              {/* Icon */}
              <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="w-10 h-10 object-contain rounded-md mb-5" loading="lazy" />

              {/* Copy */}
              <h3 className="text-[17px] font-semibold text-zinc-100 tracking-[-0.03em] mb-2">
                Selamat datang di KOMUNITAS
              </h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed max-w-xs mb-8">
                Tanyakan apa saja seputar layanan publik, perlindungan sosial, atau validasi informasi.
              </p>

              {/* Suggestions */}
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 + 0.2, duration: 0.3 }}
                      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-left transition-all duration-200"
                      onClick={() => handleSendMessage(s.text)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 group-hover:border-zinc-600 flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[11px] text-zinc-500 font-medium tracking-wide mb-0.5">{s.label}</p>
                        <p className="text-[12px] text-zinc-300 leading-snug">{s.text}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <div className="max-w-5xl mx-auto w-full py-4 pb-32 px-4 md:px-6">
              {displayedMessages.map((message, index) => (
                <ChatMessage 
                  key={message.id || index} 
                  message={message} 
                  isStreaming={message.id === streamingMessageId}
                  searchPhase={message.id === streamingMessageId ? searchPhase : null}
                  onOpenSearchResults={handleOpenSearchResults}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-800 bg-gradient-to-t from-zinc-950 via-zinc-950/98 to-transparent pt-2 pb-4 px-4 md:px-6 w-full max-w-5xl mx-auto z-10">
          {/* Quota exhausted banner */}
          {!activeReportId && quotaExhausted && (
            <div className="mb-2 px-3 py-2 rounded-xl border border-amber-800/60 bg-amber-950/30 flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-amber-300">
                Kuota AI Anda hari ini telah habis ({quotaLimit} prompt).
                {quotaResetAt && (
                  <> Reset pukul <span className="font-semibold">{new Date(quotaResetAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>.</>
                )}
              </p>
              <span className="text-[10px] text-amber-500 shrink-0 font-medium">{user ? 'Akun Login' : 'Tamu'}</span>
            </div>
          )}
          {/* Quota counter (when not exhausted and not in WS mode) */}
          {!activeReportId && !quotaExhausted && quotaRemaining !== null && (
            <div className="mb-1.5 flex items-center justify-end gap-1.5 px-1">
              <span className={cn(
                'text-[10.5px] font-medium tabular-nums',
                quotaRemaining <= 2 ? 'text-amber-400' : 'text-zinc-600'
              )}>
                {quotaRemaining}/{quotaLimit} prompt tersisa
              </span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                quotaRemaining <= 2 ? 'bg-amber-400' : 'bg-zinc-700'
              )} />
            </div>
          )}
          {activeReportId && !user ? (
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex flex-col items-center text-center space-y-3.5 shadow-xl animate-in fade-in duration-200">
              <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[13px] font-bold text-zinc-100">Akses Chat Petugas Terkunci</h4>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed max-w-md">
                  Anda harus masuk (login) ke akun Anda terlebih dahulu untuk memulai obrolan/konsultasi dua arah dengan petugas pelayanan.
                </p>
              </div>
              <Button 
                onClick={() => openModal('login')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold tracking-wide uppercase px-5 py-2 rounded-xl border border-indigo-700/50 hover:border-indigo-600 shadow-md active:scale-95 transition-all"
              >
                Masuk ke Akun
              </Button>
            </div>
          ) : (
            <ChatInput
              onSend={handleSendMessage}
              isLoading={activeReportId ? false : isLoading}
              disabled={!activeReportId && quotaExhausted}
            />
          )}
        </div>
      </div>

      {/* Search Results Sidebar */}
      <AnimatePresence>
        {isSearchSidebarOpen && (
          <Suspense fallback={null}>
            <SearchResultsSidebar 
              isOpen={isSearchSidebarOpen} 
              onClose={() => setIsSearchSidebarOpen(false)} 
              results={activeSearchResults}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <Suspense fallback={null}>
        <CitizenReportModal 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)} 
          onSuccess={(reportId) => {
            setActiveReportId(reportId)
            setIsReportModalOpen(false)
          }}
        />
      </Suspense>
    </div>
  )
}

export default ChatInterface
