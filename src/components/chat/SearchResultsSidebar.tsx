import { motion } from 'framer-motion'
import { X, ExternalLink, Globe } from 'lucide-react'
import { SearchResultItem } from '@/types'

interface SearchResultsSidebarProps {
  isOpen: boolean
  onClose: () => void
  results: SearchResultItem[]
}

export function SearchResultsSidebar({ isOpen, onClose, results }: SearchResultsSidebarProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Hasil Penelusuran</h3>
          <p className="text-[11px] text-zinc-500 font-medium">
            Ditemukan {results.length} rujukan di internet
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
            <Globe className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p className="text-xs">Belum ada hasil penelusuran</p>
          </div>
        ) : (
          results.map((item, idx) => {
            const domain = item.source || 'Pencarian Web'
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={idx}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-200 group"
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3"
                >
                  {/* Favicon */}
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    {item.link ? (
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.link).hostname}`}
                        alt={domain}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            const icon = document.createElement('span')
                            icon.className = 'text-[10px] font-bold text-zinc-400 uppercase'
                            icon.innerText = domain.charAt(0)
                            parent.appendChild(icon)
                          }
                        }}
                        className="w-4 h-4 rounded-sm object-contain"
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-medium text-zinc-400 group-hover:text-indigo-400 transition-colors truncate">
                        {domain}
                      </span>
                      <ExternalLink className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-[13px] font-semibold text-zinc-200 leading-snug mb-1 group-hover:text-zinc-100 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-3">
                      {item.snippet}
                    </p>
                  </div>
                </a>
              </motion.div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
