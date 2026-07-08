import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Wifi, WifiOff, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  report_id: string
  sender_id: string
  sender_type: 'user' | 'petugas'
  sender_name: string
  message: string
  created_at: string
}

interface ChatWidgetProps {
  reportId: string
  className?: string
}

const API_BASE = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000`

export function ChatWidget({ reportId, className }: ChatWidgetProps) {
  const { user, token } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmountedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch message history
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true)
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const response = await fetch(`${API_BASE}/api/reports/${reportId}/messages`, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setMessages(result.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [reportId, token])

  // Connect to WebSocket room
  const connectWs = useCallback(() => {
    if (isUnmountedRef.current) return
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const role = user?.role && ['superadmin', 'admin', 'petugas'].includes(user.role) ? 'petugas' : 'user'
    const name = user?.nama_lengkap || 'Warga'
    
    const wsUrl = `${protocol}://${window.location.hostname}:3000/api/ws/chat?reportId=${reportId}&userId=${user?.id || 'citizen'}&role=${role}&name=${encodeURIComponent(name)}`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type === 'message' && payload.data) {
          setMessages((prev) => {
            const exists = prev.some(m => m.id === payload.data.id || (m.created_at === payload.data.created_at && m.message === payload.data.message))
            if (exists) return prev
            return [...prev, payload.data]
          })
        }
      } catch (err) {
        console.error('Failed to parse websocket message:', err)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      if (!isUnmountedRef.current) {
        reconnectTimerRef.current = setTimeout(connectWs, 3000)
      }
    }

    ws.onerror = () => {
      setWsConnected(false)
      ws.close()
    }
  }, [reportId, user])

  useEffect(() => {
    isUnmountedRef.current = false
    fetchHistory()
    connectWs()

    return () => {
      isUnmountedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [reportId, fetchHistory, connectWs])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputText.trim()) return

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const role = user?.role && ['superadmin', 'admin', 'petugas'].includes(user.role) ? 'petugas' : 'user'
      const payload = {
        type: 'message',
        senderId: user?.id || 'citizen',
        senderType: role,
        senderName: user?.nama_lengkap || 'Warga',
        text: inputText.trim()
      }
      wsRef.current.send(JSON.stringify(payload))
      setInputText('')
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl", className)}>
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Diskusi Pengaduan</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-colors",
          wsConnected 
            ? "bg-emerald-950/60 border-emerald-800/50 text-emerald-400" 
            : "bg-amber-950/60 border-amber-800/50 text-amber-400 animate-pulse"
        )}>
          {wsConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          {wsConnected ? "Online" : "Offline"}
        </div>
      </div>

      {/* Messages list */}
      <div 
        ref={scrollContainerRef}
        className="flex-grow p-4 overflow-y-auto space-y-3 scrollbar-thin"
      >
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Memuat riwayat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500 text-center px-4">
            <MessageSquare className="w-8 h-8 text-zinc-700 mb-1" />
            <span className="text-xs font-semibold text-zinc-400">Belum Ada Percakapan</span>
            <span className="text-[10.5px] text-zinc-500 leading-normal">
              Silakan tulis pesan Anda di bawah untuk memulai diskusi dengan petugas pelayanan.
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id || (msg.sender_type === 'user' && !user?.role);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex flex-col max-w-[85%] space-y-1",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <span className="text-[9px] text-zinc-500 font-semibold tracking-wide px-1">
                    {msg.sender_name} ({msg.sender_type === 'petugas' ? 'Petugas' : 'Warga'})
                  </span>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed shadow-sm",
                    isMe 
                      ? "bg-zinc-100 text-zinc-950 rounded-tr-none" 
                      : "bg-zinc-800 text-zinc-100 border border-zinc-750 rounded-tl-none"
                  )}>
                    {msg.message}
                  </div>
                  <span className="text-[8px] text-zinc-600 font-mono px-1">
                    {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 border-t border-zinc-850 bg-zinc-950/40 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={wsConnected ? "Ketik tanggapan Anda..." : "Sedang menghubungkan kembali..."}
          disabled={!wsConnected}
          className="flex-grow bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!wsConnected || !inputText.trim()}
          className="h-8 w-8 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shrink-0 disabled:opacity-30 disabled:hover:bg-zinc-100 transition active:scale-95 shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
