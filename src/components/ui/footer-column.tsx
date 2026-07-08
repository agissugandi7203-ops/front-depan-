/**
 * Footer4Col — Adapted for KOMUNITAS project
 * Original structure from mvpblocks, rebranded & adapted for React Router (no Next.js)
 */

import {
  Github,
  Instagram,
  Twitter,
  Mail,
  MapPin,
  Phone,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Brand Data ───────────────────────────────────────────────────────────────
const data = {
  social: {
    github:    'https://github.com',
    instagram: 'https://instagram.com',
    twitter:   'https://twitter.com',
  },
  layanan: {
    asisten:   '/#tools-section',
    verifikasi:'/#tools-section',
    ringkasan: '/#tools-section',
    laporan:   '/chat',
  },
  tentang: {
    misi:       '#',
    visi:       '#',
    kebijakan:  '#',
    opensource: '#',
  },
  bantuan: {
    panduan: '#',
    faq:     '#',
    live:    '/chat',
  },
  kontak: {
    email:   'komunitas@info.id',
    phone:   '+62 800-000-0000',
    address: 'Indonesia',
  },
  company: {
    name:        'KOMUNITAS',
    description: 'Platform informasi publik berbasis AI yang membantu warga Indonesia mengakses layanan pemerintah, memverifikasi berita, dan memahami prosedur birokrasi dengan mudah.',
  },
}

// ─── Link Lists ───────────────────────────────────────────────────────────────
const socialLinks = [
  { icon: Github,    label: 'GitHub',    href: data.social.github },
  { icon: Instagram, label: 'Instagram', href: data.social.instagram },
  { icon: Twitter,   label: 'Twitter',   href: data.social.twitter },
]

const layananLinks = [
  { text: 'Asisten AI',           href: '/chat' },
  { text: 'Verifikasi Klaim',     href: '/#tools-section' },
  { text: 'Ringkasan Dokumen',    href: '/#tools-section' },
  { text: 'Laporan Warga',        href: '/chat' },
]

const tentangLinks = [
  { text: 'Misi & Visi',          href: '/about?tab=visi', external: false },
  { text: 'Kebijakan Privasi',    href: '/about?tab=kebijakan', external: false },
  { text: 'Syarat Layanan',       href: '/about?tab=syarat', external: false },
]

const bantuanLinks = [
  { text: 'Panduan Pengguna',     href: '/about?tab=panduan' },
  { text: 'FAQ',                  href: '/about?tab=faq' },
  { text: 'Live Chat AI',         href: '/chat', hasIndicator: true },
]

const kontakInfo = [
  { icon: Mail,   text: data.kontak.email,   href: `mailto:${data.kontak.email}` },
  { icon: Phone,  text: data.kontak.phone,   href: `tel:${data.kontak.phone}` },
  { icon: MapPin, text: data.kontak.address, href: '#', isAddress: true },
]

// ─── Rujukan Lembaga ─────────────────────────────────────────────────────────
const rujukan = ['KPAI', 'Komnas HAM', 'PMI', 'Kominfo', 'Kemsos', 'BPS']

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer4Col() {
  const navigate = useNavigate()

  const handleNavClick = (href: string) => {
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener noreferrer')
      return
    }
    if (href.startsWith('/#')) {
      navigate('/')
      setTimeout(() => {
        const id = href.replace('/#', '')
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }
    if (href === '#') return
    navigate(href)
  }

  return (
    <footer className="w-full border-t border-white/[0.05] bg-[#060606] mt-0">
      <div className="mx-auto max-w-5xl px-6 md:px-10 pt-16 pb-8">

        {/* ── Top grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">

          {/* Brand column */}
          <div className="space-y-6">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 group w-fit"
            >
              <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-7 w-7 object-contain rounded-md transition-opacity group-hover:opacity-80" />
              <span className="font-semibold text-[16px] text-white tracking-[-0.025em]">
                KOMUNITAS
              </span>
            </button>

            {/* Tagline */}
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-xs">
              {data.company.description}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>

            {/* Data source credits */}
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-medium">
                Data bersumber dari
              </p>
              <div className="flex flex-wrap gap-2">
                {rujukan.map((name) => (
                  <span
                    key={name}
                    className="text-[10px] text-zinc-600 border border-zinc-800/60 bg-zinc-900/20 px-2 py-0.5 rounded-md"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns — span 2 on lg */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-2">

            {/* Layanan */}
            <div className="space-y-5">
              <p className="text-[12px] font-semibold text-white tracking-[-0.01em] uppercase tracking-wider">
                Layanan
              </p>
              <ul className="space-y-3">
                {layananLinks.map(({ text, href }) => (
                  <li key={text}>
                    <button
                      onClick={() => handleNavClick(href)}
                      className="text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 text-left"
                    >
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tentang */}
            <div className="space-y-5">
              <p className="text-[12px] font-semibold text-white tracking-[-0.01em] uppercase tracking-wider">
                Tentang
              </p>
              <ul className="space-y-3">
                {tentangLinks.map(({ text, href, external }) => (
                  <li key={text}>
                    {external ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
                      >
                        {text}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleNavClick(href)}
                        className="text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 text-left"
                      >
                        {text}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bantuan */}
            <div className="space-y-5">
              <p className="text-[12px] font-semibold text-white tracking-[-0.01em] uppercase tracking-wider">
                Bantuan
              </p>
              <ul className="space-y-3">
                {bantuanLinks.map(({ text, href, hasIndicator }) => (
                  <li key={text}>
                    <button
                      onClick={() => handleNavClick(href)}
                      className="inline-flex items-center gap-2 text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 text-left"
                    >
                      {text}
                      {hasIndicator && (
                        <span className="relative flex w-1.5 h-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kontak */}
            <div className="space-y-5">
              <p className="text-[12px] font-semibold text-white tracking-[-0.01em] uppercase tracking-wider">
                Kontak
              </p>
              <ul className="space-y-3">
                {kontakInfo.map(({ icon: Icon, text, href, isAddress }) => (
                  <li key={text}>
                    <a
                      href={href}
                      className="inline-flex items-start gap-2 text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 group"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-[1px] text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      {isAddress ? (
                        <address className="not-italic leading-relaxed">{text}</address>
                      ) : (
                        <span>{text}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────────── */}
        <div className="mt-14 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-700 order-2 sm:order-1">
            © 2026 KOMUNITAS — Hak cipta dilindungi undang-undang.
          </p>
          <p className="text-[11px] text-zinc-700 order-1 sm:order-2">
            Portal informasi faktual untuk seluruh warga Indonesia.
          </p>
        </div>
      </div>
    </footer>
  )
}
