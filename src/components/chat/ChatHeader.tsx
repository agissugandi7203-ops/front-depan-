import { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'

interface ChatHeaderProps {
  children?: ReactNode
  leftActions?: ReactNode
  title?: string
  subtitle?: string
}

export function ChatHeader({ children, leftActions, title = "Asisten KOMUNITAS", subtitle = "Terverifikasi" }: ChatHeaderProps) {
  return (
    <div className="h-[60px] border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        {leftActions && (
          <div className="flex items-center">
            {leftActions}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-6 w-6 object-contain rounded-md" />
          <span className="font-medium text-[13px] text-zinc-200 tracking-[-0.02em]">{title}</span>
          <span className="hidden sm:flex text-[10px] text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-zinc-600" />
            {subtitle}
          </span>
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-1">
          {children}
        </div>
      )}
    </div>
  )
}
