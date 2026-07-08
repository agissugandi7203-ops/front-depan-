import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, Clock, CheckCircle2,
  XCircle, RefreshCw, ChevronLeft, ChevronRight,
  MessageSquare, Filter, AlertTriangle, Search,
  Loader2, TrendingUp, Eye, ChevronDown,
  Shield, LogOut, Activity, Plus, Trash2,
  Globe, Phone, Mail, MapPin, ExternalLink,
  BookOpen, FileSpreadsheet, X, Menu,
  Users, UserPlus, Edit2, KeyRound,
  FileUp, Sparkles
} from 'lucide-react'
import { 
  adminService, 
  chatService,
  CitizenReport, 
  DashboardStats, 
  PublicService, 
  ClaimVerification, 
  DocumentSummary, 
  ChatHistorySession,
  RAGDocument 
} from '@/services/api'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { ReportMap } from '@/components/admin/ReportMap'
import { cn } from '@/lib/utils'
import { getWsUrl } from '@/lib/apiConfig'

import { ChatWidget } from '@/components/chat/ChatWidget'

// ─── Animation presets ──────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Menunggu:  { color: 'text-amber-400',  bg: 'bg-amber-950/40 border border-amber-900/30',  dot: 'bg-amber-500',  icon: Clock },
  Diproses:  { color: 'text-blue-400',   bg: 'bg-blue-950/40 border border-blue-900/30',    dot: 'bg-blue-500',   icon: Activity },
  Selesai:   { color: 'text-emerald-400',bg: 'bg-emerald-950/40 border border-emerald-900/30', dot: 'bg-emerald-500', icon: CheckCircle2 },
  Ditolak:   { color: 'text-rose-400',    bg: 'bg-rose-950/40 border border-rose-900/30',       dot: 'bg-rose-500',    icon: XCircle },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  darurat:    'Darurat',
  layanan:    'Layanan Publik',
  hoaks:      'Hoaks/Misinformasi',
  infrastruktur: 'Infrastruktur',
  sosial:     'Sosial',
  lainnya:    'Lainnya',
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, colorClass }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; colorClass: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition duration-200"
    >
      <div className="flex items-start justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800', colorClass)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <TrendingUp className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-zinc-100">{value}</div>
        <div className="mt-0.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-[9px]">{label}</div>
        {sub && <div className="mt-1 text-[10px] text-zinc-500 font-normal leading-normal">{sub}</div>}
      </div>
    </motion.div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Menunggu
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {status}
    </span>
  )
}

const URGENCY_CONFIG = {
  Kritis: { color: 'text-rose-400', bg: 'bg-rose-950/40 border border-rose-900/30', dot: 'bg-rose-500' },
  Tinggi: { color: 'text-amber-400', bg: 'bg-amber-950/40 border border-amber-900/30', dot: 'bg-amber-500' },
  Sedang: { color: 'text-blue-400', bg: 'bg-blue-950/40 border border-blue-900/30', dot: 'bg-blue-500' },
  Rendah: { color: 'text-zinc-400', bg: 'bg-zinc-950/40 border border-zinc-900/30', dot: 'bg-zinc-550', dotColor: 'bg-zinc-500' },
} as const

function UrgencyBadge({ level }: { level?: string }) {
  const key = (level || 'Sedang') as keyof typeof URGENCY_CONFIG
  const cfg = URGENCY_CONFIG[key] || URGENCY_CONFIG.Sedang
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', 'dotColor' in cfg ? cfg.dotColor : cfg.dot)} />
      {key}
    </span>
  )
}

// ─── Interactive SVG Chart Components ────────────────────────────────────────
type TrendPoint = { label: string; value: number }

function InteractiveTrendChart({ reports }: { reports: any[] }) {
  const [timeframe, setTimeframe] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Aggregate trend data based on timeframe
  const data: TrendPoint[] = useMemo(() => {
    if (!reports || reports.length === 0) return []
    const now = new Date()
    
    if (timeframe === 'daily') {
      // Past 7 days
      const days: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        days[key] = 0
      }
      reports.forEach(r => {
        const date = new Date(r.created_at)
        const key = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        if (key in days) {
          days[key]++
        }
      });
      return Object.entries(days).map(([label, value]) => ({ label, value }))
    } else if (timeframe === 'weekly') {
      // Past 4 weeks
      const weeks = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4']
      const counts = [0, 0, 0, 0]
      reports.forEach(r => {
        const date = new Date(r.created_at)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays >= 0 && diffDays < 28) {
          const index = 3 - Math.floor(diffDays / 7)
          if (index >= 0 && index < 4) {
            counts[index]++
          }
        }
      });
      return weeks.map((label, i) => ({ label, value: counts[i] }))
    } else {
      // Monthly - past 6 months
      const months: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(now.getMonth() - i)
        const key = d.toLocaleDateString('id-ID', { month: 'long' })
        months[key] = 0
      }
      reports.forEach(r => {
        const date = new Date(r.created_at)
        const key = date.toLocaleDateString('id-ID', { month: 'long' })
        if (key in months) {
          months[key]++
        }
      });
      return Object.entries(months).map(([label, value]) => ({ label, value }))
    }
  }, [reports, timeframe])

  // SVG Chart Dimensions
  const width = 500
  const height = 240
  const paddingX = 40
  const paddingY = 30
  
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const maxValue = Math.max(...data.map(d => d.value), 4)
  
  // Calculate SVG Coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartWidth
    const y = paddingY + chartHeight - (d.value / maxValue) * chartHeight
    return { x, y, label: d.label, value: d.value }
  })

  // Generate smooth bezier curve path string
  const getBezierPath = () => {
    if (points.length === 0) return ''
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX1 = curr.x + (next.x - curr.x) / 2
      const cpY1 = curr.y
      const cpX2 = curr.x + (next.x - curr.x) / 2
      const cpY2 = next.y
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`
    }
    return path
  }

  // Handle Mouse Hover/Tracker
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left

    if (points.length === 0) return
    let closestIndex = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = idx
      }
    });

    setHoverIndex(closestIndex)
    setMousePos({ x: points[closestIndex].x, y: points[closestIndex].y })
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  const smoothPath = getBezierPath()
  const areaPath = (smoothPath && points.length > 0)
    ? `${smoothPath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`
    : ''

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3.5">
        <div>
          <h3 className="text-xs font-bold text-zinc-105 text-zinc-100 uppercase tracking-wider">Tren Aduan Masuk</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Analisis tren frekuensi pengaduan warga</p>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-855 border-zinc-800">
          {(['monthly', 'weekly', 'daily'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setTimeframe(tab); setHoverIndex(null); }}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-md capitalize transition",
                timeframe === tab 
                  ? "bg-zinc-800 text-indigo-400 border border-zinc-700/50" 
                  : "text-zinc-500 hover:text-zinc-350"
              )}
            >
              {tab === 'monthly' ? 'Bulanan' : tab === 'weekly' ? 'Mingguan' : 'Harian'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grids and Axes */}
          <line x1={paddingX} y1={paddingY + chartHeight} x2={width - paddingX} y2={paddingY + chartHeight} stroke="#1f1f23" strokeWidth="1" />
          <line x1={paddingX} y1={paddingY} x2={paddingX} y2={paddingY + chartHeight} stroke="#1f1f23" strokeWidth="1" />
          
          {/* Horizontal Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + chartHeight - ratio * chartHeight
            return (
              <line 
                key={idx} 
                x1={paddingX} 
                y1={y} 
                x2={width - paddingX} 
                y2={y} 
                stroke="#1f1f23" 
                strokeDasharray="3,3" 
                strokeWidth="1" 
              />
            )
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Area under curve */}
          {areaPath && (
            <path d={areaPath} fill="url(#chart-area-grad)" />
          )}

          {/* Render Smooth curve Line */}
          {smoothPath && (
            <path 
              d={smoothPath} 
              fill="none" 
              stroke="url(#chart-line-grad)" 
              strokeWidth="2.5" 
              filter="url(#glow-shadow)"
            />
          )}

          {/* Horizontal Labels */}
          {points.map((p, idx) => (
            <text 
              key={idx}
              x={p.x}
              y={paddingY + chartHeight + 16}
              textAnchor="middle"
              className="fill-zinc-500 font-mono text-[8.5px] uppercase tracking-wider font-semibold"
            >
              {p.label}
            </text>
          ))}

          {/* Interactive hover marker line & coordinates */}
          {hoverIndex !== null && (
            <>
              {/* Vertical tracking line */}
              <line 
                x1={mousePos.x} 
                y1={paddingY} 
                x2={mousePos.x} 
                y2={paddingY + chartHeight} 
                stroke="#10b981" 
                strokeWidth="1" 
                strokeDasharray="2,2" 
                opacity="0.6"
              />

              {/* Glowing Coordinate Dot */}
              <circle 
                cx={mousePos.x} 
                cy={mousePos.y} 
                r="7" 
                fill="#10b981" 
                opacity="0.3"
                className="animate-ping"
              />
              <circle 
                cx={mousePos.x} 
                cy={mousePos.y} 
                r="4.5" 
                fill="#10b981" 
                stroke="#022c22" 
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div 
            className="absolute z-10 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 shadow-xl text-[10.5px] text-zinc-300 pointer-events-none animate-in fade-in zoom-in-95 duration-100 font-mono"
            style={{ 
              left: `${(mousePos.x / width) * 100}%`, 
              top: `${(mousePos.y / height) * 100 - 35}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-zinc-500 font-semibold uppercase text-[8px] tracking-widest">{points[hoverIndex].label}</div>
            <div className="font-bold text-zinc-100 text-xs mt-0.5">{points[hoverIndex].value} Aduan</div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDonutChart({ statusCounts }: { statusCounts: Record<string, number> }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const rawData = useMemo(() => {
    return [
      { label: 'Menunggu', value: statusCounts.Menunggu || 0, color: '#f59e0b' },
      { label: 'Diproses', value: statusCounts.Diproses || 0, color: '#6366f1' },
      { label: 'Selesai', value: statusCounts.Selesai || 0, color: '#10b981' },
      { label: 'Ditolak', value: statusCounts.Ditolak || 0, color: '#f43f5e' },
    ]
  }, [statusCounts])

  const total = rawData.reduce((acc, curr) => acc + curr.value, 0)
  
  // Calculate polar slices
  let accumulatedAngle = -Math.PI / 2
  const slices = rawData.map(d => {
    const percent = total > 0 ? d.value / total : 0
    const angle = percent * Math.PI * 2
    const startAngle = accumulatedAngle
    const endAngle = accumulatedAngle + angle
    accumulatedAngle = endAngle
    return { ...d, percent, startAngle, endAngle }
  })

  // Convert polar coordinates to Cartesian
  const getCoordinatesForPercent = (angle: number, radius = 50) => {
    const x = 70 + Math.cos(angle) * radius
    const y = 70 + Math.sin(angle) * radius
    return { x, y }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 flex flex-col justify-between h-full space-y-4">
      <div className="border-b border-zinc-850 pb-3.5">
        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Status Laporan Warga</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">Proporsi penanganan aduan masuk</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-grow">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
            {total === 0 ? (
              <circle cx="70" cy="70" r="50" fill="none" stroke="#1f1f23" strokeWidth="8" />
            ) : (
              <>
                {/* Background track */}
                <circle cx="70" cy="70" r="50" fill="none" stroke="#1f1f23" strokeWidth="8" />
                {slices.map((slice, idx) => {
                  if (slice.percent === 0) return null
                  const isHovered = hoverIdx === idx
                  const radius = isHovered ? 51 : 50
                  const strokeW = isHovered ? 11 : 8

                  if (slice.percent >= 0.999) {
                    return (
                      <circle
                        key={idx}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={strokeW}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoverIdx(idx)}
                        onMouseLeave={() => setHoverIdx(null)}
                      />
                    )
                  }

                  const start = getCoordinatesForPercent(slice.startAngle, radius)
                  const end = getCoordinatesForPercent(slice.endAngle, radius)
                  const largeArcFlag = slice.percent > 0.5 ? 1 : 0
                  const pathData = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`

                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                    />
                  )
                })}
              </>
            )}
          </svg>

          {/* Text inside Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hoverIdx !== null ? (
              <>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{rawData[hoverIdx].label}</span>
                <span className="text-lg font-mono font-bold text-zinc-100 mt-0.5">{rawData[hoverIdx].value}</span>
                <span className="text-[9px] text-zinc-400 font-medium font-mono">({Math.round(slices[hoverIdx].percent * 100)}%)</span>
              </>
            ) : (
              <>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Total</span>
                <span className="text-xl font-bold text-zinc-100 font-mono tracking-tight">{total}</span>
                <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Aduan</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-grow space-y-2 text-[11px] text-zinc-400 w-full sm:w-auto">
          {slices.map((slice, idx) => {
            const isHovered = hoverIdx === idx
            return (
              <div 
                key={slice.label}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-lg border transition",
                  isHovered 
                    ? "bg-zinc-800 border-zinc-700 text-zinc-200" 
                    : "bg-transparent border-transparent"
                )}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="font-semibold text-zinc-300">{slice.label}</span>
                </div>
                <div className="font-mono text-zinc-400 font-bold">
                  {slice.value} <span className="text-zinc-650 text-[10px]">({Math.round(slice.percent * 100)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CategoryBarChart({ reports }: { reports: any[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const CATEGORY_LABELS: Record<string, string> = {
    darurat: 'Darurat',
    layanan: 'Layanan Publik',
    hoaks: 'Hoaks',
    infrastruktur: 'Infrastruktur',
    sosial: 'Sosial',
    lainnya: 'Lainnya',
  }

  const rawData = useMemo(() => {
    const counts: Record<string, number> = {
      darurat: 0,
      layanan: 0,
      hoaks: 0,
      infrastruktur: 0,
      sosial: 0,
      lainnya: 0,
    }
    
    reports.forEach(r => {
      if (r.category in counts) {
        counts[r.category]++
      } else {
        counts.lainnya++
      }
    })

    return Object.entries(counts).map(([key, value]) => ({
      key,
      label: CATEGORY_LABELS[key] || key,
      value
    }))
  }, [reports])

  const maxValue = Math.max(...rawData.map(d => d.value), 4)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
      <div className="border-b border-zinc-850 pb-3.5 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Kategori Aduan Warga</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Sebaran aduan berdasarkan kategori isu</p>
        </div>
      </div>

      <div className="h-[210px] w-full flex items-end justify-between pt-4 px-1 gap-2">
        {rawData.map((d, idx) => {
          const percent = (d.value / maxValue) * 100
          const isHovered = hoverIdx === idx
          return (
            <div 
              key={d.key} 
              className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {/* Tooltip on top */}
              <div 
                className={cn(
                  "mb-2 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-300 transition-all shadow-md",
                  isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                )}
              >
                {d.value}
              </div>

              {/* Bar */}
              <div className="w-full max-w-[28px] bg-zinc-950 border border-zinc-800 rounded-t-full h-[130px] flex items-end overflow-hidden relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${percent}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className={cn(
                    "w-full rounded-t-full bg-gradient-to-t from-teal-650 to-teal-400 bg-teal-500 transition-all",
                    isHovered ? "from-teal-500 to-teal-300 filter brightness-110 shadow-lg shadow-teal-500/20" : ""
                  )}
                />
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider text-center mt-3 truncate w-full max-w-[55px] transition",
                  isHovered ? "text-teal-400" : "text-zinc-500"
                )}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function StatusDropdown({ current, reportId, onUpdate }: {
  current: string; reportId: string; onUpdate: (id: string, status: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const statuses = ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'] as const

  const handleSelect = async (status: string) => {
    setOpen(false)
    if (status === current) return
    setLoading(true)
    await onUpdate(reportId, status)
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-zinc-400" /> : <ChevronDown className="h-3 w-3 text-zinc-400" />}
        Status
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded border border-zinc-800 bg-zinc-900 shadow-xl"
          >
            {statuses.map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold transition hover:bg-zinc-800',
                    s === current ? cfg.color : 'text-zinc-300'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                  {s}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Report Detail Modal ──────────────────────────────────────────────────────
function ReportDetailModal({ report, onClose, onUpdate, onOpenChat }: {
  report: CitizenReport; onClose: () => void; onUpdate: (id: string, status: string, note?: string) => Promise<void>;
  onOpenChat?: (reportId: string) => void
}) {
  const [adminNote, setAdminNote] = useState(report.admin_note || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (status: string) => {
    setSaving(true)
    await onUpdate(report.id, status, adminNote)
    setSaving(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl text-zinc-100"
      >
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950/50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">{report.reporter_name}</h3>
              <p className="mt-0.5 text-xs text-zinc-400">{report.reporter_contact}</p>
            </div>


            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={report.status as keyof typeof STATUS_CONFIG} />
              <UrgencyBadge level={(report as any).urgency_level} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5 text-xs">
          {(report as any).urgency_level && (
            <div className="rounded-lg border border-purple-900/20 bg-purple-950/10 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Analisis Urgensi AI</div>
              <p className="mt-1 text-zinc-300 text-[11px] leading-relaxed italic">
                {(report as any).urgency_reason || 'Urgensi dinilai secara otomatis berdasarkan isi aduan warga.'}
              </p>
            </div>
          )}
          <div>
            <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Kategori</div>
            <div className="text-zinc-300">{CATEGORY_LABELS[report.category] || report.category}</div>
          </div>
          <div>
            <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Deskripsi Laporan</div>
            <div className="rounded border border-zinc-800 bg-zinc-950 p-3.5 leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {report.description}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Sesi ID</div>
              <div className="text-zinc-400 font-mono select-all truncate">{report.session_id || '-'}</div>
            </div>
            <div>
              <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Tanggal Masuk</div>
              <div className="text-zinc-400">
                {new Date(report.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Catatan Penanganan Admin</div>
            <textarea
              rows={3}
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Tambahkan instruksi tindakan lapangan atau catatan progres..."
              className="w-full resize-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200 placeholder-zinc-650 placeholder-zinc-500 outline-none transition focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 border-t border-zinc-800 p-5 bg-zinc-950/50">
          {onOpenChat && ['Menunggu', 'Diproses'].includes(report.status) && (
            <button
              onClick={() => {
                onOpenChat(report.id)
                onClose()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-900 bg-purple-950/40 text-purple-400 py-2 text-xs font-bold tracking-wider uppercase transition hover:bg-purple-950/60 active:scale-[0.98]"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Buka Obrolan Chat Warga
            </button>
          )}
          <div className="flex gap-2 w-full">
            {(['Diproses', 'Selesai', 'Ditolak'] as const).map(s => {
              const c = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => handleSave(s)}
                  disabled={saving}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded border py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50',
                    c.bg, c.color, 'hover:brightness-110'
                  )}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Service Detail Modal ──────────────────────────────────────────────────
function ServiceDetailModal({ service, onClose }: { service: PublicService; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-6 scrollbar-thin text-zinc-100"
      >
        {/* Header */}
        <div className="border-b border-zinc-800 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            {service.institution}
          </span>
          <h3 className="text-base font-bold text-zinc-100 mt-1">{service.name}</h3>
          <span className="mt-2 inline-block rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
            {CATEGORY_LABELS[service.category] || service.category}
          </span>
        </div>

        {/* Body */}
        <div className="space-y-4 py-4 text-xs text-zinc-350 text-zinc-400">
          <div>
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 mb-1">Deskripsi Layanan</h4>
            <p className="leading-relaxed bg-zinc-950 border border-zinc-800 p-3 rounded-lg whitespace-pre-line text-zinc-300">
              {service.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 mb-2">Persyaratan Dokumen</h4>
              {service.requirements.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Tidak ada persyaratan khusus.</p>
              ) : (
                <ul className="space-y-1.5">
                  {service.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-400">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 mb-2">Alur Prosedur Pengajuan</h4>
              {service.procedures.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Tidak ada alur khusus.</p>
              ) : (
                <ol className="space-y-2">
                  {service.procedures.map((proc, idx) => (
                    <li key={idx} className="flex gap-2 text-zinc-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-zinc-400 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="mt-0.5">{proc}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Contact Details */}
          {(service.contactPhone || service.contactEmail || service.address || service.website) && (
            <div className="border-t border-zinc-800 pt-4">
              <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 mb-3">Informasi Kontak & Lokasi</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-400">
                {service.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{service.contactPhone}</span>
                  </div>
                )}
                {service.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{service.contactEmail}</span>
                  </div>
                )}
                {service.address && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <span>{service.address}</span>
                  </div>
                )}
                {service.website && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Globe className="h-3.5 w-3.5 text-zinc-500" />
                    <a
                      href={service.website.startsWith('http') ? service.website : `https://${service.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {service.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Add Service Modal ──────────────────────────────────────────────────────
function AddServiceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (payload: any) => Promise<void> }) {
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    category: 'layanan',
    description: '',
    requirementsText: '',
    proceduresText: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    website: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim() || !formData.institution.trim() || !formData.description.trim()) {
      setError('Nama layanan, lembaga, dan deskripsi wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const requirements = formData.requirementsText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)

      const procedures = formData.proceduresText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)

      const payload = {
        name: formData.name.trim(),
        institution: formData.institution.trim(),
        category: formData.category,
        description: formData.description.trim(),
        requirements,
        procedures,
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        address: formData.address.trim() || undefined,
        website: formData.website.trim() || undefined,
      }

      await onAdd(payload)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan layanan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-6 scrollbar-thin text-left text-xs text-zinc-300"
      >
        <div className="border-b border-zinc-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-zinc-100">Tambah Layanan RAG Baru</h3>
          <p className="text-zinc-500 mt-0.5 text-[11px]">
            Data akan secara otomatis diproses semantiknya untuk menghasilkan embedding vektor di backend.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-900/50 bg-red-950/50 p-3 text-red-400 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">Nama Layanan *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(v => ({ ...v, name: e.target.value }))}
                placeholder="Contoh: Pembuatan KTP Baru"
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Lembaga / Instansi *</label>
              <input
                type="text"
                required
                value={formData.institution}
                onChange={e => setFormData(v => ({ ...v, institution: e.target.value }))}
                placeholder="Contoh: Disdukcapil Kota"
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">Kategori *</label>
              <select
                value={formData.category}
                onChange={e => setFormData(v => ({ ...v, category: e.target.value }))}
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-zinc-900 text-zinc-200">{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={e => setFormData(v => ({ ...v, website: e.target.value }))}
                placeholder="Contoh: www.instansi.go.id"
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Deskripsi Layanan *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData(v => ({ ...v, description: e.target.value }))}
              placeholder="Berikan penjelasan singkat mengenai fungsi dan detail layanan..."
              className="w-full resize-none rounded border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 outline-none focus:border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">Persyaratan Dokumen (Satu per baris)</label>
              <textarea
                rows={4}
                value={formData.requirementsText}
                onChange={e => setFormData(v => ({ ...v, requirementsText: e.target.value }))}
                placeholder="Contoh:&#10;Kartu Keluarga Asli&#10;KTP Lama"
                className="w-full resize-none rounded border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Alur Prosedur (Satu per baris)</label>
              <textarea
                rows={4}
                value={formData.proceduresText}
                onChange={e => setFormData(v => ({ ...v, proceduresText: e.target.value }))}
                placeholder="Contoh:&#10;Isi Formulir&#10;Verifikasi di Loket"
                className="w-full resize-none rounded border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">No Telepon</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => setFormData(v => ({ ...v, contactPhone: e.target.value }))}
                placeholder="Contoh: 021-12345"
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Email Kontak</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => setFormData(v => ({ ...v, contactEmail: e.target.value }))}
                placeholder="Contoh: info@instansi.go.id"
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Alamat Kantor Fungsional</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData(v => ({ ...v, address: e.target.value }))}
              placeholder="Contoh: Jl. Merdeka No. 12, Kelurahan C"
              className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
            />
          </div>

          <div className="border-t border-zinc-800 pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded border border-zinc-800 bg-zinc-900 px-4 text-zinc-300 hover:bg-zinc-850 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 rounded bg-zinc-100 px-5 font-semibold text-zinc-950 shadow hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-950" />
                  Memproses Vektor RAG...
                </>
              ) : (
                'Simpan & Embed'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Add RAG Document Modal ──────────────────────────────────────────────────
function AddRAGDocumentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (payload: any, fileInfo?: any) => Promise<void> }) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [loadingStep, setLoadingStep] = useState<'idle' | 'extracting' | 'parsing'>('idle')
  const [error, setError] = useState<string | null>(null)
  
  // Verification step fields
  const [parsedData, setParsedData] = useState<any>(null)
  const [isVerified, setIsVerified] = useState(false)

  // Handlers for drag-drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf") || droppedFile.name.endsWith(".docx") || droppedFile.name.endsWith(".txt") || droppedFile.name.endsWith(".md")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Format file tidak didukung. Silakan gunakan PDF, DOCX, TXT, atau MD.")
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value)
    if (e.target.value.trim().length > 0) {
      setFile(null)
    }
  }

  const handleProcess = async () => {
    setError(null)
    if (!file && !pasteText.trim()) {
      setError("Silakan unggah dokumen PDF atau tempel teks panduan terlebih dahulu.")
      return
    }

    try {
      let documentText = ""
      if (file) {
        setLoadingStep('extracting')
        const extractRes = await chatService.extractFile(file)
        if (!extractRes || !extractRes.text) {
          throw new Error("Gagal mengekstrak teks dari file ini.")
        }
        documentText = extractRes.text
      } else {
        documentText = pasteText
      }

      setLoadingStep('parsing')
      const parseRes = await adminService.parseServiceDocument(documentText)
      if (parseRes && parseRes.success && parseRes.data) {
        setParsedData(parseRes.data)
        setIsVerified(true)
      } else {
        throw new Error("AI gagal mem-parsing detail dokumen.")
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses dokumen.")
    } finally {
      setLoadingStep('idle')
    }
  }

  const handleSave = async () => {
    setError(null)
    if (!parsedData || !parsedData.name || !parsedData.institution || !parsedData.description) {
      setError("Nama layanan, lembaga, dan deskripsi wajib diisi.")
      return
    }

    setLoadingStep('parsing')
    try {
      const payload = {
        name: parsedData.name.trim(),
        institution: parsedData.institution.trim(),
        category: parsedData.category || 'layanan',
        description: parsedData.description.trim(),
        requirements: Array.isArray(parsedData.requirements) ? parsedData.requirements : [],
        procedures: Array.isArray(parsedData.procedures) ? parsedData.procedures : [],
        contactPhone: parsedData.contactPhone?.trim() || undefined,
        contactEmail: parsedData.contactEmail?.trim() || undefined,
        address: parsedData.address?.trim() || undefined,
        website: parsedData.website?.trim() || undefined,
      }

      const fileInfo = file ? {
        filename: file.name,
        file_size: file.size,
        file_type: file.type || file.name.split('.').pop() || 'unknown',
      } : undefined

      await onAdd(payload, fileInfo)
      onClose()
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data ke database.")
    } finally {
      setLoadingStep('idle')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-6 scrollbar-thin text-left text-xs text-zinc-300"
      >
        <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Unggah Dokumen Layanan RAG Cerdas
            </h3>
            <p className="text-zinc-500 mt-0.5 text-[11px]">
              AI (Gemini-2.5-Flash) akan secara otomatis mengekstrak, mengategorikan, dan menstrukturkan berkas.
            </p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-center hover:bg-zinc-850 transition">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-900/50 bg-red-950/50 p-3 text-red-400 font-semibold">
            {error}
          </div>
        )}

        {!isVerified ? (
          <div className="space-y-4">
            {/* Drag Drop Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-7 text-center transition flex flex-col items-center justify-center gap-2.5 cursor-pointer",
                dragActive 
                  ? "border-indigo-500 bg-indigo-950/20" 
                  : "border-zinc-800 bg-zinc-950/45 hover:border-zinc-700"
              )}
              onClick={() => document.getElementById('rag-file-upload')?.click()}
            >
              <input 
                id="rag-file-upload"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow">
                <FileUp className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-200">
                  {file ? file.name : "Seret & Lepas Dokumen atau Klik untuk Cari"}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Mendukung PDF, DOCX, TXT, MD (Maksimal 10MB)
                </p>
              </div>
            </div>

            {/* Paste Text Option */}
            <div className="space-y-1.5">
              <label className="block text-zinc-500 font-medium">Atau Tempel Teks Dokumen Manual</label>
              <textarea
                value={pasteText}
                onChange={handlePasteChange}
                rows={6}
                placeholder="Tempel panduan birokrasi, alur pelayanan publik, atau ketentuan resmi di sini..."
                className="w-full rounded border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 outline-none focus:border-zinc-700 scrollbar-thin resize-none font-sans"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded border border-zinc-850 hover:bg-zinc-850 px-4 text-xs font-semibold hover:text-zinc-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcess}
                disabled={loadingStep !== 'idle' || (!file && !pasteText.trim())}
                className="h-9 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 text-xs shadow transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
              >
                {loadingStep === 'extracting' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-950" />
                    Mengekstrak Dokumen...
                  </>
                )}
                {loadingStep === 'parsing' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-950" />
                    Menganalisis dengan AI...
                  </>
                )}
                {loadingStep === 'idle' && (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-zinc-950" />
                    Ekstrak & Parse AI
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Verification Preview Step */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-indigo-950/20 border border-indigo-900/35 rounded-lg p-3 flex gap-2 text-indigo-400">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-200">Verifikasi Struktur AI Selesai!</p>
                <p className="text-[10px] text-zinc-450 leading-relaxed mt-0.5 text-indigo-350">
                  Berikut adalah metadata layanan yang diekstrak oleh AI. Anda dapat menyunting bidang di bawah ini jika diperlukan sebelum melakukan penyimpanan permanen ke basis RAG.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  required
                  value={parsedData.name}
                  onChange={e => setParsedData((v: any) => ({ ...v, name: e.target.value }))}
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Instansi Penyelenggara *</label>
                <input
                  type="text"
                  required
                  value={parsedData.institution}
                  onChange={e => setParsedData((v: any) => ({ ...v, institution: e.target.value }))}
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 mb-1">Kategori *</label>
                <select
                  value={parsedData.category}
                  onChange={e => setParsedData((v: any) => ({ ...v, category: e.target.value }))}
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-2.5 text-zinc-300 outline-none focus:border-zinc-700"
                >
                  <option value="darurat">Darurat</option>
                  <option value="layanan">Layanan Publik</option>
                  <option value="hoaks">Hoaks/Misinformasi</option>
                  <option value="infrastruktur">Infrastruktur</option>
                  <option value="sosial">Sosial</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Link/Website Resmi</label>
                <input
                  type="text"
                  value={parsedData.website || ''}
                  onChange={e => setParsedData((v: any) => ({ ...v, website: e.target.value }))}
                  placeholder="https://instansi.go.id"
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Deskripsi Singkat *</label>
              <textarea
                rows={3}
                required
                value={parsedData.description}
                onChange={e => setParsedData((v: any) => ({ ...v, description: e.target.value }))}
                className="w-full rounded border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 outline-none focus:border-zinc-700 scrollbar-thin resize-none font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 mb-1">Persyaratan Dokumen (Satu baris per syarat)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(parsedData.requirements) ? parsedData.requirements.join('\n') : ''}
                  onChange={e => setParsedData((v: any) => ({ ...v, requirements: e.target.value.split('\n') }))}
                  placeholder="Contoh:&#10;Kartu Keluarga Asli&#10;KTP Lama"
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 outline-none focus:border-zinc-700 scrollbar-thin resize-none font-mono text-[10.5px]"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Alur & Prosedur (Satu baris per langkah)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(parsedData.procedures) ? parsedData.procedures.join('\n') : ''}
                  onChange={e => setParsedData((v: any) => ({ ...v, procedures: e.target.value.split('\n') }))}
                  placeholder="Contoh:&#10;Datangi kantor kelurahan&#10;Serahkan berkas ke petugas"
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 outline-none focus:border-zinc-700 scrollbar-thin resize-none font-mono text-[10.5px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 mb-1">Telepon Kontak</label>
                <input
                  type="text"
                  value={parsedData.contactPhone || ''}
                  onChange={e => setParsedData((v: any) => ({ ...v, contactPhone: e.target.value }))}
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Email Kontak</label>
                <input
                  type="email"
                  value={parsedData.contactEmail || ''}
                  onChange={e => setParsedData((v: any) => ({ ...v, contactEmail: e.target.value }))}
                  className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Alamat Kantor/Instansi</label>
              <input
                type="text"
                value={parsedData.address || ''}
                onChange={e => setParsedData((v: any) => ({ ...v, address: e.target.value }))}
                className="w-full h-9 rounded border border-zinc-800 bg-zinc-950 px-3 text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsVerified(false)}
                className="h-9 rounded border border-zinc-850 hover:bg-zinc-850 px-4 text-xs font-semibold hover:text-zinc-100 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loadingStep !== 'idle'}
                className="h-9 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 text-xs shadow transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
              >
                {loadingStep !== 'idle' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-950" />
                    Menyimpan & Vektorisasi...
                  </>
                ) : (
                  'Verifikasi & Tambah Layanan'
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Active Chat Room Modal ────────────────────────────────────────────────
function ActiveChatModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl h-[80vh] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl text-zinc-100 flex flex-col"
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 p-4 shrink-0">
          <div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Obrolan Langsung Warga
            </h3>
            <p className="text-[10px] text-zinc-550 text-zinc-400 font-mono mt-0.5">ID Laporan: {reportId}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-850 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition shadow active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat Widget container */}
        <div className="flex-1 min-h-0 bg-zinc-950">
          <ChatWidget reportId={reportId} className="h-full border-none rounded-none shadow-none" />
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Chat Transcript Modal ──────────────────────────────────────────────────
function ChatTranscriptModal({ session, onClose }: { session: ChatHistorySession; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden text-zinc-100"
      >
        <div className="border-b border-zinc-800 p-5 flex justify-between items-center bg-zinc-950/50">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Transkrip Sesi Chat</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">ID: {session.session_id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-950/40 text-xs scrollbar-thin">
          {session.messages.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-8">Tidak ada riwayat pesan dalam sesi chat ini.</p>
          ) : (
            session.messages.map((m: any, idx: number) => {
              const isUser = m.role === 'user'
              let textContent = ''
              if (typeof m.content === 'string') {
                textContent = m.content
              } else if (Array.isArray(m.content)) {
                textContent = m.content.map((item: any) => item.text || '').join('\n')
              } else {
                textContent = JSON.stringify(m.content)
              }
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-lg p-3.5 leading-relaxed border",
                    isUser 
                      ? "ml-auto bg-zinc-800 text-zinc-100 border-zinc-700 rounded-tr-none" 
                      : "mr-auto bg-zinc-900 text-zinc-200 border-zinc-800 rounded-tl-none"
                  )}
                >
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider block mb-1", isUser ? "text-blue-400" : "text-emerald-400")}>
                    {isUser ? 'Warga / Pelapor' : 'Asisten AI'}
                  </span>
                  <p className="whitespace-pre-wrap">{textContent}</p>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-zinc-800 p-4 flex justify-end bg-zinc-950/50">
          <button onClick={onClose} className="rounded border border-zinc-800 bg-zinc-950 px-5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition active:scale-95">
            Tutup Transkrip
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  
  // ─── Active Tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'services' | 'claims' | 'summaries' | 'histories' | 'percakapan' | 'staff' | 'hoaks'>('overview')

  // ─── Mobile Sidebar State ─────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // ─── Overview States ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allReports, setAllReports] = useState<any[]>([])

  // ─── Reports States ───────────────────────────────────────────────────────
  const [reports, setReports] = useState<CitizenReport[]>([])
  const [activeChats, setActiveChats] = useState<CitizenReport[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null)
  
  // ─── Services States ──────────────────────────────────────────────────────
  const [services, setServices] = useState<PublicService[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceFilterCategory, setServiceFilterCategory] = useState('all')
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<PublicService | null>(null)
  const [servicesSubTab, setServicesSubTab] = useState<'list' | 'documents'>('list')
  const [ragDocuments, setRagDocuments] = useState<RAGDocument[]>([])
  const [ragDocSearch, setRagDocSearch] = useState('')
  const [ragDocLoading, setRagDocLoading] = useState(false)

  // ─── Claims States ───────────────────────────────────────────────────────
  const [claims, setClaims] = useState<ClaimVerification[]>([])
  const [claimsTotal, setClaimsTotal] = useState(0)
  const [claimsTotalPages, setClaimsTotalPages] = useState(1)
  const [claimsPage, setClaimsPage] = useState(1)
  const [claimsSearch, setClaimsSearch] = useState('')

  // ─── Summaries States ────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<DocumentSummary[]>([])
  const [summariesTotal, setSummariesTotal] = useState(0)
  const [summariesTotalPages, setSummariesTotalPages] = useState(1)
  const [summariesPage, setSummariesPage] = useState(1)
  const [summariesSearch, setSummariesSearch] = useState('')

  // ─── Chat Histories States ───────────────────────────────────────────────
  const [histories, setHistories] = useState<ChatHistorySession[]>([])
  const [historiesTotal, setHistoriesTotal] = useState(0)
  const [historiesTotalPages, setHistoriesTotalPages] = useState(1)
  const [historiesPage, setHistoriesPage] = useState(1)
  const [historiesSearch, setHistoriesSearch] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<ChatHistorySession | null>(null)
  const [activeChatReportId, setActiveChatReportId] = useState<string | null>(null)

  // ─── Global States ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // ─── Percakapan Aktif States (handled by reports state above) ───────────────

  // ─── Staff Management States ──────────────────────────────────────────────
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffSubTab, setStaffSubTab] = useState<'list' | 'create'>('list')
  const [staffForm, setStaffForm] = useState({
    email: '', password: '', nama_lengkap: '', nama_panggilan: '',
    no_telepon: '', tanggal_lahir: '', role: 'petugas'
  })
  const [staffFormLoading, setStaffFormLoading] = useState(false)
  const [staffFormError, setStaffFormError] = useState<string | null>(null)
  const [staffFormSuccess, setStaffFormSuccess] = useState<string | null>(null)

  // ─── Regional Chat Filters States ─────────────────────────────────────────
  const [chatFilterProvince, setChatFilterProvince] = useState('all')
  const [chatFilterCity, setChatFilterCity] = useState('all')
  const [chatFilterDistrict, setChatFilterDistrict] = useState('all')
  const [chatPage, setChatPage] = useState(1)

  // ─── Regional Reports Filters States ──────────────────────────────────────
  const [reportFilterProvince, setReportFilterProvince] = useState('all')
  const [reportFilterCity, setReportFilterCity] = useState('all')
  const [reportFilterDistrict, setReportFilterDistrict] = useState('all')

  // ─── Regional Map Filters States ──────────────────────────────────────────
  const [mapFilterProvince, setMapFilterProvince] = useState('all')
  const [mapFilterCity, setMapFilterCity] = useState('all')
  const [mapFilterDistrict, setMapFilterDistrict] = useState('all')

  // ─── Hoax Keywords States ─────────────────────────────────────────────────
  const [hoaxList, setHoaxList] = useState<any[]>([])
  const [hoaxTotal, setHoaxTotal] = useState(0)
  const [hoaxPage, setHoaxPage] = useState(1)
  const [hoaxTotalPages, setHoaxTotalPages] = useState(1)
  const [hoaxSearch, setHoaxSearch] = useState('')
  const [hoaxEditItem, setHoaxEditItem] = useState<any | null>(null)
  const [hoaxFormOpen, setHoaxFormOpen] = useState(false)
  const [hoaxFormData, setHoaxFormData] = useState({ keywords: '', title: '', explanation: '', source_url: '' })
  const [hoaxFormLoading, setHoaxFormLoading] = useState(false)
  const [hoaxFormError, setHoaxFormError] = useState<string | null>(null)

  // ─── Geo Statistics States ────────────────────────────────────────────────
  const [geoStats, setGeoStats] = useState<{ provinces: Record<string, number>; cities: Record<string, number>; districts: Record<string, number> }>({ provinces: {}, cities: {}, districts: {} })

  // ─── Reports Grouping & Regional States ──────────────────────────────────
  const [groupBy, setGroupBy] = useState<'none' | 'province' | 'city' | 'district'>('none')
  const [regionalStats, setRegionalStats] = useState<{ provinces: any[]; cities: any[]; districts: any[] } | null>(null)


  const loadStats = useCallback(async () => {
    try {
      const data = await adminService.getDashboardStats()
      setStats(data)

      // Fetch geographic data from all reports dynamically
      const res = await adminService.getReports(undefined, 1, 1000)
      const list = res.reports || []
      setAllReports(list)

      const provinces: Record<string, number> = {}
      const cities: Record<string, number> = {}
      const districts: Record<string, number> = {}
      
      list.forEach((r: any) => {
        if (r.province) provinces[r.province] = (provinces[r.province] || 0) + 1
        if (r.city) cities[r.city] = (cities[r.city] || 0) + 1
        if (r.district) districts[r.district] = (districts[r.district] || 0) + 1
      })
      
      setGeoStats({ provinces, cities, districts })

      // Load regional statistics from backend and format as array
      try {
        const regData = await adminService.getReportsStatistics()
        if (regData) {
          const formattedProvinces = Object.entries(regData.provinces || {}).map(([name, total]) => ({ name, total }))
          const formattedCities = Object.entries(regData.cities || {}).map(([name, total]) => ({ name, total }))
          const formattedDistricts = Object.entries(regData.districts || {}).map(([name, total]) => ({ name, total }))
          setRegionalStats({ provinces: formattedProvinces, cities: formattedCities, districts: formattedDistricts })
        }
      } catch (err) {
        console.error('Failed to load regional stats:', err)
      }
    } catch {
      // Stats remain fallback
    }
  }, [])

  const loadActiveChats = useCallback(async () => {
    try {
      const data = await adminService.getActiveChats()
      setActiveChats(data.data || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load active chats:', err)
    }
  }, [])

  const loadStaff = useCallback(async () => {
    try {
      const data = await adminService.getStaffUsers()
      setStaffList(data.data || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load staff:', err)
    }
  }, [])

  const loadHoaxes = useCallback(async (p = hoaxPage, search = hoaxSearch) => {
    try {
      const data = await adminService.getHoaxes(search || undefined, p, 15)
      setHoaxList(data.hoaxes || [])
      setHoaxTotal(data.total || 0)
      setHoaxTotalPages(data.totalPages || 1)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load hoaxes:', err)
    }
  }, [hoaxPage, hoaxSearch])

  const loadReports = useCallback(async (
    p = page,
    status = filterStatus,
    prov = reportFilterProvince,
    cit = reportFilterCity,
    dist = reportFilterDistrict
  ) => {
    try {
      const data = await adminService.getReports(
        status === 'all' ? undefined : status,
        p,
        10,
        prov === 'all' ? undefined : prov,
        cit === 'all' ? undefined : cit,
        dist === 'all' ? undefined : dist
      )
      setReports(data.reports)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
  }, [page, filterStatus, reportFilterProvince, reportFilterCity, reportFilterDistrict])

  const handleExportCSV = useCallback(() => {
    const filteredForExport = allReports.filter((r: any) => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      const matchProv = reportFilterProvince === 'all' || r.province === reportFilterProvince
      const matchCity = reportFilterCity === 'all' || r.city === reportFilterCity
      const matchDist = reportFilterDistrict === 'all' || r.district === reportFilterDistrict
      const matchSearch = !search.trim() || 
        r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
        r.reporter_contact.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchProv && matchCity && matchDist && matchSearch
    })

    const headers = ['ID', 'Sesi ID', 'Pengadu', 'Kontak', 'Kategori', 'Deskripsi Laporan', 'Provinsi', 'Kota', 'Kecamatan', 'Urgensi', 'Status', 'Catatan Admin', 'Tanggal Masuk']
    const rows = filteredForExport.map(r => [
      r.id,
      r.session_id || '',
      r.reporter_name,
      r.reporter_contact,
      CATEGORY_LABELS[r.category] || r.category,
      r.description.replace(/"/g, '""').replace(/\n/g, ' '),
      r.province || '',
      r.city || '',
      r.district || '',
      r.urgency_level || 'Sedang',
      r.status,
      (r.admin_note || '').replace(/"/g, '""').replace(/\n/g, ' '),
      new Date(r.created_at).toLocaleString('id-ID')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\r\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const dateStr = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `laporan_warga_komunitas_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [allReports, filterStatus, reportFilterProvince, reportFilterCity, reportFilterDistrict, search])

  const loadServices = useCallback(async (category = serviceFilterCategory) => {
    try {
      const data = await adminService.getServices(category)
      setServices(data.services)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load services:', err)
    }
  }, [serviceFilterCategory])

  const loadRAGDocuments = useCallback(async () => {
    setRagDocLoading(true)
    try {
      const data = await adminService.getRAGDocuments()
      if (data && data.success) {
        setRagDocuments(data.data)
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load RAG RAG documents:', err)
    } finally {
      setRagDocLoading(false)
    }
  }, [])

  const loadClaims = useCallback(async (p = claimsPage) => {
    try {
      const data = await adminService.getClaims(p, 10)
      setClaims(data.claims)
      setClaimsTotal(data.total)
      setClaimsTotalPages(data.totalPages)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load claims:', err)
    }
  }, [claimsPage])

  const loadSummaries = useCallback(async (p = summariesPage) => {
    try {
      const data = await adminService.getSummaries(p, 10)
      setSummaries(data.summaries)
      setSummariesTotal(data.total)
      setSummariesTotalPages(data.totalPages)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load summaries:', err)
    }
  }, [summariesPage])

  const loadHistories = useCallback(async (p = historiesPage) => {
    try {
      const data = await adminService.getChatHistories(p, 10)
      setHistories(data.histories)
      setHistoriesTotal(data.total)
      setHistoriesTotalPages(data.totalPages)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load histories:', err)
    }
  }, [historiesPage])

  // Ref to always hold fresh handlers for WebSocket broadcast messages without re-subscribing
  // Using null-initialized ref to avoid TDZ errors at component mount
  const refreshRefs = useRef<{
    loadStats: () => void
    loadReports: (...args: any[]) => void
    loadActiveChats: () => void
    page: number
    filterStatus: string
    reportFilterProvince: string
    reportFilterCity: string
    reportFilterDistrict: string
  } | null>(null)

  useEffect(() => {
    refreshRefs.current = {
      loadStats,
      loadReports,
      loadActiveChats,
      page,
      filterStatus,
      reportFilterProvince,
      reportFilterCity,
      reportFilterDistrict
    }
  })

  // Connect to Admin websocket on mount to receive real-time sync requests
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: any = null
    let isUnmounted = false

    const connectAdminWs = () => {
      if (isUnmounted) return
      if (ws) {
        ws.onclose = null
        ws.close()
      }

      const wsUrl = getWsUrl('/api/ws/admin')

      console.log('🔌 Connecting to Admin WebSocket:', wsUrl)
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          console.log('⚡ Admin WebSocket message received:', payload)
          if (payload && (payload.type === 'REPORT_CREATED' || payload.type === 'REPORT_UPDATED')) {
            console.log('🔄 Real-time trigger: Refreshing dashboard data...')
            const refs = refreshRefs.current
            if (!refs) return
            refs.loadStats()
            refs.loadReports(refs.page, refs.filterStatus, refs.reportFilterProvince, refs.reportFilterCity, refs.reportFilterDistrict)
            refs.loadActiveChats()
          }
        } catch (err) {
          console.error('Failed to parse admin ws message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔌 Admin WebSocket disconnected. Reconnecting...')
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectAdminWs, 3000)
        }
      }

      ws.onerror = () => {
        if (ws) ws.close()
      }
    }

    connectAdminWs()

    return () => {
      isUnmounted = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.close()
        ws = null
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    if (activeTab === 'overview') {
      await loadStats()
    } else if (activeTab === 'reports') {
      await Promise.all([loadStats(), loadReports(page, filterStatus)])
    } else if (activeTab === 'services') {
      await Promise.all([loadServices(serviceFilterCategory), loadRAGDocuments()])
    } else if (activeTab === 'claims') {
      await loadClaims(claimsPage)
    } else if (activeTab === 'summaries') {
      await loadSummaries(summariesPage)
    } else if (activeTab === 'histories') {
      await loadHistories(historiesPage)
    }
    setRefreshing(false)
  }, [
    loadStats, loadReports, page, filterStatus, activeTab, 
    loadServices, serviceFilterCategory, loadClaims, claimsPage, 
    loadSummaries, summariesPage, loadHistories, historiesPage,
    loadRAGDocuments
  ])

  // ─── Redirect if not logged in ─────────────────────────────────────────────
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('komunitas_access_token')
      if (!token) {
        navigate('/login')
      }
    }
    checkAuthStatus()
  }, [navigate])

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'overview') {
      loadStats().finally(() => setLoading(false))
    } else if (activeTab === 'reports') {
      Promise.all([loadStats(), loadReports(1, filterStatus)]).finally(() => setLoading(false))
    } else if (activeTab === 'services') {
      Promise.all([loadServices(serviceFilterCategory), loadRAGDocuments()]).finally(() => setLoading(false))
    } else if (activeTab === 'claims') {
      loadClaims(1).finally(() => setLoading(false))
    } else if (activeTab === 'summaries') {
      loadSummaries(1).finally(() => setLoading(false))
    } else if (activeTab === 'histories') {
      loadHistories(1).finally(() => setLoading(false))
    } else if (activeTab === 'percakapan') {
      loadActiveChats().finally(() => setLoading(false))
    } else if (activeTab === 'staff') {
      adminService.getStaffUsers().then(res => { if (res.success) setStaffList(res.data) }).finally(() => setLoading(false))
    } else if (activeTab === 'hoaks') {
      adminService.getHoaxes(undefined, 1, 50).then(res => {
        setHoaxList(res.hoaxes || [])
        setHoaxTotal(res.total || 0)
        setHoaxTotalPages(res.totalPages || 1)
      }).finally(() => setLoading(false))
    }
  }, [activeTab, filterStatus, serviceFilterCategory])

  useEffect(() => {
    if (!loading) {
      if (activeTab === 'reports') {
        loadReports(page, filterStatus, reportFilterProvince, reportFilterCity, reportFilterDistrict)
      } else if (activeTab === 'claims') {
        loadClaims(claimsPage)
      } else if (activeTab === 'summaries') {
        loadSummaries(summariesPage)
      } else if (activeTab === 'histories') {
        loadHistories(historiesPage)
      }
    }
  }, [page, claimsPage, summariesPage, historiesPage, reportFilterProvince, reportFilterCity, reportFilterDistrict])

  const handleStatusUpdate = async (id: string, status: string, adminNote?: string) => {
    try {
      await adminService.updateReportStatus(id, status, adminNote)
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: status as any, admin_note: adminNote ?? r.admin_note } : r))
      await loadStats()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus layanan RAG ini? Data representasi vektor akan terhapus secara permanen.')) {
      return
    }
    try {
      await adminService.deleteService(id)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      alert('Gagal menghapus layanan: ' + err.message)
    }
  }

  const handleDeleteRAGDocument = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen RAG ini? File metadata akan terhapus secara permanen.')) {
      return
    }
    try {
      await adminService.deleteRAGDocument(id)
      setRagDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      alert('Gagal menghapus dokumen RAG: ' + err.message)
    }
  }

  const handleDeleteClaim = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data verifikasi klaim ini?')) return
    try {
      await adminService.deleteClaim(id)
      setClaims(prev => prev.filter(c => c.id !== id))
      setClaimsTotal(t => t - 1)
    } catch (err: any) {
      alert('Gagal menghapus klaim: ' + err.message)
    }
  }

  const handleDeleteSummary = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus ringkasan dokumen ini?')) return
    try {
      await adminService.deleteSummary(id)
      setSummaries(prev => prev.filter(s => s.id !== id))
      setSummariesTotal(t => t - 1)
    } catch (err: any) {
      alert('Gagal menghapus ringkasan: ' + err.message)
    }
  }

  const handleDeleteHistory = async (sessionId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi riwayat chat warga ini?')) return
    try {
      await adminService.deleteChatHistory(sessionId)
      setHistories(prev => prev.filter(h => h.session_id !== sessionId))
      setHistoriesTotal(t => t - 1)
    } catch (err: any) {
      alert('Gagal menghapus riwayat chat: ' + err.message)
    }
  }

  // Filter local lists dynamically by search inputs
  const filteredReports = search.trim()
    ? reports.filter(r =>
        r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase())
      )
    : reports

  const groupedReports = useMemo(() => {
    if (groupBy === 'none') return null
    const groups: Record<string, CitizenReport[]> = {}
    filteredReports.forEach(r => {
      let key = 'Lainnya'
      if (groupBy === 'province') key = r.province || 'Tidak Diketahui'
      else if (groupBy === 'city') key = r.city || 'Tidak Diketahui'
      else if (groupBy === 'district') key = r.district || 'Tidak Diketahui'

      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return groups
  }, [filteredReports, groupBy])

  // Unique provinces, cities, districts from allReports for filter options
  const uniqueProvinces = useMemo(() => {
    const set = new Set<string>()
    allReports.forEach(r => { if (r.province) set.add(r.province) })
    return Array.from(set).sort()
  }, [allReports])

  const uniqueCities = useMemo(() => {
    const set = new Set<string>()
    allReports.forEach(r => {
      if (r.city && (reportFilterProvince === 'all' || r.province === reportFilterProvince)) {
        set.add(r.city)
      }
    })
    return Array.from(set).sort()
  }, [allReports, reportFilterProvince])

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>()
    allReports.forEach(r => {
      if (r.district && (reportFilterCity === 'all' || r.city === reportFilterCity)) {
        set.add(r.district)
      }
    })
    return Array.from(set).sort()
  }, [allReports, reportFilterCity])

  // Unique provinces, cities, districts from activeChats for filter options
  const uniqueChatProvinces = useMemo(() => {
    const set = new Set<string>()
    activeChats.forEach((c: any) => { if (c.province) set.add(c.province) })
    return Array.from(set).sort()
  }, [activeChats])

  const uniqueChatCities = useMemo(() => {
    const set = new Set<string>()
    activeChats.forEach((c: any) => {
      if (c.city && (chatFilterProvince === 'all' || c.province === chatFilterProvince)) {
        set.add(c.city)
      }
    })
    return Array.from(set).sort()
  }, [activeChats, chatFilterProvince])

  const uniqueChatDistricts = useMemo(() => {
    const set = new Set<string>()
    activeChats.forEach((c: any) => {
      if (c.district && (chatFilterCity === 'all' || c.city === chatFilterCity)) {
        set.add(c.district)
      }
    })
    return Array.from(set).sort()
  }, [activeChats, chatFilterCity])

  const filteredActiveChats = useMemo(() => {
    return activeChats.filter((chat: any) => {
      const matchProv = chatFilterProvince === 'all' || chat.province === chatFilterProvince
      const matchCity = chatFilterCity === 'all' || chat.city === chatFilterCity
      const matchDist = chatFilterDistrict === 'all' || chat.district === chatFilterDistrict
      return matchProv && matchCity && matchDist
    })
  }, [activeChats, chatFilterProvince, chatFilterCity, chatFilterDistrict])

  const renderTableHeaders = () => (
    <thead>
      <tr className="border-b border-zinc-800 bg-zinc-950/50">
        {[
          { key: 'id', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
          { key: 'session_id', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
          { key: 'reporter_name', width: 'w-[160px] min-w-[160px]', className: '' },
          { key: 'reporter_contact', width: 'w-[160px] min-w-[160px]', className: 'hidden md:table-cell' },
          { key: 'category', width: 'w-[140px] min-w-[140px]', className: '' },
          { key: 'description', width: 'w-[220px] min-w-[220px]', className: 'hidden sm:table-cell' },
          { key: 'urgency', width: 'w-[120px] min-w-[120px]', className: '' },
          { key: 'status', width: 'w-[120px] min-w-[120px]', className: '' },
          { key: 'admin_note', width: 'w-[150px] min-w-[150px]', className: 'hidden lg:table-cell' },
          { key: 'created_at', width: 'w-[120px] min-w-[120px]', className: 'hidden md:table-cell' },
          { key: 'Aksi', width: 'w-[130px] min-w-[130px]', className: '' }
        ].map(h => (
          <th key={h.key} className={cn("px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap", h.width, h.className)}>
            {h.key === 'reporter_name' ? 'Pengadu' : h.key === 'reporter_contact' ? 'Kontak' : h.key === 'category' ? 'Kategori' : h.key === 'description' ? 'Deskripsi' : h.key === 'status' ? 'Status' : h.key === 'urgency' ? 'Urgensi' : h.key === 'admin_note' ? 'Catatan' : h.key === 'created_at' ? 'Tanggal' : h.key}
          </th>
        ))}
      </tr>
    </thead>
  )

  const renderReportRow = (r: CitizenReport) => (
    <tr key={r.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
      <td className="px-4 py-3.5 min-w-[100px] max-w-[100px] hidden xl:table-cell">
        <div className="truncate font-mono text-[10px] text-zinc-500 select-all" title={r.id}>
          {r.id}
        </div>
      </td>
      <td className="px-4 py-3.5 min-w-[100px] max-w-[100px] hidden xl:table-cell">
        <div className="truncate font-mono text-[10px] text-zinc-500 select-all" title={r.session_id}>
          {r.session_id || '-'}
        </div>
      </td>
      <td className="px-4 py-3.5 font-semibold text-zinc-200 min-w-[160px] whitespace-nowrap">{r.reporter_name}</td>
      <td className="px-4 py-3.5 text-zinc-400 min-w-[160px] whitespace-nowrap hidden md:table-cell">{r.reporter_contact}</td>
      <td className="px-4 py-3.5 min-w-[140px] whitespace-nowrap">
        <span className="inline-flex items-center rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-300 font-semibold whitespace-nowrap">
          {CATEGORY_LABELS[r.category] || r.category}
        </span>
      </td>
      <td className="px-4 py-3.5 min-w-[220px] max-w-xs hidden sm:table-cell">
        <div className="flex flex-col gap-0.5">
          {r.description.startsWith('[📍 LOKASI GPS KOORDINAT:') && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-400 font-bold whitespace-nowrap">
              <MapPin className="h-2.5 w-2.5" /> GPS Terlampir
            </span>
          )}
          <div className="truncate text-zinc-400" title={r.description.replace(/^\[📍 LOKASI GPS KOORDINAT:[^\]]+\]\s*/, '')}>
            {r.description.replace(/^\[📍 LOKASI GPS KOORDINAT:[^\]]+\]\s*/, '')}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 min-w-[120px]">
        <UrgencyBadge level={(r as any).urgency_level} />
      </td>
      <td className="px-4 py-3.5 min-w-[120px]">
        <StatusBadge status={r.status as keyof typeof STATUS_CONFIG} />
      </td>
      <td className="px-4 py-3.5 text-zinc-500 italic min-w-[150px] max-w-[150px] hidden lg:table-cell">
        <div className="truncate" title={r.admin_note}>
          {r.admin_note || '-'}
        </div>
      </td>
      <td className="px-4 py-3.5 text-zinc-400 min-w-[120px] whitespace-nowrap hidden md:table-cell">
        {new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
      </td>
      <td className="px-4 py-3.5 min-w-[130px]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedReport(r)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition shadow-sm active:scale-95"
            title="Lihat Detail"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <StatusDropdown
            current={r.status}
            reportId={r.id}
            onUpdate={handleStatusUpdate}
          />
        </div>
      </td>
    </tr>
  )

  const filteredServices = serviceSearch.trim()
    ? services.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.institution.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearch.toLowerCase())
      )
    : services

  const filteredClaims = claimsSearch.trim()
    ? claims.filter(c =>
        c.claim_text.toLowerCase().includes(claimsSearch.toLowerCase()) ||
        c.reasoning.toLowerCase().includes(claimsSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(claimsSearch.toLowerCase())
      )
    : claims

  const filteredSummaries = summariesSearch.trim()
    ? summaries.filter(s =>
        s.original_hash.toLowerCase().includes(summariesSearch.toLowerCase()) ||
        s.original_text.toLowerCase().includes(summariesSearch.toLowerCase()) ||
        s.summary.toLowerCase().includes(summariesSearch.toLowerCase())
      )
    : summaries

  const filteredHistories = historiesSearch.trim()
    ? histories.filter(h =>
        h.session_id.toLowerCase().includes(historiesSearch.toLowerCase())
      )
    : histories

  const statCards = stats ? [
    { icon: FileText,     label: 'Total Laporan',    value: stats.totalReports,                colorClass: 'text-purple-400', sub: 'Semua aduan masuk' },
    { icon: Clock,        label: 'Menunggu',          value: stats.statusCounts.Menunggu,        colorClass: 'text-amber-400',  sub: 'Aduan belum diproses' },
    { icon: Activity,     label: 'Sedang Diproses',   value: stats.statusCounts.Diproses,        colorClass: 'text-blue-400',   sub: 'Dalam penanganan' },
    { icon: CheckCircle2, label: 'Terselesaikan',     value: stats.statusCounts.Selesai,         colorClass: 'text-emerald-400',sub: 'Aduan selesai' },
    { icon: Shield,       label: 'Cek Fakta (AI)',    value: stats.totalClaims || 0,            colorClass: 'text-rose-400',   sub: 'Klaim berita diverifikasi' },
    { icon: FileSpreadsheet, label: 'Ringkasan (AI)',  value: stats.totalSummaries || 0,         colorClass: 'text-teal-400',   sub: 'Dokumen regulasi diringkas' },
  ] : []

  const navItemsAll = [
    { id: 'overview',    label: 'Ringkasan',        icon: LayoutDashboard,  desc: 'Monitoring Overview',     roles: ['petugas','admin','superadmin'] },
    { id: 'reports',     label: 'Laporan Warga',    icon: FileText,          desc: 'Citizen Reports',         roles: ['petugas','admin','superadmin'] },
    { id: 'percakapan',  label: 'Percakapan Aktif', icon: MessageSquare,     desc: 'Live Active Chats',       roles: ['petugas','admin','superadmin'] },
    { id: 'services',    label: 'Direktori RAG',    icon: BookOpen,          desc: 'RAG Knowledge Directory', roles: ['admin','superadmin'] },
    { id: 'claims',      label: 'Cek Fakta',        icon: Shield,            desc: 'Fact Check & Claims',     roles: ['admin','superadmin'] },
    { id: 'summaries',   label: 'Ringkasan Dok',    icon: FileSpreadsheet,   desc: 'Regulation Summaries',    roles: ['superadmin'] },
    { id: 'histories',   label: 'Riwayat Chat',     icon: MessageSquare,     desc: 'Chat History Logs',       roles: ['superadmin'] },
    { id: 'staff',       label: 'Kelola Staf',      icon: Users,             desc: 'Staff Management',        roles: ['superadmin'] },
    { id: 'hoaks',       label: 'Database Hoaks',   icon: AlertTriangle,     desc: 'WhatsApp Hoax DB',        roles: ['superadmin'] },
  ] as const

  const navItems = navItemsAll.filter(item =>
    (item.roles as readonly string[]).includes(user?.role || '')
  )

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-x-hidden">
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 border-r border-zinc-800 bg-zinc-900 flex flex-col transition-all duration-300 md:translate-x-0",
          isSidebarCollapsed ? "w-20" : "w-64",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:transform-none"
        )}
      >
        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-4 z-50 h-6 w-6 items-center justify-center rounded-full border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-150 transition shadow-md active:scale-90 cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand Header */}
        <div className={cn("flex h-14 items-center border-b border-zinc-800 bg-zinc-950/20 px-5", isSidebarCollapsed ? "justify-center px-0" : "gap-3")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 shadow-sm">
            <Shield className="h-4.5 w-4.5 text-zinc-300" />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <div className="text-xs font-bold text-zinc-100 uppercase tracking-wider">KOMUNITAS</div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider leading-none mt-0.5">Admin Portal</div>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any)
                  setLoading(true)
                  setIsSidebarOpen(false)
                }}
                className={cn(
                  "w-full flex items-center rounded-xl transition active:scale-[0.98] cursor-pointer",
                  isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5 text-left",
                  isActive
                    ? "bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-md font-semibold shadow-indigo-950/30"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4.5 w-4.5 flex-shrink-0", isActive ? "text-indigo-400" : "text-zinc-500")} />
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-xs leading-tight">{item.label}</span>
                    <span className="text-[9px] text-zinc-500 font-normal leading-normal mt-0.5">{item.desc}</span>
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        {/* Workspace Session info */}
        <div className="border-t border-zinc-800 p-3 bg-zinc-950/30">
          <div className={cn("flex items-center justify-between gap-2 min-w-0", isSidebarCollapsed ? "flex-col" : "flex-row")}>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Active Session</div>
                <div className="text-xs font-bold text-zinc-300 truncate" title={user?.nama_lengkap || 'Administrator'}>
                  {user?.nama_panggilan || user?.nama_lengkap || 'Admin'}
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
              className={cn(
                "flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-rose-400 hover:border-rose-900 transition active:scale-95 cursor-pointer",
                isSidebarCollapsed ? "w-8 p-0" : "px-3"
              )}
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!isSidebarCollapsed && <span className="text-xs font-semibold">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden transition-all duration-300",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 md:hidden"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                  {activeTab === 'overview'   && 'Overview Ringkasan Sistem'}
                  {activeTab === 'reports'    && 'Kelola Laporan Warga'}
                  {activeTab === 'services'   && 'Basis Pengetahuan RAG (Layanan)'}
                  {activeTab === 'claims'     && 'Data Verifikasi Klaim (Cek Hoaks)'}
                  {activeTab === 'summaries'  && 'Cache Ringkasan Dokumen Perda'}
                  {activeTab === 'histories'  && 'Pemantauan Riwayat Chat Warga'}
                  {activeTab === 'percakapan' && 'Percakapan Aktif Warga'}
                  {activeTab === 'staff'      && 'Kelola Staf & Akun Admin'}
                  {activeTab === 'hoaks'      && 'Database Kata Kunci Hoaks WhatsApp'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider leading-none">Last Updated</div>
                <div className="text-xs text-zinc-300 font-semibold mt-1">
                  {lastUpdated.toLocaleTimeString('id-ID')}
                </div>
              </div>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow p-6 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
                <p className="text-xs text-zinc-400 font-medium">Memuat data panel...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Action Row */}
              {activeTab === 'services' && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-850 pb-2">
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 p-1 rounded-lg">
                    <button
                      onClick={() => setServicesSubTab('list')}
                      className={cn(
                        "h-8 px-4 rounded text-xs font-semibold transition flex items-center gap-1.5",
                        servicesSubTab === 'list' 
                          ? "bg-zinc-900 text-zinc-100 border border-zinc-800" 
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Direktori Layanan
                    </button>
                    <button
                      onClick={() => setServicesSubTab('documents')}
                      className={cn(
                        "h-8 px-4 rounded text-xs font-semibold transition flex items-center gap-1.5",
                        servicesSubTab === 'documents' 
                          ? "bg-zinc-900 text-zinc-100 border border-zinc-800" 
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Dokumen RAG (PDF/Doc)
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {servicesSubTab === 'list' ? (
                      <button
                        onClick={() => setIsAddServiceOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 text-zinc-100 border border-zinc-800 px-4 text-xs font-bold shadow hover:bg-zinc-900 active:scale-95 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Layanan
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsUploadDocOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-900/40 text-indigo-200 border border-indigo-800/60 px-4 text-xs font-bold shadow hover:bg-indigo-900/60 active:scale-95 transition"
                      >
                        <Plus className="h-4 w-4 text-indigo-400" />
                        Unggah PDF / Dokumen RAG
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: OVERVIEW ──────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-in fade-in duration-200">
                      {statCards.map(card => (
                        <StatCard key={card.label} {...card} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-xs text-red-400">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <p>Koneksi stats offline. Pastikan database Supabase terhubung dengan benar.</p>
                      </div>
                    </div>
                  )}

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    <div className="lg:col-span-2">
                      <InteractiveTrendChart reports={allReports} />
                    </div>
                    <div>
                      <StatusDonutChart statusCounts={stats?.statusCounts || { Menunggu: 0, Diproses: 0, Selesai: 0, Ditolak: 0 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 animate-in fade-in duration-300">
                    <CategoryBarChart reports={allReports} />
                  </div>

                  {/* Regional Statistics Visualizer */}
                  {regionalStats && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      {/* Province Stats */}
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-purple-400" /> Sebaran Provinsi
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {regionalStats.provinces?.length || 0} Provinsi
                          </span>
                        </div>
                        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                          {regionalStats.provinces?.map((p: any) => {
                            const totalReports = stats?.totalReports || 1
                            const percent = Math.round((p.total / totalReports) * 100)
                            return (
                              <div key={p.name} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-zinc-300">
                                  <span className="font-medium">{p.name}</span>
                                  <span className="font-mono text-zinc-400 font-bold">{p.total} aduan ({percent}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                          {(!regionalStats.provinces || regionalStats.provinces.length === 0) && (
                            <p className="text-xs text-zinc-500 italic text-center py-4">Belum ada sebaran provinsi.</p>
                          )}
                        </div>
                      </div>

                      {/* City Stats */}
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-rose-400" /> Sebaran Kabupaten / Kota
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {regionalStats.cities?.length || 0} Daerah
                          </span>
                        </div>
                        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                          {regionalStats.cities?.map((c: any) => {
                            const totalReports = stats?.totalReports || 1
                            const percent = Math.round((c.total / totalReports) * 100)
                            return (
                              <div key={c.name} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                                  <div>
                                    <span>{c.name}</span>
                                    <span className="text-[9px] text-zinc-500 ml-1.5 font-normal">({c.province})</span>
                                  </div>
                                  <span className="font-mono text-zinc-400 font-bold">{c.total} aduan ({percent}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                                  <div 
                                    className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                          {(!regionalStats.cities || regionalStats.cities.length === 0) && (
                            <p className="text-xs text-zinc-500 italic text-center py-4">Belum ada sebaran kabupaten/kota.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Petunjuk Monitoring Panel Admin */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-3">
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
                      <Shield className="h-4 w-4 text-indigo-400" /> Petunjuk Monitoring Panel Admin
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-400 font-normal">
                      Portal admin KOMUNITAS dikembangkan khusus untuk mempermudah pemantauan isu warga secara terpusat.
                      Gunakan navigasi sidebar di sebelah kiri untuk berinteraksi dengan database real-time Supabase. 
                      Seluruh kolom dan struktur data yang disajikan di panel ini disinkronkan 100% dengan tabel Supabase 
                      tanpa ada nama properti yang diubah demi keaslian data.
                    </p>
                  </div>

                  {/* Sebaran Wilayah Inferensial (3 Kolom Simultan) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    
                    {/* Card 1: Sebaran Provinsi */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                      <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-purple-400" /> Sebaran Provinsi
                        </h3>
                        <span className="bg-zinc-950 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-500">
                          {Object.keys(geoStats.provinces).length} Wilayah
                        </span>
                      </div>
                      
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-0.5">
                        {(() => {
                          const total = Object.values(geoStats.provinces).reduce((a, b) => a + b, 0);
                          const sorted = Object.entries(geoStats.provinces).sort((a, b) => b[1] - a[1]).slice(0, 5);
                          if (sorted.length === 0) {
                            return <div className="text-center py-8 text-[11px] text-zinc-500 italic">Belum ada data Provinsi</div>;
                          }
                          return sorted.map(([name, count]) => {
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={name} className="space-y-1">
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="font-semibold text-zinc-300 truncate max-w-[150px]">{name}</span>
                                  <span className="text-zinc-500 font-mono text-[9.5px]">{count} ({percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Card 2: Sebaran Kabupaten / Kota */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                      <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-indigo-400" /> Sebaran Kabupaten / Kota
                        </h3>
                        <span className="bg-zinc-950 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-500">
                          {Object.keys(geoStats.cities).length} Wilayah
                        </span>
                      </div>
                      
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-0.5">
                        {(() => {
                          const total = Object.values(geoStats.cities).reduce((a, b) => a + b, 0);
                          const sorted = Object.entries(geoStats.cities).sort((a, b) => b[1] - a[1]).slice(0, 5);
                          if (sorted.length === 0) {
                            return <div className="text-center py-8 text-[11px] text-zinc-500 italic">Belum ada data Kota</div>;
                          }
                          return sorted.map(([name, count]) => {
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={name} className="space-y-1">
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="font-semibold text-zinc-300 truncate max-w-[150px]">{name}</span>
                                  <span className="text-zinc-500 font-mono text-[9.5px]">{count} ({percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Card 3: Sebaran Kecamatan */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                      <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-teal-400" /> Sebaran Kecamatan
                        </h3>
                        <span className="bg-zinc-950 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-500">
                          {Object.keys(geoStats.districts).length} Wilayah
                        </span>
                      </div>
                      
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-0.5">
                        {(() => {
                          const total = Object.values(geoStats.districts).reduce((a, b) => a + b, 0);
                          const sorted = Object.entries(geoStats.districts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                          if (sorted.length === 0) {
                            return <div className="text-center py-8 text-[11px] text-zinc-500 italic">Belum ada data Kecamatan</div>;
                          }
                          return sorted.map(([name, count]) => {
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={name} className="space-y-1">
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="font-semibold text-zinc-300 truncate max-w-[150px]">{name}</span>
                                  <span className="text-zinc-500 font-mono text-[9.5px]">{count} ({percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: CITIZEN REPORTS ────────────────────────── */}
              {activeTab === 'reports' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Full-width GIS Map Panel (separated but on the same page) */}
                  <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-5 space-y-3.5 flex flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-rose-500 animate-pulse" /> Peta Live GIS Aduan Warga
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Sebaran lokasi laporan warga yang terlampir koordinat GPS</p>
                      </div>
                    </div>
                    {/* Map Box */}
                    <div className="h-[360px] w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden relative">
                      <ReportMap 
                        reports={filteredReports} 
                        onSelectReport={(r) => setSelectedReport(r)} 
                      />
                    </div>
                  </div>

                  {/* Table Toolbar */}
                  <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Laporan Warga</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-bold">
                        {total} Baris
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap items-center">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Cari pelapor/masalah..."
                          className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-40 placeholder-zinc-500"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                        <Filter className="h-3.5 w-3.5 text-zinc-500" />
                        
                        {/* Status Filter */}
                        <select
                          value={filterStatus}
                          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs"
                        >
                          <option value="all">Semua Status</option>
                          <option value="Menunggu">Menunggu</option>
                          <option value="Diproses">Diproses</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Ditolak">Ditolak</option>
                        </select>

                        {/* Province Filter */}
                        <select
                          value={reportFilterProvince}
                          onChange={e => { setReportFilterProvince(e.target.value); setReportFilterCity('all'); setReportFilterDistrict('all'); setPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs"
                        >
                          <option value="all">Semua Provinsi</option>
                          {uniqueProvinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        {/* City Filter */}
                        <select
                          value={reportFilterCity}
                          onChange={e => { setReportFilterCity(e.target.value); setReportFilterDistrict('all'); setPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={reportFilterProvince === 'all'}
                        >
                          <option value="all">Semua Kota</option>
                          {uniqueCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        {/* District Filter */}
                        <select
                          value={reportFilterDistrict}
                          onChange={e => { setReportFilterDistrict(e.target.value); setPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={reportFilterCity === 'all'}
                        >
                          <option value="all">Semua Kecamatan</option>
                          {uniqueDistricts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        {/* Grouping Selection */}
                        <select
                          value={groupBy}
                          onChange={e => setGroupBy(e.target.value as any)}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 font-semibold text-indigo-400 text-xs"
                        >
                          <option value="none">Tanpa Grouping</option>
                          <option value="province">Grup: Provinsi</option>
                          <option value="city">Grup: Kota</option>
                          <option value="district">Grup: Kecamatan</option>
                        </select>

                        <button
                          onClick={handleExportCSV}
                          className="flex h-8 items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition"
                          title="Unduh data laporan terfilter dalam format CSV"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Ekspor CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table / Grouped Rendering Container */}
                  <div className="space-y-4">
                    {groupBy === 'none' ? (
                      <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                        {filteredReports.length === 0 ? (
                          <div className="flex h-36 flex-col items-center justify-center gap-2">
                            <FileText className="h-6 w-6 text-zinc-500" />
                            <p className="text-xs text-zinc-500 italic">Tidak ada baris laporan ditemukan.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto w-full">
                            <table className="w-full min-w-[480px] text-left text-xs border-collapse">
                              {renderTableHeaders()}
                              <tbody>
                                {filteredReports.map(r => renderReportRow(r))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Grouped Render mode
                      groupedReports && Object.entries(groupedReports).map(([groupName, groupList]) => (
                        <div key={groupName} className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                          <div className="border-b border-zinc-800 bg-zinc-950/40 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-zinc-500" /> {groupName}
                            </h3>
                            <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 font-bold">
                              {groupList.length} Aduan
                            </span>
                          </div>
                          {groupList.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic p-4 text-center">Tidak ada laporan</p>
                          ) : (
                            <div className="overflow-x-auto w-full">
                              <table className="w-full min-w-[480px] text-left text-xs border-collapse">
                                {renderTableHeaders()}
                                <tbody>
                                  {groupList.map(r => renderReportRow(r))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3.5">
                        <span className="text-[11px] text-zinc-500 font-semibold">
                          Halaman {page} dari {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold border transition',
                                page === p
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition"
                          >
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: PUBLIC SERVICES (RAG DIRECTORY) ───────── */}
              {activeTab === 'services' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {servicesSubTab === 'list' ? (
                    <>
                      {/* Table Toolbar */}
                      <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-indigo-400" />
                          <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Tabel: public_services</h2>
                          <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-semibold">
                            {services.length} Baris
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:flex-row">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                            <input
                              value={serviceSearch}
                              onChange={e => setServiceSearch(e.target.value)}
                              placeholder="Cari layanan/lembaga..."
                              className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-48 placeholder-zinc-500"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <Filter className="h-3.5 w-3.5 text-zinc-500" />
                            <select
                              value={serviceFilterCategory}
                              onChange={e => setServiceFilterCategory(e.target.value)}
                              className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700"
                            >
                              <option value="all" className="bg-zinc-900 text-zinc-300">Semua Kategori</option>
                              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                <option key={k} value={k} className="bg-zinc-900 text-zinc-300">{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Table Container */}
                      <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                        {filteredServices.length === 0 ? (
                          <div className="flex h-36 flex-col items-center justify-center gap-2">
                            <BookOpen className="h-6 w-6 text-zinc-750" />
                            <p className="text-xs text-zinc-500 italic">Tidak ada baris layanan terdaftar.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                                  {[
                                    { key: 'id', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
                                    { key: 'name', width: 'w-[200px] min-w-[200px]', className: '' },
                                    { key: 'institution', width: 'w-[180px] min-w-[180px]', className: 'hidden sm:table-cell' },
                                    { key: 'category', width: 'w-[140px] min-w-[140px]', className: '' },
                                    { key: 'description', width: 'w-[220px] min-w-[220px]', className: 'hidden xl:table-cell' },
                                    { key: 'requirements', width: 'w-[110px] min-w-[110px]', className: 'hidden lg:table-cell' },
                                    { key: 'procedures', width: 'w-[110px] min-w-[110px]', className: 'hidden lg:table-cell' },
                                    { key: 'kontak', width: 'w-[160px] min-w-[160px]', className: 'hidden md:table-cell' },
                                    { key: 'embedding', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
                                    { key: 'Aksi', width: 'w-[90px] min-w-[90px]', className: '' }
                                  ].map(h => (
                                    <th key={h.key} className={cn("px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap", h.width, h.className)}>
                                      {h.key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredServices.map(s => (
                                  <tr key={s.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
                                    <td className="px-4 py-3.5 min-w-[100px] max-w-[100px] hidden xl:table-cell">
                                      <div className="truncate font-mono text-[10px] text-zinc-500 select-all" title={s.id}>
                                        {s.id}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 font-semibold text-zinc-200 min-w-[200px] max-w-[250px]">
                                      <div className="break-words">{s.name}</div>
                                    </td>
                                    <td className="px-4 py-3.5 text-zinc-400 min-w-[185px] hidden sm:table-cell">
                                      <div>{s.institution}</div>
                                    </td>
                                    <td className="px-4 py-3.5 min-w-[140px] whitespace-nowrap">
                                      <span className="inline-flex items-center rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-300 font-semibold whitespace-nowrap">
                                        {CATEGORY_LABELS[s.category] || s.category}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 min-w-[220px] max-w-xs hidden xl:table-cell">
                                      <div className="truncate text-zinc-400" title={s.description}>
                                        {s.description}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-zinc-500 font-mono text-[10px] min-w-[110px] whitespace-nowrap hidden lg:table-cell">{s.requirements.length} Dokumen</td>
                                    <td className="px-4 py-3.5 text-zinc-500 font-mono text-[10px] min-w-[110px] whitespace-nowrap hidden lg:table-cell">{s.procedures.length} Langkah</td>
                                    <td className="px-4 py-3.5 text-zinc-400 min-w-[160px] hidden md:table-cell">
                                      <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                                        {s.contactPhone && <span className="flex items-center gap-1 whitespace-nowrap"><Phone className="h-2.5 w-2.5 text-zinc-500 flex-shrink-0" /> {s.contactPhone}</span>}
                                        {s.contactEmail && <span className="flex items-center gap-1 whitespace-nowrap"><Mail className="h-2.5 w-2.5 text-zinc-500 flex-shrink-0" /> {s.contactEmail}</span>}
                                        {!s.contactPhone && !s.contactEmail && <span className="text-zinc-500">-</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-indigo-400 min-w-[100px] hidden xl:table-cell">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-950/30 border border-indigo-900/30 rounded text-[9px] font-bold whitespace-nowrap">
                                        1536 Dim
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 min-w-[90px]">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => setSelectedService(s)}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition shadow-sm active:scale-95"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteService(s.id)}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950 transition shadow-sm active:scale-95"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Document Toolbar */}
                      <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Tabel: rag_documents (PDF)</h2>
                          <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-semibold">
                            {ragDocuments.length} Berkas
                          </span>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                          <input
                            value={ragDocSearch}
                            onChange={e => setRagDocSearch(e.target.value)}
                            placeholder="Cari nama berkas..."
                            className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-48 placeholder-zinc-500"
                          />
                        </div>
                      </div>

                      {/* Documents Table */}
                      <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                        {ragDocLoading ? (
                          <div className="flex h-36 flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                            <p className="text-xs text-zinc-400 font-medium">Memuat berkas RAG...</p>
                          </div>
                        ) : ragDocuments.filter(d => d.filename.toLowerCase().includes(ragDocSearch.toLowerCase())).length === 0 ? (
                          <div className="flex h-36 flex-col items-center justify-center gap-2">
                            <FileText className="h-6 w-6 text-zinc-750" />
                            <p className="text-xs text-zinc-500 italic">Tidak ada berkas PDF/dokumen terdaftar.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap">ID Dokumen</th>
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nama Berkas</th>
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Ukuran</th>
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Tipe</th>
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Tanggal Unggah</th>
                                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap w-[90px]">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ragDocuments
                                  .filter(d => d.filename.toLowerCase().includes(ragDocSearch.toLowerCase()))
                                  .map(d => (
                                    <tr key={d.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
                                      <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-500 select-all" title={d.id}>
                                        {d.id}
                                      </td>
                                      <td className="px-4 py-3.5 font-semibold text-zinc-200">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                          <span className="truncate max-w-xs" title={d.filename}>{d.filename}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5 text-zinc-400">{(d.file_size / 1024).toFixed(1)} KB</td>
                                      <td className="px-4 py-3.5 text-zinc-400">
                                        <span className="inline-flex items-center rounded-full bg-zinc-950 border border-zinc-850 px-2.5 py-0.5 text-[9px] text-zinc-400 font-medium">
                                          {d.file_type}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3.5 text-zinc-400">
                                        {new Date(d.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="px-4 py-3.5 min-w-[90px]">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleDeleteRAGDocument(d.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950 transition shadow-sm active:scale-95"
                                            title="Hapus Dokumen"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── TAB CONTENT: CLAIM VERIFICATIONS (CEK FAKTA) ────────── */}
              {activeTab === 'claims' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Table Toolbar */}
                  <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-zinc-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Tabel: claim_verifications</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-bold">
                        {claimsTotal} Baris
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={claimsSearch}
                        onChange={e => setClaimsSearch(e.target.value)}
                        placeholder="Cari klaim/penjelasan..."
                        className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-48 placeholder-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                    {filteredClaims.length === 0 ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2">
                        <Shield className="h-6 w-6 text-zinc-750" />
                        <p className="text-xs text-zinc-500 italic">Tidak ada baris verifikasi klaim ditemukan.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/50">
                              {[
                                { key: 'id', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
                                { key: 'claim_text', width: 'w-[220px] min-w-[220px]', className: '' },
                                { key: 'is_credible', width: 'w-[110px] min-w-[110px]', className: '' },
                                { key: 'confidence_score', width: 'w-[120px] min-w-[120px]', className: 'hidden sm:table-cell' },
                                { key: 'reasoning', width: 'w-[220px] min-w-[220px]', className: 'hidden xl:table-cell' },
                                { key: 'sources', width: 'w-[120px] min-w-[120px]', className: 'hidden lg:table-cell' },
                                { key: 'category', width: 'w-[120px] min-w-[120px]', className: 'hidden md:table-cell' },
                                { key: 'search_count', width: 'w-[110px] min-w-[110px]', className: 'hidden md:table-cell' },
                                { key: 'created_at', width: 'w-[110px] min-w-[110px]', className: 'hidden lg:table-cell' },
                                { key: 'Aksi', width: 'w-[80px] min-w-[80px]', className: '' }
                              ].map(h => (
                                <th key={h.key} className={cn("px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap", h.width, h.className)}>
                                  {h.key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClaims.map(c => (
                              <tr key={c.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
                                <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-500 select-all min-w-[100px] max-w-[100px] hidden xl:table-cell">
                                  <div className="truncate" title={c.id}>
                                    {c.id}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 min-w-[220px] max-w-xs">
                                  <div className="truncate font-semibold text-zinc-200" title={c.claim_text}>
                                    {c.claim_text}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 min-w-[110px] whitespace-nowrap">
                                  <span className={cn(
                                    'inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider whitespace-nowrap',
                                    c.is_credible
                                      ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400'
                                      : 'bg-rose-950/40 border-rose-900/30 text-rose-400'
                                  )}>
                                    {c.is_credible ? 'KREDIBEL' : 'HOAKS'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-300 font-bold font-mono text-[11px] min-w-[120px] whitespace-nowrap hidden sm:table-cell">{c.confidence_score}%</td>
                                <td className="px-4 py-3.5 min-w-[220px] max-w-xs hidden xl:table-cell">
                                  <div className="truncate text-zinc-400" title={c.reasoning}>
                                    {c.reasoning}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-400 min-w-[120px] whitespace-nowrap hidden lg:table-cell">
                                  {c.sources && c.sources.length > 0 ? (
                                    <a href={c.sources[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-bold whitespace-nowrap">
                                      Link Resmi <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3.5 text-zinc-400 min-w-[120px] whitespace-nowrap hidden md:table-cell">{c.category || 'Umum'}</td>
                                <td className="px-4 py-3.5 text-zinc-200 font-bold min-w-[110px] whitespace-nowrap hidden md:table-cell">{c.search_count}x</td>
                                <td className="px-4 py-3.5 text-zinc-500 min-w-[110px] whitespace-nowrap hidden lg:table-cell">
                                  {new Date(c.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </td>
                                <td className="px-4 py-3.5 min-w-[80px]">
                                  <button
                                    onClick={() => handleDeleteClaim(c.id)}
                                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950 transition active:scale-95"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {claimsTotalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3.5 bg-zinc-950/20">
                        <span className="text-[11px] text-zinc-500 font-semibold">
                          Halaman {claimsPage} dari {claimsTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setClaimsPage(p => Math.max(1, p - 1))}
                            disabled={claimsPage === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                          {Array.from({ length: claimsTotalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setClaimsPage(p)}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold border transition',
                                claimsPage === p
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-900'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setClaimsPage(p => Math.min(claimsTotalPages, p + 1))}
                            disabled={claimsPage === claimsTotalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: DOCUMENT SUMMARIES ───────────────────────── */}
              {activeTab === 'summaries' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Table Toolbar */}
                  <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Tabel: document_summaries</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-semibold">
                        {summariesTotal} Baris
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={summariesSearch}
                        onChange={e => setSummariesSearch(e.target.value)}
                        placeholder="Cari teks/ringkasan..."
                        className="h-8 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-48 placeholder-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                    {filteredSummaries.length === 0 ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="h-6 w-6 text-zinc-500" />
                        <p className="text-xs text-zinc-500 italic">Tidak ada baris ringkasan dokumen ditemukan.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/50">
                              {[
                                { key: 'id', width: 'w-[100px] min-w-[100px]', className: 'hidden xl:table-cell' },
                                { key: 'original_hash', width: 'w-[120px] min-w-[120px]', className: 'hidden xl:table-cell' },
                                { key: 'original_text', width: 'w-[220px] min-w-[220px]', className: 'hidden lg:table-cell' },
                                { key: 'summary', width: 'w-[220px] min-w-[220px]', className: '' },
                                { key: 'key_points', width: 'w-[110px] min-w-[110px]', className: 'hidden md:table-cell' },
                                { key: 'created_at', width: 'w-[110px] min-w-[110px]', className: 'hidden sm:table-cell' },
                                { key: 'Aksi', width: 'w-[80px] min-w-[80px]', className: '' }
                              ].map(h => (
                                <th key={h.key} className={cn("px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap", h.width, h.className)}>
                                  {h.key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSummaries.map(s => (
                              <tr key={s.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
                                <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-500 select-all min-w-[100px] max-w-[100px] hidden xl:table-cell">
                                  <div className="truncate" title={s.id}>
                                    {s.id}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-500 min-w-[120px] max-w-[120px] hidden xl:table-cell">
                                  <div className="truncate" title={s.original_hash}>
                                    {s.original_hash}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 min-w-[220px] max-w-xs hidden lg:table-cell">
                                  <div className="truncate text-zinc-400" title={s.original_text}>
                                    {s.original_text}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 min-w-[220px] max-w-xs">
                                  <div className="truncate text-zinc-200 font-semibold" title={s.summary}>
                                    {s.summary}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-400 font-mono text-[10px] min-w-[110px] whitespace-nowrap hidden md:table-cell" title={JSON.stringify(s.key_points)}>
                                  {s.key_points ? `${s.key_points.length} Poin` : '0 Poin'}
                                </td>
                                <td className="px-4 py-3.5 text-zinc-400 min-w-[110px] whitespace-nowrap hidden sm:table-cell">
                                  {new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </td>
                                <td className="px-4 py-3.5 min-w-[80px]">
                                  <button
                                    onClick={() => handleDeleteSummary(s.id)}
                                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950 transition active:scale-95"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {summariesTotalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3.5 bg-zinc-950/20">
                        <span className="text-[11px] text-zinc-500 font-semibold">
                          Halaman {summariesPage} dari {summariesTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSummariesPage(p => Math.max(1, p - 1))}
                            disabled={summariesPage === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 bg-zinc-950 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                          {Array.from({ length: summariesTotalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setSummariesPage(p)}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold border transition',
                                summariesPage === p
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setSummariesPage(p => Math.min(summariesTotalPages, p + 1))}
                            disabled={summariesPage === summariesTotalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: CHAT HISTORY SESSIONS ────────────────────── */}
              {activeTab === 'histories' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Table Toolbar */}
                  <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-900 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-zinc-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Tabel: chat_history</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[10px] text-zinc-400 font-semibold">
                        {historiesTotal} Baris
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={historiesSearch}
                        onChange={e => setHistoriesSearch(e.target.value)}
                        placeholder="Cari Sesi ID..."
                        className="h-8 w-full rounded border border-zinc-800 bg-zinc-900 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 sm:w-48 placeholder-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="overflow-hidden border border-zinc-800 bg-zinc-900 rounded-lg">
                    {filteredHistories.length === 0 ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2">
                        <MessageSquare className="h-6 w-6 text-zinc-755 text-zinc-500" />
                        <p className="text-xs text-zinc-500 italic">Tidak ada sesi chat tersimpan.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/50">
                              {[
                                { key: 'session_id', width: 'w-[180px] min-w-[180px]', className: '' },
                                { key: 'messages (jumlah percakapan)', width: 'w-[200px] min-w-[200px]', className: '' },
                                { key: 'created_at', width: 'w-[150px] min-w-[150px]', className: 'hidden md:table-cell' },
                                { key: 'updated_at', width: 'w-[150px] min-w-[150px]', className: 'hidden sm:table-cell' },
                                { key: 'Aksi', width: 'w-[100px] min-w-[100px]', className: '' }
                              ].map(h => (
                                <th key={h.key} className={cn("px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[10px] whitespace-nowrap", h.width, h.className)}>
                                  {h.key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistories.map(h => (
                              <tr key={h.session_id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10 transition">
                                <td className="px-4 py-3.5 font-mono text-[10px] text-zinc-200 font-semibold select-all min-w-[180px] max-w-[180px]">
                                  <div className="truncate" title={h.session_id}>
                                    {h.session_id}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-300 font-semibold text-[11px] min-w-[200px] whitespace-nowrap">
                                  <span className="px-2.5 py-0.5 bg-zinc-950 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 whitespace-nowrap">
                                    {h.messages ? `${h.messages.length} Pesan` : '0 Pesan'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-500 font-mono text-[10px] min-w-[150px] whitespace-nowrap hidden md:table-cell">
                                  {new Date(h.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3.5 text-zinc-500 font-mono text-[10px] min-w-[150px] whitespace-nowrap hidden sm:table-cell">
                                  {new Date(h.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3.5 min-w-[100px]">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setSelectedHistory(h)}
                                      className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition shadow-sm active:scale-95"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteHistory(h.session_id)}
                                      className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-red-950 transition active:scale-95"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {historiesTotalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3.5 bg-zinc-950/20">
                        <span className="text-[10px] text-[#787774] font-semibold">
                          Halaman {historiesPage} dari {historiesTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setHistoriesPage(p => Math.max(1, p - 1))}
                            disabled={historiesPage === 1}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                          {Array.from({ length: historiesTotalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setHistoriesPage(p)}
                              className={cn(
                                'flex h-6.5 w-6.5 items-center justify-center rounded text-xs font-semibold border transition',
                                historiesPage === p
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow'
                                  : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-950'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setHistoriesPage(p => Math.min(historiesTotalPages, p + 1))}
                            disabled={historiesPage === historiesTotalPages}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 transition hover:bg-zinc-900 disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB CONTENT: PERCAKAPAN AKTIF ───────────────────────────── */}
              {activeTab === 'percakapan' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Full-width GIS Map Panel for Active Chats */}
                  <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-5 space-y-3.5 flex flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-purple-500 animate-pulse" /> Peta Live GIS Percakapan Aktif
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Lokasi aduan warga yang saat ini sedang aktif (Menunggu / Diproses)</p>
                      </div>
                    </div>
                    {/* Map Box */}
                    <div className="h-[300px] w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden relative">
                      <ReportMap 
                        reports={filteredActiveChats} 
                        onSelectReport={(r) => setSelectedReport(r)} 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border border-zinc-800 bg-zinc-900 rounded-lg p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Percakapan Aktif</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-bold">
                        {filteredActiveChats.length} Sesi
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap items-center">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                        
                        {/* Chat Province Filter */}
                        <select
                          value={chatFilterProvince}
                          onChange={e => { setChatFilterProvince(e.target.value); setChatFilterCity('all'); setChatFilterDistrict('all'); setChatPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs"
                        >
                          <option value="all">Semua Provinsi</option>
                          {uniqueChatProvinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        {/* Chat City Filter */}
                        <select
                          value={chatFilterCity}
                          onChange={e => { setChatFilterCity(e.target.value); setChatFilterDistrict('all'); setChatPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs"
                        >
                          <option value="all">Semua Kota</option>
                          {uniqueChatCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        {/* Chat District Filter */}
                        <select
                          value={chatFilterDistrict}
                          onChange={e => { setChatFilterDistrict(e.target.value); setChatPage(1); }}
                          className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-zinc-300 outline-none focus:border-zinc-700 text-xs"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {uniqueChatDistricts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        <button
                          onClick={loadActiveChats}
                          disabled={loading}
                          className="flex h-8 items-center gap-1.5 rounded border border-zinc-850 bg-zinc-950 px-3 text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition active:scale-95"
                        >
                          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> Refresh
                        </button>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                  ) : filteredActiveChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 border border-zinc-800 bg-zinc-900 rounded-lg">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                        <MessageSquare className="h-5 w-5 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">Tidak ada percakapan aktif di wilayah ini saat ini</p>
                    </div>
                  ) : (
                    (() => {
                      const CHATS_PER_PAGE = 12
                      const totalChatPages = Math.ceil(filteredActiveChats.length / CHATS_PER_PAGE)
                      const pagedChats = filteredActiveChats.slice((chatPage - 1) * CHATS_PER_PAGE, chatPage * CHATS_PER_PAGE)
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            {pagedChats.map((chat: any, idx: number) => {
                              const msgCount = Array.isArray(chat.messages) ? chat.messages.length : (chat.message_count || 0)
                              const lastMsg = Array.isArray(chat.messages) && chat.messages.length > 0
                                ? chat.messages[chat.messages.length - 1]
                                : null
                              const lastText = lastMsg
                                ? (typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content)).substring(0, 80)
                                : 'Tidak ada pesan'
                              const sessionDate = new Date(chat.updated_at || chat.created_at)
                              return (
                                <motion.div
                                  key={chat.session_id || idx}
                                  variants={fadeUp}
                                  initial="hidden"
                                  animate="show"
                                  onClick={() => setActiveChatReportId(chat.id)}
                                  className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/40 cursor-pointer active:scale-[0.99] transition group"
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-900/50 bg-purple-950/30">
                                      <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-zinc-100 font-mono truncate">{(chat.session_id || 'unknown').substring(0, 16)}...</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 border border-emerald-900/40 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          Aktif
                                        </span>
                                        {chat.province && (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-zinc-950 border border-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                                            {chat.province}
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1 leading-relaxed">{lastText}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-[10px] font-bold text-zinc-300">{msgCount} pesan</span>
                                      <span className="text-[9px] text-zinc-600 font-mono">
                                        {sessionDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {sessionDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <button 
                                      className="hidden sm:inline-flex items-center justify-center h-8 px-3 rounded-lg border border-purple-900/60 bg-purple-950/40 hover:bg-purple-950/80 text-purple-400 text-[11px] font-bold tracking-wider uppercase transition active:scale-95 shadow-sm group-hover:flex"
                                    >
                                      Buka Chat
                                    </button>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>

                          {totalChatPages > 1 && (
                            <div className="flex items-center justify-between border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3">
                              <span className="text-[10px] text-zinc-500 font-medium">Halaman {chatPage} dari {totalChatPages} (12 per halaman)</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setChatPage(p => Math.max(1, p - 1))} disabled={chatPage === 1}
                                  className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition">
                                  <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                                </button>
                                {Array.from({ length: Math.min(totalChatPages, 5) }, (_, i) => i + 1).map(p => (
                                  <button key={p} onClick={() => setChatPage(p)}
                                    className={cn('flex h-6.5 w-6.5 items-center justify-center rounded text-xs font-semibold border transition',
                                      chatPage === p ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-950'
                                    )}>{p}</button>
                                ))}
                                <button onClick={() => setChatPage(p => Math.min(totalChatPages, p + 1))} disabled={chatPage === totalChatPages}
                                  className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition">
                                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  )}
                </div>
              )}

              {/* ─── TAB CONTENT: KELOLA STAF ────────────────────────────────── */}
              {activeTab === 'staff' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Sub-tab header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Manajemen Akun Staf</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStaffSubTab('list')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition',
                          staffSubTab === 'list' ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                        )}
                      >Daftar Staf</button>
                      <button
                        onClick={() => setStaffSubTab('create')}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition',
                          staffSubTab === 'create' ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                        )}
                      ><UserPlus className="h-3 w-3" /> Tambah Staf</button>
                    </div>
                  </div>

                  {/* Staff List */}
                  {staffSubTab === 'list' && (
                    <div className="space-y-3">
                      {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
                      ) : staffList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                            <Users className="h-5 w-5 text-zinc-600" />
                          </div>
                          <p className="text-xs text-zinc-500 font-medium">Belum ada data staf terdaftar</p>
                          <button onClick={() => setStaffSubTab('create')}
                            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 transition">
                            <UserPlus className="h-3.5 w-3.5" /> Tambah Staf Pertama
                          </button>
                        </div>
                      ) : (
                        staffList.map((staff: any, idx: number) => (
                          <motion.div key={staff.id || idx} variants={fadeUp} initial="hidden" animate="show"
                            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-900/50 bg-sky-950/30">
                                <span className="text-xs font-bold text-sky-400">{(staff.nama_lengkap || staff.email || '?')[0].toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-100">{staff.nama_lengkap || '-'}</div>
                                <div className="text-[10px] text-zinc-400 font-mono truncate">{staff.email}</div>
                                {staff.no_telepon && <div className="text-[9px] text-zinc-500 mt-0.5">{staff.no_telepon}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={cn('rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border',
                                staff.role === 'superadmin' ? 'bg-purple-950/50 border-purple-900/40 text-purple-400' :
                                staff.role === 'admin' ? 'bg-sky-950/50 border-sky-900/40 text-sky-400' :
                                'bg-zinc-950 border-zinc-800 text-zinc-400'
                              )}>{staff.role || 'petugas'}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Create Staff Form */}
                  {staffSubTab === 'create' && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-5">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Form Tambah Staf Baru</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Buat akun staf baru untuk mengakses admin portal</p>
                      </div>

                      {staffFormError && (
                        <div className="flex items-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />{staffFormError}
                        </div>
                      )}
                      {staffFormSuccess && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />{staffFormSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {([
                          { key: 'email', label: 'Email', type: 'email', placeholder: 'nama@domain.com', required: true },
                          { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 8 karakter', required: true },
                          { key: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama sesuai KTP', required: true },
                          { key: 'nama_panggilan', label: 'Nama Panggilan', type: 'text', placeholder: 'Nama sehari-hari' },
                          { key: 'no_telepon', label: 'No. Telepon', type: 'tel', placeholder: '08xxxxxxxxxx' },
                          { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date', placeholder: '' },
                        ] as const).map(field => (
                          <div key={field.key}>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                              {field.label} {('required' in field) && <span className="text-rose-400">*</span>}
                            </label>
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={(staffForm as any)[field.key] || ''}
                              onChange={e => setStaffForm(f => ({ ...f, [field.key]: e.target.value }))}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Role <span className="text-rose-400">*</span></label>
                          <select
                            value={staffForm.role}
                            onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition"
                          >
                            <option value="petugas">Petugas</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={async () => {
                            if (!staffForm.email || !staffForm.password || !staffForm.nama_lengkap) {
                              setStaffFormError('Email, password, dan nama lengkap wajib diisi')
                              return
                            }
                            setStaffFormError(null)
                            setStaffFormSuccess(null)
                            setStaffFormLoading(true)
                            try {
                              await adminService.createStaffUser(staffForm)
                              setStaffFormSuccess('Staf berhasil ditambahkan!')
                              setStaffForm({ email: '', password: '', nama_lengkap: '', nama_panggilan: '', no_telepon: '', tanggal_lahir: '', role: 'petugas' })
                              const res = await adminService.getStaffUsers()
                              if (res.success) setStaffList(res.data)
                            } catch (err: any) {
                              setStaffFormError(err.message || 'Gagal menambahkan staf')
                            } finally {
                              setStaffFormLoading(false)
                            }
                          }}
                          disabled={staffFormLoading}
                          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-100 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60 transition active:scale-95"
                        >
                          {staffFormLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                          {staffFormLoading ? 'Menyimpan...' : 'Tambah Staf'}
                        </button>
                        <button
                          onClick={() => { setStaffFormError(null); setStaffFormSuccess(null); setStaffForm({ email: '', password: '', nama_lengkap: '', nama_panggilan: '', no_telepon: '', tanggal_lahir: '', role: 'petugas' }) }}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition"
                        >Reset</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB CONTENT: DATABASE HOAKS ─────────────────────────────── */}
              {activeTab === 'hoaks' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Database Kata Kunci Hoaks</h2>
                      <span className="rounded-full bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-bold">
                        {hoaxList.length} Entri
                      </span>
                    </div>
                    <button
                      onClick={() => { setHoaxFormOpen(true); setHoaxEditItem(null); setHoaxFormData({ keywords: '', title: '', explanation: '', source_url: '' }) }}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-950/50 transition active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Entri Hoaks
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Cari kata kunci hoaks..."
                      value={hoaxSearch}
                      onChange={e => setHoaxSearch(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                    />
                  </div>

                  {/* List */}
                  {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
                  ) : hoaxList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                        <AlertTriangle className="h-5 w-5 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500">Belum ada entri kata kunci hoaks</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hoaxList
                        .filter((h: any) => !hoaxSearch.trim() ||
                          (h.keywords || '').toLowerCase().includes(hoaxSearch.toLowerCase()) ||
                          (h.title || '').toLowerCase().includes(hoaxSearch.toLowerCase())
                        )
                        .slice((hoaxPage - 1) * 20, hoaxPage * 20)
                        .map((hoax: any) => (
                          <motion.div key={hoax.id} variants={fadeUp} initial="hidden" animate="show"
                            className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-zinc-100">{hoax.title || 'Tanpa Judul'}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {(hoax.keywords || '').split(',').filter(Boolean).map((kw: string, i: number) => (
                                  <span key={i} className="inline-block rounded bg-amber-950/50 border border-amber-900/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-400">{kw.trim()}</span>
                                ))}
                              </div>
                              {hoax.explanation && (
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{hoax.explanation}</p>
                              )}
                              {hoax.source_url && (
                                <a href={hoax.source_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 mt-1 text-[9px] text-sky-400 hover:text-sky-300 transition">
                                  <ExternalLink className="h-2.5 w-2.5" /> Sumber
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => { setHoaxEditItem(hoax); setHoaxFormData({ keywords: hoax.keywords || '', title: hoax.title || '', explanation: hoax.explanation || '', source_url: hoax.source_url || '' }); setHoaxFormOpen(true) }}
                                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-sky-400 hover:border-sky-900 transition"
                              ><Edit2 className="h-3 w-3" /></button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Hapus entri hoaks ini?')) return
                                  await adminService.deleteHoax(hoax.id)
                                  const res = await adminService.getHoaxes(hoaxSearch, hoaxPage)
                                  setHoaxList(res.hoaxes || [])
                                  setHoaxTotal(res.total || 0)
                                  setHoaxTotalPages(res.totalPages || 1)
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-rose-400 hover:border-rose-900 transition"
                              ><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </motion.div>
                        ))
                      }

                      {hoaxTotalPages > 1 && (
                        <div className="flex items-center justify-between border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 mt-3">
                          <span className="text-[10px] text-zinc-500">{hoaxTotal} entri total</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setHoaxPage(p => Math.max(1, p - 1))} disabled={hoaxPage === 1}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition">
                              <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
                            </button>
                            <span className="px-2 text-[10px] text-zinc-400 font-mono">{hoaxPage}/{hoaxTotalPages}</span>
                            <button onClick={() => setHoaxPage(p => Math.min(hoaxTotalPages, p + 1))} disabled={hoaxPage === hoaxTotalPages}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 transition">
                              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hoaks Form Modal */}
                  <AnimatePresence>
                    {hoaxFormOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                          className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
                          <div className="flex items-center justify-between border-b border-zinc-800 p-5">
                            <div>
                              <h3 className="text-sm font-bold text-zinc-100">{hoaxEditItem ? 'Edit Entri Hoaks' : 'Tambah Entri Hoaks Baru'}</h3>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Kata kunci untuk mendeteksi hoaks di WhatsApp</p>
                            </div>
                            <button onClick={() => setHoaxFormOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-5 space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Judul <span className="text-rose-400">*</span></label>
                              <input type="text" placeholder="Judul singkat entri hoaks"
                                value={hoaxFormData.title}
                                onChange={e => setHoaxFormData(f => ({ ...f, title: e.target.value }))}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Kata Kunci <span className="text-rose-400">*</span></label>
                              <input type="text" placeholder="kata1, kata2, kata3 (pisah dengan koma)"
                                value={hoaxFormData.keywords}
                                onChange={e => setHoaxFormData(f => ({ ...f, keywords: e.target.value }))}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Penjelasan / Klarifikasi</label>
                              <textarea rows={3} placeholder="Jelaskan mengapa ini hoaks dan apa faktanya..."
                                value={hoaxFormData.explanation}
                                onChange={e => setHoaxFormData(f => ({ ...f, explanation: e.target.value }))}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition resize-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">URL Sumber (opsional)</label>
                              <input type="url" placeholder="https://sumber-terpercaya.com"
                                value={hoaxFormData.source_url}
                                onChange={e => setHoaxFormData(f => ({ ...f, source_url: e.target.value }))}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition" />
                            </div>
                          </div>
                          <div className="flex gap-3 border-t border-zinc-800 p-5">
                            <button
                              onClick={async () => {
                                if (!hoaxFormData.title || !hoaxFormData.keywords) return
                                setHoaxFormLoading(true)
                                try {
                                  if (hoaxEditItem) {
                                    await adminService.updateHoax(hoaxEditItem.id, hoaxFormData)
                                  } else {
                                    await adminService.createHoax(hoaxFormData)
                                  }
                                  const res = await adminService.getHoaxes(hoaxSearch, hoaxPage)
                                  setHoaxList(res.hoaxes || [])
                                  setHoaxTotal(res.total || 0)
                                  setHoaxTotalPages(res.totalPages || 1)
                                  setHoaxFormOpen(false)
                                } catch (err: any) {
                                  alert(err.message || 'Gagal menyimpan')
                                } finally {
                                  setHoaxFormLoading(false)
                                }
                              }}
                              disabled={hoaxFormLoading || !hoaxFormData.title || !hoaxFormData.keywords}
                              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-100 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60 transition active:scale-95"
                            >
                              {hoaxFormLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                              {hoaxFormLoading ? 'Menyimpan...' : hoaxEditItem ? 'Simpan Perubahan' : 'Tambah Entri'}
                            </button>
                            <button onClick={() => setHoaxFormOpen(false)}
                              className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition">Batal</button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── Report Detail Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onUpdate={async (id, status, note) => {
              await handleStatusUpdate(id, status, note)
              setSelectedReport(null)
            }}
            onOpenChat={(id) => setActiveChatReportId(id)}
          />
        )}
      </AnimatePresence>

      {/* ─── Service Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedService && (
          <ServiceDetailModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Add Service Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddServiceOpen && (
          <AddServiceModal
            onClose={() => setIsAddServiceOpen(false)}
            onAdd={async (payload) => {
              await adminService.createService(payload)
              await loadServices(serviceFilterCategory)
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Add RAG Document Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isUploadDocOpen && (
          <AddRAGDocumentModal
            onClose={() => setIsUploadDocOpen(false)}
            onAdd={async (payload, fileInfo) => {
              await adminService.createService(payload)
              if (fileInfo) {
                try {
                  await adminService.createRAGDocument(fileInfo)
                  await loadRAGDocuments()
                } catch (e) {
                  console.error('Failed to save RAG document metadata:', e)
                }
              }
              await loadServices(serviceFilterCategory)
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Active Chat Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeChatReportId && (
          <ActiveChatModal
            reportId={activeChatReportId}
            onClose={() => setActiveChatReportId(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Chat Transcript Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedHistory && (
          <ChatTranscriptModal
            session={selectedHistory}
            onClose={() => setSelectedHistory(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
