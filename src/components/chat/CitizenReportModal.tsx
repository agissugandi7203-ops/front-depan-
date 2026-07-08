import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, MapPin, X, Loader2, CheckCircle2, Camera, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chatService } from '@/services/api'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'

interface CitizenReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (reportId: string) => void
}

export function CitizenReportModal({ isOpen, onClose, onSuccess }: CitizenReportModalProps) {
  const { currentSessionId } = useChatStore()
  const { user, isAuthenticated } = useAuthStore()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState('Sosial')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  
  // Camera & Gallery states
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [reportResult, setReportResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Prefill profile if authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      setName(user.nama_lengkap || '')
      setContact(user.nomor_telepon || '')
    }
  }, [isOpen, isAuthenticated, user])

  // Auto fetch location on open
  useEffect(() => {
    if (isOpen) {
      handleGetLocation()
    }
  }, [isOpen])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // --- Early Return Condition (must be placed after all hooks) ---
  if (!isOpen) return null

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolokasi tidak didukung oleh browser Anda.')
      return
    }

    setGpsLoading(true)
    setErrorMessage(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setGpsCoords(coords)
        setGpsLoading(false)

        // Asynchronously fetch reverse geocoding address from OSM Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'id-ID,id;q=0.9',
            'User-Agent': 'KOMUNITAS-Citizen-App'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              const addr = data.address
              const prov = addr.state || addr.region || ''
              const kab = addr.city || addr.regency || addr.municipality || addr.county || ''
              
              // Tentukan kecamatan secara akurat (tidak memakai nama desa/kelurahan)
              let kec = addr.subdistrict || addr.city_district || addr.town || ''
              
              const villageLower = (addr.village || addr.suburb || addr.quarter || '').toLowerCase();
              if (villageLower.includes('gandasari')) {
                kec = 'Katapang'
              } else if (villageLower.includes('samoja')) {
                kec = 'Batununggal'
              } else if (villageLower.includes('soreang')) {
                kec = 'Soreang'
              }
              
              // Koreksi penentuan kecamatan Soreang berdasarkan koordinat atau kode pos
              if (!kec) {
                if (addr.postcode === '40921' || (coords.lat >= -7.05 && coords.lat <= -7.00 && coords.lng >= 107.50 && coords.lng <= 107.60)) {
                  kec = 'Soreang'
                } else {
                  // Fallback jika tidak terdeteksi, ambil subdistrict atau suburb/village
                  kec = addr.subdistrict || addr.suburb || addr.village || addr.neighbourhood || ''
                }
              }

              // Konversi kelurahan/desa ke Kecamatan jika terlanjur terpilih
              const KECAMATAN_CLEAN: Record<string, string> = {
                'gandasari': 'Katapang',
                'samoja': 'Batununggal',
                'soreang': 'Soreang'
              }
              const kecLower = kec.toLowerCase();
              for (const [village, realKec] of Object.entries(KECAMATAN_CLEAN)) {
                if (kecLower.includes(village)) {
                  kec = realKec;
                  break;
                }
              }
              
              if (prov) setProvince(prov.replace(/Provinsi\s+/i, ''))
              if (kab) setCity(kab.replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, ''))
              if (kec) setDistrict(kec)
            }
          })
          .catch(err => {
            console.warn('Auto-geocoding address lookup failed:', err)
          })
      },
      (error) => {
        console.error('Gagal mendapatkan lokasi GPS:', error)
        setErrorMessage('Gagal mengambil lokasi GPS. Silakan aktifkan izin lokasi di browser Anda.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle name input strictly (allow letters, spaces, and single quote)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s']/g, '')
    setName(value)
  }

  // Handle contact input strictly (allow numbers only)
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setContact(value)
  }

  // Handle custom category strictly (letters and spaces only)
  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
    setCustomCategory(value)
  }

  // Camera capture methods
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 850 } } 
      })
      setStream(mediaStream)
      setIsCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      console.error('Kamera gagal dibuka:', err)
      setErrorMessage('Gagal mengakses kamera perangkat: ' + err)
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
      setImagePreview(dataUrl)
      const base64String = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '')
      setImageBase64(base64String)
    }
    closeCamera()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageBase64(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !category) return
    if (!gpsCoords) {
      setErrorMessage('Lokasi GPS wajib disertakan. Harap klik "Kirim Lokasi GPS" untuk melampirkan koordinat.')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    try {
      const data = {
        reporterName: name.trim() || 'Anonim',
        reporterContact: contact.trim() || '-',
        category: category === 'Lainnya' ? (customCategory.trim() || 'Lainnya') : category,
        description: description.trim(),
        sessionId: currentSessionId || undefined,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        image: imageBase64 || undefined
      }
      const response = await chatService.createReport(data)
      setReportResult(response)
      if (onSuccess && response.id) {
        onSuccess(response.id)
      }
    } catch (error: any) {
      console.error('Error submitting citizen report:', error)
      const msg = error?.message || 'Terjadi kesalahan tidak dikenal.'
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('econnrefused')) {
        setErrorMessage('Gagal terhubung ke server. Pastikan backend sedang berjalan dan coba lagi.')
      } else {
        setErrorMessage(`Gagal mengirimkan laporan: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setName('')
    setContact('')
    setCategory('Sosial')
    setCustomCategory('')
    setDescription('')
    setGpsCoords(null)
    setProvince('')
    setCity('')
    setDistrict('')
    setImagePreview(null)
    setImageBase64(null)
    setReportResult(null)
    setErrorMessage(null)
    closeCamera()
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleReset} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Laporan & Aduan Warga Darurat
            </h3>
            <p className="text-[10px] text-zinc-500 font-light">
              Kirimkan pengaduan langsung ke penanganan cepat komunitas setempat.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={handleReset}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {reportResult ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center mx-auto shadow-md border border-zinc-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-100">Laporan Berhasil Terkirim</h4>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  ID Laporan Anda: <code className="text-zinc-300 font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{reportResult.id}</code>
                </p>
              </div>
              <div className="rounded-md bg-zinc-800 border border-zinc-700 p-4 max-w-sm mx-auto text-left">
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light">{reportResult.message}</p>
                <div className="mt-3 flex justify-between items-center text-[9px] text-zinc-600 border-t border-zinc-700 pt-2.5 font-mono">
                  <span>Status: <strong className="text-zinc-300 uppercase">{reportResult.status}</strong></span>
                  <span>KOMUNITAS API</span>
                </div>
              </div>
              <Button onClick={handleReset} className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs px-6 py-4.5 rounded-md mt-2">
                Selesai
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Nama Pelapor (Opsional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Contoh: Budi Santoso"
                    disabled={isAuthenticated}
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Kontak / No. Telepon</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={handleContactChange}
                    placeholder="Contoh: 081234567890"
                    disabled={isAuthenticated}
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

                            {/* Regional Selectors styled in dark zinc glassmorphism */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="province" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Provinsi</label>
                  <input
                    id="province"
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    placeholder="Contoh: Jawa Barat"
                    required
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-650 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="city" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Kabupaten / Kota</label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    placeholder="Contoh: Bandung"
                    required
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-650 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="district" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Kecamatan / Desa</label>
                  <input
                    id="district"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    placeholder="Contoh: Coblong"
                    required
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-650 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Kategori Insiden</label>
                <div className="flex flex-wrap gap-2">
                  {['Darurat', 'Kesehatan', 'Kekerasan Anak', 'Sosial', 'Lainnya'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`min-h-[2.25rem] py-1.5 px-3 text-[10px] font-medium rounded-md border flex items-center justify-center text-center transition-all ${
                        category === cat
                          ? 'bg-zinc-100 border-transparent text-zinc-900 shadow-sm'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {category === 'Lainnya' && (
                  <div className="space-y-1.5 mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Sebutkan Kategori Lainnya</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={handleCustomCategoryChange}
                      placeholder="Contoh: Kerusakan Fasilitas Jalan"
                      required
                      className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 transition"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Deskripsi Detail Aduan</label>
                    {gpsCoords && (
                      <span className="text-[10px] text-emerald-400 font-medium inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        Lokasi GPS terlampir
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={gpsLoading}
                    onClick={handleGetLocation}
                    className="inline-flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-800 border border-zinc-700 px-2 py-1 rounded w-fit"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                    ) : (
                      <MapPin className="w-3 h-3 text-rose-400" />
                    )}
                    {gpsCoords ? 'Lokasi Terlampir' : 'Kirim Lokasi GPS'}
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan kejadian/insiden secara lengkap seperti alamat kejadian, waktu, korban..."
                  className="w-full h-32 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 resize-none leading-relaxed transition"
                  required
                />
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Foto Lampiran Kejadian (Opsional)</label>
                
                <input
                  type="file"
                  ref={galleryInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative rounded-md border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded overflow-hidden bg-zinc-900 border border-zinc-800">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                        Foto siap diunggah
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2.5 border border-dashed border-zinc-800 rounded-md bg-zinc-800/10 text-[10.5px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 hover:border-zinc-700 transition flex items-center justify-center gap-1.5 font-medium"
                    >
                      <Camera className="w-3.5 h-3.5 text-zinc-500" />
                      Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-2.5 border border-dashed border-zinc-800 rounded-md bg-zinc-800/10 text-[10.5px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 hover:border-zinc-700 transition flex items-center justify-center gap-1.5 font-medium"
                    >
                      <Image className="w-3.5 h-3.5 text-zinc-500" />
                      Unggah Gambar
                    </button>
                  </div>
                )}
              </div>

              {gpsCoords && (
                <div className="rounded-md border border-rose-800 bg-rose-950/30 text-rose-400 p-3 text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Koordinat: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  </span>
                  <button type="button" onClick={() => {
                    setGpsCoords(null)
                  }} className="text-rose-500/80 hover:text-rose-300">
                    Hapus Lokasi
                  </button>
                </div>
              )}

              {/* Mandatory Location Alert */}
              {!gpsCoords && (
                <div className="rounded-md border border-amber-800/40 bg-amber-950/10 p-3 text-[10px] text-amber-400 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Lokasi GPS Wajib:</strong> Anda harus menyertakan lokasi koordinat agar laporan dapat diproses. Harap izinkan browser mengakses lokasi Anda dan klik tombol &quot;Kirim Lokasi GPS&quot; di atas.
                  </span>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="rounded-md border border-rose-800 bg-rose-950/30 p-3 text-[11px] text-rose-400 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !description.trim() || !gpsCoords}
                className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-md text-xs tracking-wider disabled:opacity-40 disabled:hover:bg-zinc-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2 text-zinc-900" />
                    MENGIRIM ADUAN...
                  </>
                ) : (
                  'KIRIM LAPORAN ADUAN'
                )}
              </Button>
            </form>
          )}

          {/* Minimalist Web Camera Modal */}
          {isCameraOpen && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
              <div className="relative max-w-sm w-full bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl aspect-[3/4] flex flex-col justify-between">
                {/* Header / Close Button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={closeCamera}
                    type="button"
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
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Camera Capture circle button (iOS style) */}
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center z-10">
                  <button
                    onClick={capturePhoto}
                    type="button"
                    className="h-15 w-15 rounded-full border-4 border-white bg-transparent hover:bg-white/20 active:scale-90 transition-all cursor-pointer flex items-center justify-center shadow-2xl"
                    title="Ambil foto"
                  >
                    <span className="block h-10 w-10 rounded-full bg-white scale-100 hover:scale-95 active:scale-90 transition-transform" />
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-zinc-500 mt-3 font-medium select-none">
                Arahkan kamera ke kejadian dan klik tombol bulat
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
