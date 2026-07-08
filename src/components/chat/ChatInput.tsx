import { useState, useRef, KeyboardEvent, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Mic, MicOff, Camera, X, Image, Video, Paperclip, FileText, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { chatService } from '@/services/api'

interface ChatInputProps {
  onSend: (message: string, image?: { base64: string; mimeType: string }) => void
  isLoading?: boolean
  disabled?: boolean
}

// Supported document file types for text extraction
const SUPPORTED_DOC_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'md', 'markdown']
const SUPPORTED_DOC_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
]

const isDocumentFile = (file: File): boolean => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return SUPPORTED_DOC_MIMES.includes(file.type) || 
         file.type.startsWith('text/') || 
         SUPPORTED_DOC_EXTENSIONS.includes(ext)
}

// File attachment preview state
interface AttachedFile {
  name: string
  size: number
  type: 'document' | 'image'
  text?: string // Extracted text for documents
  base64?: string // Base64 for images
  mimeType?: string
  icon: 'pdf' | 'word' | 'excel' | 'text' | 'image'
}

const getFileIcon = (file: File): AttachedFile['icon'] => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'word'
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (file.type.startsWith('image/')) return 'image'
  return 'text'
}

function ChatInputComponent({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null)
  const [attachedDoc, setAttachedDoc] = useState<AttachedFile | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  // Popover & Camera States
  const [showPopover, setShowPopover] = useState(false)
  const [showDocPopover, setShowDocPopover] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileDocInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const recognitionRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isDisabled = isLoading || !!disabled || ocrLoading || docLoading

  const handleSend = () => {
    const hasText = !!input.trim()
    const hasDocContext = !!attachedDoc?.text
    const hasImage = !!selectedImage

    if ((!hasText && !hasImage && !hasDocContext) || isDisabled) return

    let messageText = input.trim()
    if (hasDocContext && attachedDoc?.text) {
      // Prepend extracted document text as context
      messageText = messageText
        ? `${messageText}\n\n[Isi Berkas: ${attachedDoc.name}]\n${attachedDoc.text}`
        : `[Isi Berkas: ${attachedDoc.name}]\n${attachedDoc.text}`
    }

    onSend(
      messageText,
      selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : undefined
    )
    setInput('')
    setSelectedImage(null)
    setAttachedDoc(null)
    setDocError(null)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Browser tidak mendukung pengenalan suara.'); return }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      const rec = new SR()
      rec.lang = 'id-ID'
      rec.continuous = false
      rec.interimResults = false
      rec.onresult = (e: any) => setInput((p) => p ? `${p} ${e.results[0][0].transcript}` : e.results[0][0].transcript)
      rec.onend = () => setIsRecording(false)
      rec.onerror = () => setIsRecording(false)
      recognitionRef.current = rec
      setIsRecording(true)
      rec.start()
    }
  }

  // ─── Image File Handler ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = (reader.result as string).replace(/^data:image\/[a-z]+;base64,/, '')
      setSelectedImage({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      })
      setOcrLoading(false)
    }
    reader.onerror = () => {
      alert('Gagal membaca file gambar.')
      setOcrLoading(false)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Document File Handler ──────────────────────────────────────────────────
  const processDocumentFile = async (file: File) => {
    if (!isDocumentFile(file)) {
      setDocError('Format tidak didukung. Gunakan PDF, DOCX, XLSX, TXT, atau Markdown.')
      setTimeout(() => setDocError(null), 4000)
      return
    }

    setDocLoading(true)
    setDocError(null)
    try {
      const result = await chatService.extractFile(file)
      setAttachedDoc({
        name: file.name,
        size: file.size,
        type: 'document',
        text: result.text,
        icon: getFileIcon(file)
      })
    } catch (err: any) {
      setDocError(err.message || 'Gagal mengekstrak teks dari berkas.')
      setTimeout(() => setDocError(null), 4000)
    } finally {
      setDocLoading(false)
    }
  }

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processDocumentFile(file)
    if (fileDocInputRef.current) fileDocInputRef.current.value = ''
  }

  // ─── Paste Handler ──────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      // Image paste (existing)
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (!file) continue
        e.preventDefault()
        setOcrLoading(true)
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = (reader.result as string).replace(/^data:image\/[a-z]+;base64,/, '')
          setSelectedImage({
            base64: base64String,
            mimeType: file.type,
            name: file.name || `salinan_gambar_${Date.now()}.png`
          })
          setOcrLoading(false)
        }
        reader.onerror = () => {
          alert('Gagal membaca gambar dari clipboard.')
          setOcrLoading(false)
        }
        reader.readAsDataURL(file)
        return
      }

      // Document file paste
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && isDocumentFile(file)) {
          e.preventDefault()
          processDocumentFile(file)
          return
        }
      }
    }
  }

  // ─── Drag & Drop Handlers ───────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      setOcrLoading(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = (reader.result as string).replace(/^data:image\/[a-z]+;base64,/, '')
        setSelectedImage({ base64: base64String, mimeType: file.type, name: file.name })
        setOcrLoading(false)
      }
      reader.readAsDataURL(file)
    } else if (isDocumentFile(file)) {
      processDocumentFile(file)
    } else {
      setDocError('Format tidak didukung. Gunakan PDF, DOCX, XLSX, TXT, Markdown, atau gambar.')
      setTimeout(() => setDocError(null), 4000)
    }
  }

  // Camera capture methods
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 850 } } 
      })
      setStream(mediaStream)
      setIsCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      alert('Gagal mengakses kamera perangkat: ' + err)
      setIsCameraOpen(false)
    }
  }

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 850
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg')
      const base64String = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '')
      setSelectedImage({
        base64: base64String,
        mimeType: 'image/jpeg',
        name: `kamera_${Date.now()}.jpg`
      })
    }
    closeCamera()
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const hasAttachment = !!(selectedImage || attachedDoc || ocrLoading || docLoading)
  const canSend = !!(input.trim() || selectedImage || attachedDoc?.text)

  return (
    <div 
      ref={containerRef}
      className={cn(
        'w-full p-4 space-y-2 relative transition-all duration-200',
        isDragging && 'after:absolute after:inset-2 after:rounded-2xl after:border-2 after:border-dashed after:border-indigo-500/60 after:bg-indigo-950/10 after:z-10 after:pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay label */}
      {isDragging && (
        <div className="absolute inset-2 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-indigo-500/40 text-[12px] text-indigo-300 font-medium">
            <Paperclip className="w-3.5 h-3.5" />
            Lepaskan untuk melampirkan berkas
          </div>
        </div>
      )}

      {/* Pratinjau Gambar / Berkas / Status */}
      {hasAttachment && (
        <div className="flex flex-wrap items-end gap-3 px-1">
          {/* Image preview */}
          {selectedImage && (
            <div className="relative inline-block group">
              <div className="relative rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 transition-all group-hover:border-zinc-600">
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`}
                    alt="Upload preview"
                    className="h-16 w-16 object-cover"
                  />
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 h-5 w-5 bg-zinc-850 border border-zinc-750 text-zinc-400 hover:text-zinc-100 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95 z-20"
                  title="Hapus gambar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Document file preview */}
          {attachedDoc && (
            <div className="relative group flex items-center gap-2.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:border-zinc-600 transition-all max-w-[260px]">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                attachedDoc.icon === 'excel' ? 'bg-emerald-950/50 border border-emerald-800/60' :
                attachedDoc.icon === 'word' ? 'bg-blue-950/50 border border-blue-800/60' :
                attachedDoc.icon === 'pdf' ? 'bg-rose-950/50 border border-rose-800/60' :
                'bg-zinc-800 border border-zinc-700'
              )}>
                {attachedDoc.icon === 'excel' ? (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                ) : (
                  <FileText className={cn(
                    "w-4 h-4",
                    attachedDoc.icon === 'pdf' ? 'text-rose-400' :
                    attachedDoc.icon === 'word' ? 'text-blue-400' :
                    'text-zinc-400'
                  )} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-zinc-200 truncate">{attachedDoc.name}</span>
                <span className="text-[10px] text-zinc-500">{(attachedDoc.size / 1024).toFixed(1)} KB · Teks siap dikirim</span>
              </div>
              <button
                onClick={() => setAttachedDoc(null)}
                className="absolute top-1 right-1 h-4 w-4 text-zinc-500 hover:text-zinc-100 rounded-full flex items-center justify-center transition-colors"
                title="Hapus berkas"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {isRecording && (
            <span className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/50 border border-rose-800 px-3 py-1.5 rounded-full mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Mendengarkan...
            </span>
          )}

          {(ocrLoading || docLoading) && (
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-800/50 border border-zinc-700 px-3 py-1.5 rounded-full mb-1">
              <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
              {docLoading ? 'Mengekstrak berkas...' : 'Memuat gambar...'}
            </span>
          )}
        </div>
      )}

      {/* Document extraction error */}
      {docError && (
        <div className="px-1">
          <p className="text-[11px] text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg px-3 py-2">
            {docError}
          </p>
        </div>
      )}

      {/* Input row */}
      <div className={cn(
        'flex items-end gap-2.5 rounded-2xl border bg-zinc-900 p-3 transition-all duration-300',
        isRecording 
          ? 'border-rose-800 bg-rose-950/10' 
          : isDragging
            ? 'border-indigo-600 ring-1 ring-indigo-600/20'
            : 'border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-700/30'
      )}>
        {/* Camera Popover Trigger Button */}
        <div className="relative">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <button
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 duration-200",
              selectedImage 
                ? "text-indigo-400 bg-indigo-950/50 border border-indigo-800 hover:bg-indigo-900/30"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            )}
            disabled={isDisabled}
            onClick={() => setShowPopover(!showPopover)}
            title="Unggah gambar atau jepret foto"
          >
            <Camera className="w-4.5 h-4.5" />
          </button>

          {/* image popover menu */}
          {showPopover && (
            <>
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setShowPopover(false)}
              />
              <div className="absolute bottom-12 left-0 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  className="w-full text-left px-3.5 py-2.5 text-[11.5px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    setShowPopover(false)
                    fileInputRef.current?.click()
                  }}
                >
                  <Image className="w-4 h-4 text-zinc-500" />
                  Pilih Berkas Gambar
                </button>
                <button
                  className="w-full text-left px-3.5 py-2.5 text-[11.5px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    setShowPopover(false)
                    startCamera()
                  }}
                >
                  <Video className="w-4 h-4 text-zinc-500" />
                  Ambil Foto Kamera
                </button>
              </div>
            </>
          )}
        </div>

        {/* Document Attachment Button */}
        <div className="relative">
          <input 
            type="file" 
            ref={fileDocInputRef} 
            onChange={handleDocFileChange} 
            accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.markdown" 
            className="hidden" 
          />
          <button
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 duration-200",
              attachedDoc 
                ? "text-indigo-400 bg-indigo-950/50 border border-indigo-800 hover:bg-indigo-900/30"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            )}
            disabled={isDisabled}
            onClick={() => setShowDocPopover(!showDocPopover)}
            title="Lampirkan berkas dokumen (PDF, DOCX, XLSX, TXT, MD)"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          {/* doc popover */}
          {showDocPopover && (
            <>
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setShowDocPopover(false)}
              />
              <div className="absolute bottom-12 left-0 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3.5 py-2 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold border-b border-zinc-800 mb-1">
                  Lampirkan Berkas
                </div>
                <button
                  className="w-full text-left px-3.5 py-2.5 text-[11.5px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex items-center gap-2.5 transition-colors"
                  onClick={() => {
                    setShowDocPopover(false)
                    fileDocInputRef.current?.click()
                  }}
                >
                  <Paperclip className="w-4 h-4 text-zinc-500" />
                  Pilih Berkas Dokumen
                </button>
                <div className="px-3.5 py-2 text-[10px] text-zinc-600 leading-relaxed">
                  Dukung: PDF, Word, Excel, TXT, Markdown
                </div>
              </div>
            </>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            docLoading ? 'Mengekstrak berkas...'
            : ocrLoading ? 'Memproses berkas gambar...'
            : isRecording ? 'Mendengarkan...'
            : attachedDoc ? `Berkas dilampirkan: ${attachedDoc.name} — Kirim atau tulis pesan tambahan...`
            : 'Kirim pesan, gambar, atau berkas ke AI...'
          }
          disabled={isDisabled}
          rows={1}
          style={{ resize: 'none', minHeight: '36px', maxHeight: '140px' }}
          className="flex-1 bg-transparent text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none leading-relaxed py-1.5 disabled:opacity-40"
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 140) + 'px'
          }}
        />

        {/* Mic */}
        <button
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30',
            isRecording
              ? 'text-rose-400 bg-rose-950/50 border border-rose-800 hover:bg-rose-900/30'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          )}
          disabled={isLoading || !!disabled || ocrLoading || docLoading}
          onClick={toggleRecording}
          title={isRecording ? 'Hentikan rekaman' : 'Mulai rekam suara'}
        >
          {isRecording ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
        </button>

        {/* Send */}
        <Button
          onClick={handleSend}
          disabled={!canSend || isDisabled}
          className={cn(
            "flex-shrink-0 h-9 w-9 p-0 rounded-xl transition-all duration-200 font-medium",
            !canSend || isDisabled
              ? "bg-zinc-800 text-zinc-600 border border-zinc-700 opacity-40 cursor-not-allowed"
              : "bg-zinc-100 hover:bg-white text-zinc-900 shadow-sm active:scale-95"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-zinc-600 text-center tracking-wide">
        Shift+Enter untuk baris baru · Enter untuk mengirim · Drag &amp; drop berkas ke area ini
      </p>

      {/* Minimalist Web Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-sm w-full bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl aspect-[3/4] flex flex-col justify-between">
            {/* Header / Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={closeCamera}
                className="h-8 w-8 rounded-full bg-black/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Tutup Kamera"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Video Feed */}
            <div className="flex-1 w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover scale-x-[-1]" // mirror local feed
              />
            </div>

            {/* Camera Capture circle button (iOS style) */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center z-10">
              <button
                onClick={capturePhoto}
                className="h-15 w-15 rounded-full border-4 border-white bg-transparent hover:bg-white/20 active:scale-90 transition-all cursor-pointer flex items-center justify-center shadow-2xl"
                title="Ambil foto"
              >
                <span className="block h-10 w-10 rounded-full bg-white scale-100 hover:scale-95 active:scale-90 transition-transform" />
              </button>
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 mt-3 font-medium select-none">
            Arahkan kamera ke dokumen/objek dan klik tombol bulat
          </span>
        </div>
      )}
    </div>
  )
}

export const ChatInput = memo(ChatInputComponent)
ChatInput.displayName = 'ChatInput'
