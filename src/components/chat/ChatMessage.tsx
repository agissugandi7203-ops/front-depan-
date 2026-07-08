import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message, SearchResultItem, SearchProgress } from '@/types'
import { cn, formatTime } from '@/lib/utils'
import { AlertCircle, Volume2, VolumeX, ChevronDown, ChevronUp, Copy, Check, Globe, Search, RefreshCw } from 'lucide-react'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  searchPhase?: SearchProgress | null
  onOpenSearchResults?: (results: SearchResultItem[]) => void
}

// ─── Inline markdown renderer ─────────────────────────────────────────────────
const parseLinks = (text: string) => {
  const parts = text.split(/(\[.*?\]\(.*?\))/g)
  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const url = linkMatch[2]
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 font-medium transition-colors"
        >
          {linkText}
        </a>
      )
    }
    return part
  })
}

const parseItalics = (text: string) => {
  const parts = text.split(/(\*.*?\*)/g)
  return parts.flatMap((part, i): any => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return [
        <em key={i} className="italic text-zinc-200">
          {parseLinks(part.slice(1, -1))}
        </em>
      ]
    }
    return parseLinks(part)
  })
}

const parseMarkdownText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.flatMap((part, i): any => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return [
        <strong key={`b-${i}`} className="font-semibold text-zinc-100">
          {parseItalics(part.slice(2, -2))}
        </strong>
      ]
    }
    return parseItalics(part)
  })
}

const renderContent = (text: string) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let isMermaidBlock = false
  let codeBuffer: string[] = []

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    
    // Toggle code block state and skip the delimiter line
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      isMermaidBlock = trimmed.startsWith('```mermaid')
      
      if (!isMermaidBlock && inCodeBlock) {
        // Start buffering non-mermaid code lines
        codeBuffer = []
      } else if (!isMermaidBlock && !inCodeBlock) {
        // Flush code buffer to layout
        elements.push(
          <pre key={`code-${idx}`} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg overflow-x-auto text-[12px] font-mono text-zinc-300 font-normal leading-relaxed my-3 max-w-full">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
      }
      return
    }
    
    // Process lines inside a code block
    if (inCodeBlock) {
      if (!isMermaidBlock) {
        codeBuffer.push(line)
      }
      return
    }

    // Skip empty lines or render as small vertical separator
    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} className="h-2" />)
      return
    }

    // Render markdown horizontal dividers as clean borders
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={`hr-${idx}`} className="border-t border-zinc-800 my-4" />)
      return
    }

    // Render markdown headers
    if (trimmed.startsWith('#')) {
      const headerLevel = (trimmed.match(/^#+/) || ['#'])[0].length
      const cleanHeader = trimmed.replace(/^#+\s*/, '')
      const headerClass = headerLevel === 1 
        ? "text-base font-bold text-zinc-100 mt-5 mb-2.5 tracking-tight" 
        : headerLevel === 2
        ? "text-sm font-semibold text-zinc-100 mt-4 mb-2 tracking-tight"
        : "text-xs font-semibold text-zinc-200 mt-3 mb-1.5"
      elements.push(
        <div key={`h-${idx}`} className={headerClass}>
          {parseMarkdownText(cleanHeader)}
        </div>
      )
      return
    }

    // Unordered lists (support nested levels)
    const bulletMatch = line.match(/^(\s*)([*+-])\s+(.*)/)
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length
      const indentLevel = Math.floor(indentSpaces / 2)
      const content = bulletMatch[3]
      elements.push(
        <div 
          key={`li-${idx}`} 
          className="text-sm text-zinc-300 leading-relaxed mb-2 flex items-start gap-2.5"
          style={{ paddingLeft: `${indentLevel * 1.25}rem` }}
        >
          <span className="text-zinc-500 shrink-0 select-none mt-1.5 text-[9px]">•</span>
          <span className="flex-1">{parseMarkdownText(content)}</span>
        </div>
      )
      return
    }

    // Ordered lists (support nested levels)
    const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/)
    if (numberMatch) {
      const indentSpaces = numberMatch[1].length
      const indentLevel = Math.floor(indentSpaces / 2)
      const num = numberMatch[2]
      const content = numberMatch[3]
      elements.push(
        <div 
          key={`ol-${idx}`} 
          className="text-sm text-zinc-300 leading-relaxed mb-2 flex items-start gap-2.5"
          style={{ paddingLeft: `${indentLevel * 1.25}rem` }}
        >
          <span className="text-zinc-500 shrink-0 select-none font-mono text-[11px] mt-0.5 min-w-[14px] text-right">{num}.</span>
          <span className="flex-1">{parseMarkdownText(content)}</span>
        </div>
      )
      return
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-sm text-zinc-300 leading-relaxed mb-2 font-normal font-sans">
        {parseMarkdownText(trimmed)}
      </p>
    )
  })

  return elements
}

// ─── Extract steps for flowchart ─────────────────────────────────────────────
const parseSteps = (text: string): string[] => {
  const steps: string[] = []
  let inCodeBlock = false
  text.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (inCodeBlock) return // Ignore lines inside code blocks (like mermaid)

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      steps.push(trimmed.substring(2).replace(/\*\*/g, ''))
    } else {
      const m = trimmed.match(/^\d+\.\s+(.*)/)
      if (m) steps.push(m[1].replace(/\*\*/g, ''))
    }
  })
  return steps
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ChatMessage({ message, isStreaming, searchPhase, onOpenSearchResults }: ChatMessageProps) {
  const isUser  = message.role === 'user'
  const isError = message.isError

  const [showFlow,   setShowFlow]   = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [copied,     setCopied]     = useState(false)

  const handleCopy = () => {
    if (typeof textContent !== 'string') return
    navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse multimodal message content
  let textContent = message.content
  let imageUrl = message.image || ''

  if (Array.isArray(message.content)) {
    const textItem = message.content.find((item: any) => item.type === 'text')
    const imageItem = message.content.find((item: any) => item.type === 'image_url')
    textContent = textItem ? textItem.text : ''
    imageUrl = imageItem ? (imageItem.image_url?.url || imageItem.image_url) : ''
  }

  const steps   = parseSteps(typeof textContent === 'string' ? textContent : '')
  const hasSteps = steps.length > 1 && !isUser

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      const clean = (typeof textContent === 'string' ? textContent : '').replace(/\*\*|#+|\*|-/g, '')
      const utt   = new SpeechSynthesisUtterance(clean)
      utt.lang  = 'id-ID'
      utt.onend   = () => setIsSpeaking(false)
      utt.onerror = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utt)
    }
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex gap-4 px-4 md:px-6 py-6 border-b border-zinc-800/50',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* AI Avatar */}
      {!isUser && (
        isError ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm bg-rose-950 border border-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
        ) : (
          <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="w-8 h-8 object-contain rounded-md flex-shrink-0 mt-0.5" />
        )
      )}

      {/* Message body */}
      <div className={cn('flex flex-col gap-1.5', isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[85%]')}>

        {/* Bubble */}
        <div className={cn(
          isUser
            ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-2xl px-4 py-3 hover:border-zinc-600 transition-colors duration-250'
            : isError
              ? 'bg-rose-950/50 border border-rose-800/60 rounded-2xl px-4 py-3'
              : 'bg-transparent border-none px-0 py-0.5'
        )}>
          {isUser ? (
            <div className="flex flex-col gap-2.5">
              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900/50 shadow-inner max-w-sm sm:max-w-md">
                  <img
                    src={imageUrl}
                    alt="Pesan gambar"
                    className="max-h-64 w-full object-contain rounded-xl hover:scale-[1.01] transition-transform duration-200"
                  />
                </div>
              )}
              {textContent && (
                <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-zinc-100 font-normal tracking-wide whitespace-pre-wrap">
                  {textContent}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-zinc-300 relative">
              {textContent === '' && isStreaming ? (
                searchPhase ? (
                  <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-250 select-none">
                      <Search className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {searchPhase.phase === 1 
                          ? 'Menelusuri 15 situs pemeriksa fakta...' 
                          : 'Menelusuri 65 portal berita & sumber terpercaya...'}
                      </span>
                      <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate max-w-sm pl-5.5 select-none">
                      Mencari di: {searchPhase.sites.slice(0, 5).join(', ')}...
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-[12px] font-medium text-zinc-500 select-none">
                    <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />
                    <span>Menganalisis hasil pencarian...</span>
                  </div>
                )
              ) : (
                <>
                  {renderContent(typeof textContent === 'string' ? textContent : '')}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 align-middle animate-pulse rounded-sm" />
                  )}
                  {message.searchResults && message.searchResults.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex">
                      <button
                        onClick={() => onOpenSearchResults?.(message.searchResults!)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-850 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-all duration-200 shadow-sm"
                      >
                        <Globe className="w-3 h-3 text-indigo-400 animate-pulse" />
                        <span>{message.searchResults.length} Referensi Penelusuran</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — timestamp + controls */}
        <div className={cn('flex items-center gap-3 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-zinc-600 font-mono tabular-nums">{formatTime(message.timestamp)}</span>

          {!isUser && !isError && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSpeak}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {isSpeaking
                  ? <><VolumeX className="w-3 h-3 text-rose-400" /> <span>Hentikan</span></>
                  : <><Volume2 className="w-3 h-3" /> <span>Baca</span></>
                }
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {copied
                  ? <><Check className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400">Tersalin</span></>
                  : <><Copy className="w-3 h-3" /> <span>Salin</span></>
                }
              </button>

              {hasSteps && (
                <button
                  onClick={() => setShowFlow(!showFlow)}
                  className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {showFlow
                    ? <><ChevronUp className="w-3 h-3" /> <span>Sembunyikan alur</span></>
                    : <><ChevronDown className="w-3 h-3" /> <span>Lihat alur</span></>
                  }
                </button>
              )}
            </div>
          )}
        </div>

        {/* Flowchart */}
        <AnimatePresence>
          {hasSteps && showFlow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden w-full"
            >
              <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Alur Prosedur</span>
                  <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800 px-2 py-0.5 rounded-full">{steps.length} langkah</span>
                </div>
                <div className="relative pl-7 border-l-2 border-zinc-800 space-y-4">
                  {steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.25 }}
                      className="relative p-3 rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
                    >
                      <span className="absolute left-[-40px] top-3 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-400 flex items-center justify-center select-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[12px] text-zinc-400 leading-relaxed font-light">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
