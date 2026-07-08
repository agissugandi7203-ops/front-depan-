import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Search, Filter, MapPin, Calendar, User, Phone, 
  Loader2, FileText, Clock, AlertTriangle, Image as ImageIcon, MessageSquare
} from 'lucide-react'
import { adminService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  reporter_name: string
  reporter_contact: string
  category: string
  description: string
  status: string
  admin_note?: string
  latitude: number
  longitude: number
  image_url?: string
  province?: string
  city?: string
  district?: string
  created_at: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
}

const statusBadges: Record<string, { label: string; text: string; bg: string; border: string }> = {
  'Menunggu': { label: 'Menunggu', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'Diproses': { label: 'Diproses', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  'Selesai': { label: 'Selesai', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'Ditolak': { label: 'Ditolak', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
}

export function AllReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [provinceFilter, setProvinceFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<'none' | 'province' | 'city' | 'district'>('none')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  
  // Lists for dynamic filter population
  const [provinces, setProvinces] = useState<string[]>([])
  const [cities, setCityList] = useState<string[]>([])
  const [districts, setDistrictList] = useState<string[]>([])

  // Cascading dropdown mappings built once from full dataset
  const [provinceCityMap, setProvinceCityMap] = useState<Record<string, string[]>>({})
  const [cityDistrictMap, setCityDistrictMap] = useState<Record<string, string[]>>({})

  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Load unique filter options once on mount + build province->city and city->district mappings
  useEffect(() => {
    const initFilterOptions = async () => {
      try {
        const response = await adminService.getReports(undefined, 1, 1000)
        const reportsList = (response.reports || []) as Report[]
        const uniqueProvinces = Array.from(new Set(reportsList.map(r => r.province).filter(Boolean))) as string[]
        const uniqueCities = Array.from(new Set(reportsList.map(r => r.city).filter(Boolean))) as string[]
        const uniqueDistricts = Array.from(new Set(reportsList.map(r => r.district).filter(Boolean))) as string[]
        
        setProvinces(uniqueProvinces.sort())
        setCityList(uniqueCities.sort())
        setDistrictList(uniqueDistricts.sort())

        // Build cascading mappings
        const provinceCityMapRaw: Record<string, Set<string>> = {}
        const cityDistrictMapRaw: Record<string, Set<string>> = {}
        reportsList.forEach(r => {
          if (r.province && r.city) {
            if (!provinceCityMapRaw[r.province]) provinceCityMapRaw[r.province] = new Set()
            provinceCityMapRaw[r.province].add(r.city)
          }
          if (r.city && r.district) {
            if (!cityDistrictMapRaw[r.city]) cityDistrictMapRaw[r.city] = new Set()
            cityDistrictMapRaw[r.city].add(r.district)
          }
        })
        setProvinceCityMap(Object.fromEntries(Object.entries(provinceCityMapRaw).map(([k, v]) => [k, [...v]])))
        setCityDistrictMap(Object.fromEntries(Object.entries(cityDistrictMapRaw).map(([k, v]) => [k, [...v]])))
      } catch (err) {
        console.error('Failed to load filter options:', err)
      }
    }
    initFilterOptions()
  }, [])

  // Master fetch function with explicit params to avoid stale closures
  const loadPage = async (
    page: number,
    status: string,
    province: string,
    city: string,
    district: string
  ) => {
    setLoading(true)
    try {
      const statusArg = status === 'all' ? undefined : status
      const response = await adminService.getReports(
        statusArg,
        page,
        20,
        province,
        city,
        district
      )
      setReports((response.reports || []) as Report[])
      setTotalPages(response.totalPages || 1)
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error('Failed to fetch reports:', err)
      toast({
        title: 'Gagal Memuat Laporan',
        description: err.message || 'Terjadi kesalahan saat memuat data laporan aduan.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Ref to hold fresh states for WebSocket handler
  const refreshRefs = useRef({
    loadPage,
    currentPage,
    statusFilter,
    provinceFilter,
    cityFilter,
    districtFilter,
    reports
  })

  useEffect(() => {
    refreshRefs.current = {
      loadPage,
      currentPage,
      statusFilter,
      provinceFilter,
      cityFilter,
      districtFilter,
      reports
    }
  })

  // Real-time WebSocket report updates subscription
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: any = null
    let isUnmounted = false

    const connectWs = () => {
      if (isUnmounted) return
      if (ws) {
        ws.onclose = null
        ws.close()
      }

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsUrl = `${protocol}://${window.location.hostname}:3000/api/ws/admin`

      console.log('🔌 Connecting reports observer WebSocket:', wsUrl)
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload && (payload.type === 'REPORT_UPDATED' || payload.type === 'REPORT_URGENCY_UPDATED')) {
            const refs = refreshRefs.current
            const matchedReport = refs.reports.find((r: any) => r.id === payload.id)
            if (matchedReport) {
              toast({
                title: 'Status Aduan Diperbarui',
                description: `Status aduan Anda atas nama ${matchedReport.reporter_name} telah diperbarui oleh Petugas.`,
                type: 'success'
              })
              
              // Refresh page data without full reload
              refs.loadPage(
                refs.currentPage,
                refs.statusFilter,
                refs.provinceFilter,
                refs.cityFilter,
                refs.districtFilter
              )
            }
          }
        } catch (err) {
          console.error('Failed to parse reports ws message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔌 Reports observer WebSocket disconnected. Reconnecting...')
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectWs, 3000)
        }
      }

      ws.onerror = () => {
        if (ws) ws.close()
      }
    }

    connectWs()

    return () => {
      isUnmounted = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.close()
        ws = null
      }
    }
  }, [toast])

  // Fetch whenever page or filters change - params passed explicitly, no stale closure
  useEffect(() => {
    loadPage(currentPage, statusFilter, provinceFilter, cityFilter, districtFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, provinceFilter, cityFilter, districtFilter])

  // Reset to page 1 whenever filters change (triggers re-fetch via above effect with page=1)
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, provinceFilter, cityFilter, districtFilter])

  // Cascading dropdown computed options
  const displayCities = useMemo(() => {
    return provinceFilter !== 'all' && provinceCityMap[provinceFilter]
      ? provinceCityMap[provinceFilter].slice().sort()
      : cities
  }, [provinceFilter, provinceCityMap, cities])

  const displayDistricts = useMemo(() => {
    return cityFilter !== 'all' && cityDistrictMap[cityFilter]
      ? cityDistrictMap[cityFilter].slice().sort()
      : districts
  }, [cityFilter, cityDistrictMap, districts])

  // Local filtering only for text search
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    
    return matchesSearch
  })

  // Grouped reports logic
  const groupedReports = React.useMemo(() => {
    if (groupBy === 'none') return null
    const groups: Record<string, Report[]> = {}
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

  // Grouped stats (use total from server for accurate count)
  const stats = {
    total,
    pending: reports.filter(r => r.status === 'Menunggu').length,
    processing: reports.filter(r => r.status === 'Diproses').length,
    completed: reports.filter(r => r.status === 'Selesai').length,
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col relative overflow-x-hidden bg-dot-pattern">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-zinc-900/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full bg-zinc-900/10 blur-[150px]" />

      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 select-none">
              <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-5 w-5 object-contain" />
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-100">KOMUNITAS</span>
            </div>
            <h1 className="text-xs text-zinc-500 font-medium tracking-tight mt-0.5">Portal Seluruh Pengaduan Warga Nasional</h1>
          </div>
        </div>

        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <span className="block text-xs font-bold text-zinc-200">{user.nama_lengkap}</span>
              <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold tracking-wider">[{user.role}]</span>
            </div>
            {['admin', 'superadmin', 'petugas'].includes(user.role) && (
              <button 
                onClick={() => navigate('/admin')}
                className="px-3 py-1.5 text-[11px] font-bold tracking-wide rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition-all cursor-pointer"
              >
                Panel Dashboard
              </button>
            )}
          </div>
        )}
      </header>

      {/* ─── CONTENT AREA ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 relative z-10">
        
        {/* Page Title & Quick Stats Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Monitoring Pengaduan Nasional</h2>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Melihat seluruh aduan darurat, fasilitas umum, dan laporan bencana sosial secara transparan dan terkini dari seluruh penjuru Indonesia.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md w-full shrink-0 select-none">
            <div className="border border-zinc-900 bg-zinc-900/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="block text-lg font-bold tracking-tight text-zinc-100">{stats.total}</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5 block">Total</span>
            </div>
            <div className="border border-zinc-900 bg-amber-500/5 rounded-xl p-3 text-center">
              <span className="block text-lg font-bold tracking-tight text-amber-400">{stats.pending}</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5 block">Antre</span>
            </div>
            <div className="border border-zinc-900 bg-sky-500/5 rounded-xl p-3 text-center">
              <span className="block text-lg font-bold tracking-tight text-sky-400">{stats.processing}</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5 block">Proses</span>
            </div>
            <div className="border border-zinc-900 bg-emerald-500/5 rounded-xl p-3 text-center">
              <span className="block text-lg font-bold tracking-tight text-emerald-400">{stats.completed}</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5 block">Beres</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search bar */}
          <div className="relative md:col-span-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Cari pelapor, kategori, kata aduan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-sans"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative md:col-span-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-10 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none transition-all cursor-pointer font-sans appearance-none"
            >
              <option value="all">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Province Dropdown */}
          <div className="relative md:col-span-2">
            <select 
              value={provinceFilter}
              onChange={(e) => {
                setProvinceFilter(e.target.value)
                setCityFilter('all')
                setDistrictFilter('all')
              }}
              className="w-full h-10 pl-3 pr-10 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none transition-all cursor-pointer font-sans appearance-none"
            >
              <option value="all">Semua Provinsi</option>
              {provinces.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* City Dropdown - cascades from province */}
          <div className="relative md:col-span-2">
            <select 
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value)
                setDistrictFilter('all')
              }}
              className="w-full h-10 pl-3 pr-10 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none transition-all cursor-pointer font-sans appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={provinceFilter === 'all'}
            >
              <option value="all">Semua Kota/Kab</option>
              {displayCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* District Dropdown - cascades from city */}
          <div className="relative md:col-span-1.5">
            <select 
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-10 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none transition-all cursor-pointer font-sans appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={cityFilter === 'all'}
            >
              <option value="all">Semua Desa/Kec</option>
              {displayDistricts.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Grouping Dropdown */}
          <div className="relative md:col-span-1.5">
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full h-10 pl-3 pr-10 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none transition-all cursor-pointer font-sans appearance-none"
            >
              <option value="none">Tanpa Grouping</option>
              <option value="province">Grup: Provinsi</option>
              <option value="city">Grup: Kabupaten</option>
              <option value="district">Grup: Daerah</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* ─── REPORTS LIST & DETAILS SPLIT LAYOUT ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Reports Grid Column */}
          <div className="lg:col-span-7 space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 border border-zinc-900 bg-zinc-900/10 rounded-2xl space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                <p className="text-xs text-zinc-500">Mencari laporan terkini...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center space-y-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Laporan Tidak Ditemukan</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                    Tidak ada laporan warga yang cocok dengan parameter filter atau pencarian Anda waktu ini.
                  </p>
                </div>
                <button 
                  onClick={() => { setSearch(''); setStatusFilter('all'); setProvinceFilter('all'); setCityFilter('all'); setDistrictFilter('all'); setGroupBy('none'); }}
                  className="px-3.5 py-1.5 text-[11px] font-bold tracking-wide rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 cursor-pointer"
                >
                  Atur Ulang Filter
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupBy === 'none' ? (
                  <motion.div 
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-4"
                  >
                    {filteredReports.map((report) => {
                      const badge = statusBadges[report.status] || { label: report.status, text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' }
                      const isSelected = selectedReport?.id === report.id

                      return (
                        <motion.div
                          key={report.id}
                          variants={fadeUp}
                          onClick={() => setSelectedReport(report)}
                          className={cn(
                            "group border text-left rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-sm select-none",
                            isSelected 
                              ? "bg-zinc-900/50 border-zinc-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]" 
                              : "bg-zinc-900/20 hover:bg-zinc-900/40 border-zinc-900 hover:border-zinc-850"
                          )}
                        >
                          {/* Interactive glow border corner */}
                          <div className={cn(
                            "absolute top-0 right-0 h-[4px] w-20 rounded-bl-full transition-all duration-300",
                            report.status === 'Menunggu' && "bg-amber-500/50",
                            report.status === 'Diproses' && "bg-sky-500/50",
                            report.status === 'Selesai' && "bg-emerald-500/50",
                            report.status === 'Ditolak' && "bg-rose-500/50"
                          )} />

                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/90 font-mono">
                                {report.category}
                              </span>
                              <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors tracking-tight leading-snug mt-0.5">
                                {report.reporter_name}
                              </h3>
                            </div>

                            <span className={cn(
                              "px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full border shrink-0 font-mono select-none",
                              badge.text, badge.bg, badge.border
                            )}>
                              {badge.label}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors line-clamp-2 leading-relaxed mb-4">
                            {report.description}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-900/80 text-[10px] text-zinc-500 font-mono font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 shrink-0 text-zinc-600" />
                              <span>{formatDate(report.created_at)}</span>
                            </div>

                            {report.province && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-zinc-600" />
                                <span className="truncate max-w-[150px]">{report.city || report.province}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                ) : (
                  Object.entries(groupedReports || {}).map(([groupName, groupItems]) => (
                    <div key={`group-${groupName}`} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-900/80 pb-2 sticky top-[72px] bg-zinc-950/90 backdrop-blur-sm z-20">
                        <MapPin className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          {groupBy === 'province' ? 'Provinsi' : groupBy === 'city' ? 'Kabupaten' : 'Daerah'}: {groupName}
                        </h3>
                        <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 font-mono font-semibold">
                          {groupItems.length} Laporan
                        </span>
                      </div>
                      <motion.div 
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4"
                      >
                        {groupItems.map((report) => {
                          const badge = statusBadges[report.status] || { label: report.status, text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' }
                          const isSelected = selectedReport?.id === report.id

                          return (
                            <motion.div
                              key={report.id}
                              variants={fadeUp}
                              onClick={() => setSelectedReport(report)}
                              className={cn(
                                "group border text-left rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-sm select-none",
                                isSelected 
                                  ? "bg-zinc-900/50 border-zinc-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]" 
                                  : "bg-zinc-900/20 hover:bg-zinc-900/40 border-zinc-900 hover:border-zinc-850"
                              )}
                            >
                              {/* Interactive glow border corner */}
                              <div className={cn(
                                "absolute top-0 right-0 h-[4px] w-20 rounded-bl-full transition-all duration-300",
                                report.status === 'Menunggu' && "bg-amber-500/50",
                                report.status === 'Diproses' && "bg-sky-500/50",
                                report.status === 'Selesai' && "bg-emerald-500/50",
                                report.status === 'Ditolak' && "bg-rose-500/50"
                              )} />

                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/90 font-mono">
                                    {report.category}
                                  </span>
                                  <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors tracking-tight leading-snug mt-0.5">
                                    {report.reporter_name}
                                  </h3>
                                </div>

                                <span className={cn(
                                  "px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full border shrink-0 font-mono select-none",
                                  badge.text, badge.bg, badge.border
                                )}>
                                  {badge.label}
                                </span>
                              </div>

                              <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors line-clamp-2 leading-relaxed mb-4">
                                {report.description}
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-900/80 text-[10px] text-zinc-500 font-mono font-medium">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 shrink-0 text-zinc-600" />
                                  <span>{formatDate(report.created_at)}</span>
                                </div>

                                {report.province && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0 text-zinc-600" />
                                    <span className="truncate max-w-[150px]">{report.city || report.province}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  Menampilkan {reports.length} dari {total} laporan - Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Sebelumnya
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, currentPage - 2)
                    const page = start + i
                    if (page > totalPages) return null
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                          page === currentPage
                            ? 'border-purple-600 bg-purple-600/20 text-purple-300'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Selected Report Details View Column */}
          <div className="lg:col-span-5 sticky top-24">
            <AnimatePresence mode="wait">
              {selectedReport ? (
                <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="border border-zinc-900 bg-zinc-900/20 backdrop-blur-md rounded-2xl p-6 space-y-6 relative overflow-hidden"
                >
                  {/* Subtle decorative glow overlay inside panel */}
                  <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-zinc-800/10 blur-3xl pointer-events-none" />

                  {/* Header Details */}
                  <div className="flex items-start justify-between gap-4 border-b border-zinc-900 pb-5 relative z-10 select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 font-mono">
                        {selectedReport.category}
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                        Aduan #{selectedReport.id.slice(0, 8)}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>Dikirim {formatDate(selectedReport.created_at)}</span>
                      </div>
                    </div>

                    <span className={cn(
                      "px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full border font-mono",
                      (statusBadges[selectedReport.status] || {}).text,
                      (statusBadges[selectedReport.status] || {}).bg,
                      (statusBadges[selectedReport.status] || {}).border
                    )}>
                      {selectedReport.status}
                    </span>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-2 relative z-10">
                    <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Uraian Masalah</h4>
                    <p className="text-[12px] text-zinc-300 leading-relaxed font-sans bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/65">
                      {selectedReport.description}
                    </p>
                  </div>

                  {/* Regional and Location Details */}
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">Wilayah Provinsi</span>
                      <span className="text-xs font-semibold text-zinc-200 block truncate">{selectedReport.province || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">Kota / Kabupaten</span>
                      <span className="text-xs font-semibold text-zinc-200 block truncate">{selectedReport.city || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">Kecamatan / Desa</span>
                      <span className="text-xs font-semibold text-zinc-200 block truncate">{selectedReport.district || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">Titik GPS</span>
                      <span className="text-[10px] font-mono text-zinc-400 block truncate">
                        {selectedReport.latitude?.toFixed(6)}, {selectedReport.longitude?.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  {/* Attachment Section if image is available */}
                  {selectedReport.image_url && (
                    <div className="space-y-2 relative z-10">
                      <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono flex items-center gap-1.5">
                        <ImageIcon className="h-3 w-3 text-zinc-500" /> Lampiran Foto
                      </h4>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 flex items-center justify-center">
                        <img 
                          src={selectedReport.image_url.startsWith('data:') ? selectedReport.image_url : `data:image/jpeg;base64,${selectedReport.image_url}`} 
                          alt="Lampiran aduan" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Reporter Contact Info */}
                  <div className="border-t border-zinc-900 pt-5 space-y-3 relative z-10">
                    <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Identitas Pelapor</h4>
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="flex items-center gap-2.5 text-zinc-300">
                        <User className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{selectedReport.reporter_name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-zinc-300">
                        <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{selectedReport.reporter_contact || 'Rahasia/Tidak disediakan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Follow Up Note */}
                  {selectedReport.admin_note && (
                    <div className="border-t border-zinc-900 pt-5 space-y-2 relative z-10">
                      <h4 className="text-[10px] uppercase tracking-wider text-amber-500/90 font-bold font-mono flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500/80" /> Catatan Petugas
                      </h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                        {selectedReport.admin_note}
                      </p>
                    </div>
                  )}

                  {/* Action Link (e.g. Chat/Contact) if User is Staff */}
                  {user && ['admin', 'superadmin', 'petugas'].includes(user.role) && (
                    <div className="border-t border-zinc-900 pt-5 flex gap-3 relative z-10">
                      <button 
                        onClick={() => navigate('/admin')}
                        className="flex-1 h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                        Buka Ruang Obrolan
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center border border-zinc-900 bg-zinc-900/10 border-dashed rounded-2xl p-12 text-center h-[400px] select-none text-zinc-500">
                  <MapPin className="h-6 w-6 text-zinc-700 animate-pulse mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Detail Laporan</p>
                  <p className="text-[11px] max-w-xs leading-relaxed mt-1 text-zinc-600">
                    Pilih salah satu laporan aduan dari daftar di sebelah kiri untuk melihat detail data wilayah, koordinat, foto pendukung, dan riwayat tindak lanjut petugas.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </div>
  )
}

export default AllReports
