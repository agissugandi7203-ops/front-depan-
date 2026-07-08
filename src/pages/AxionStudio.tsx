import { useRef, useState, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Shader, Swirl, ChromaFlow, FlutedGlass, FilmGrain } from "shaders/react"
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react"

const NAV_LINKS = ["Work", "Services", "Studio", "Contact"]

const CASE_STUDIES = [
  {
    id: "cs1",
    client: "Meridian Bank",
    category: "Brand Identity",
    year: "2025",
    summary: "A full visual system overhaul for a legacy financial institution navigating a digital-first generation.",
    videoSrc: "",
    accent: "#d4a574",
    bg: "#1a1208",
  },
  {
    id: "cs2",
    client: "Vela Motion",
    category: "Motion Design",
    year: "2025",
    summary: "Defining the kinetic language and visual vocabulary for a next-gen mobility platform.",
    videoSrc: "",
    accent: "#7dd3fc",
    bg: "#05111f",
  },
  {
    id: "cs3",
    client: "Forma Objects",
    category: "Spatial + Digital",
    year: "2024",
    summary: "Bridging physical and digital presence for an architecture and product design collective.",
    videoSrc: "",
    accent: "#a5b4fc",
    bg: "#0d0a1c",
  },
]

const SERVICES = [
  { title: "Brand Identity", sub: "Visual systems that outlast trends" },
  { title: "Motion and Film", sub: "Kinetic storytelling at every scale" },
  { title: "Digital Product", sub: "Interfaces built with purpose" },
  { title: "Spatial Design", sub: "From built environment to XR" },
]

function TextRoll({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10% 0px" })
  return (
    <span ref={ref} className={"inline-flex overflow-hidden " + className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: "110%", opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : { y: "110%", opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1], delay: delay + i * 0.022 }}
        >
          {char === " " ? "\u00a0" : char}
        </motion.span>
      ))}
    </span>
  )
}

function AxionNav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="relative z-20 w-full flex justify-center pt-5 px-4 sm:px-6" aria-label="Primary navigation">
      <div className="w-full max-w-[1440px] p-2 sm:p-3">
        <div className="flex items-center justify-between bg-white rounded-full px-5 py-3" style={{ boxShadow: "0 1px 18px 0 rgba(0,0,0,0.06)" }}>
          <a href="#hero" className="font-semibold text-[15px] text-[#111] tracking-[-0.03em] select-none">AXION</a>
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a href={"#" + link.toLowerCase()} className="text-[13px] text-[#555] hover:text-[#111] font-medium transition-colors duration-200">{link}</a>
              </li>
            ))}
          </ul>
          <a href="#contact" className="hidden md:inline-flex items-center gap-1.5 bg-[#111] text-white text-[13px] font-medium px-4 py-2 rounded-full hover:bg-[#222] transition-colors duration-200">
            Start a project <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <button className="md:hidden p-1 text-[#111]" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-2 bg-white rounded-2xl shadow-lg px-6 py-5 space-y-4 md:hidden"
            >
              {NAV_LINKS.map((link) => (
                <a key={link} href={"#" + link.toLowerCase()} className="block text-[14px] text-[#333] font-medium" onClick={() => setOpen(false)}>{link}</a>
              ))}
              <a href="#contact" className="inline-flex items-center gap-1.5 bg-[#111] text-white text-[13px] font-medium px-4 py-2 rounded-full" onClick={() => setOpen(false)}>
                Start a project <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#EFEFEF" }}>
      <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
        <Shader style={{ width: "100%", height: "100%" }} disableTelemetry>
          <Swirl colorA="#ffffff" colorB="#f0f0f0" detail={1.7} />
          <ChromaFlow baseColor="#ffffff" downColor="#ff5f03" leftColor="#ff5f03" rightColor="#ff5f03" upColor="#ff5f03" momentum={13} radius={3.5} />
          <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
          <FilmGrain strength={0.05} />
        </Shader>
      </div>
      <AxionNav />
      <div className="relative z-20 flex flex-col justify-end flex-1 px-6 sm:px-10 pb-14 md:pb-20 max-w-[1440px] mx-auto w-full">
        <motion.p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#555] mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
          Design Studio
        </motion.p>
        <h1 className="text-[clamp(44px,9vw,120px)] font-bold tracking-[-0.045em] leading-[0.93] text-[#111] mb-10 max-w-[900px]">
          <TextRoll text="Craft." delay={0.1} className="block" />
          <TextRoll text="Context." delay={0.15} className="block" />
          <TextRoll text="Culture." delay={0.2} className="block" />
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <p className="text-[13.5px] text-[#555] leading-relaxed max-w-xs font-normal">
            Axion is a design agency building brands, products, and experiences for companies that want to matter.
          </p>
          <a href="#work" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#111] border border-[#111]/20 rounded-full px-5 py-2.5 hover:bg-[#111] hover:text-white transition-all duration-300 self-start sm:self-auto">
            View work <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-15% 0px" })
  return (
    <section id="studio" ref={ref} className="bg-[#F8F7F4] overflow-hidden" aria-label="About Axion Studio">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-24 md:py-36">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-12 md:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#E5E2DC] shadow-xl"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" className="opacity-25">
                <circle cx="100" cy="100" r="80" stroke="#111" strokeWidth="1"/>
                <circle cx="100" cy="100" r="55" stroke="#111" strokeWidth="0.5"/>
                <line x1="20" y1="100" x2="180" y2="100" stroke="#111" strokeWidth="0.5"/>
                <line x1="100" y1="20" x2="100" y2="180" stroke="#111" strokeWidth="0.5"/>
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#E5E2DC]/90 to-transparent">
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#555]">Berlin / Jakarta / New York</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.12 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#888]">The studio</p>
              <h2 className="text-[clamp(28px,4.5vw,52px)] font-bold tracking-[-0.035em] leading-[1.1] text-[#111]">Design as a strategic medium</h2>
              <p className="text-[15px] text-[#555] leading-relaxed font-normal max-w-md">
                Founded in 2018, Axion Studio works at the intersection of brand thinking and craft execution. We partner with ambitious companies to build visual identities, motion systems, and digital products that hold up over time.
              </p>
              <p className="text-[15px] text-[#555] leading-relaxed font-normal max-w-md">
                Good design is not decoration. It is a decision-making framework that shapes every touchpoint, every channel, every interaction your audience has with your company.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#888]">Capabilities</p>
              <ul className="divide-y divide-[#111]/[0.06]">
                {SERVICES.map((s, i) => (
                  <motion.li
                    key={s.title}
                    initial={{ opacity: 0, x: 12 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    className="flex items-center justify-between py-3.5 group cursor-default"
                  >
                    <div>
                      <p className="text-[14px] font-semibold text-[#111] group-hover:text-[#ff5f03] transition-colors duration-200">{s.title}</p>
                      <p className="text-[12px] text-[#888]">{s.sub}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#ccc] group-hover:text-[#ff5f03] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CaseStudyCard({ study, index }: { study: typeof CASE_STUDIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10% 0px" })
  useEffect(() => {
    if (!videoRef.current) return
    if (hovered) { videoRef.current.play().catch(() => {}) }
    else { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }, [hovered])
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.12 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-3xl cursor-pointer group"
      style={{ backgroundColor: study.bg, aspectRatio: index === 0 ? "16/10" : "4/3" }}
      role="article"
      aria-label={study.client + " case study"}
    >
      {study.videoSrc && (
        <video ref={videoRef} src={study.videoSrc} loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: hovered ? 1 : 0 }}
        />
      )}
      {!study.videoSrc && (
        <div className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: hovered ? 0.85 : 0.45, background: "radial-gradient(ellipse 70% 70% at 60% 40%, " + study.accent + "30, transparent)" }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute inset-0 p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
            style={{ color: study.accent, borderColor: study.accent + "40" }}>
            {study.category}
          </span>
          <span className="text-[11px] text-white/40 font-mono">{study.year}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-[clamp(20px,3vw,34px)] font-bold tracking-[-0.035em] text-white leading-tight">{study.client}</h3>
          <motion.p className="text-[13px] text-white/70 leading-relaxed max-w-sm font-light"
            initial={{ opacity: 0, y: 8 }}
            animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            {study.summary}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={hovered ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="inline-flex items-center gap-1.5 text-white text-[12px] font-semibold mt-1">
            View project <ArrowUpRight className="w-3.5 h-3.5" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

function CaseStudiesSection() {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: "-15% 0px" })
  return (
    <section id="work" className="bg-[#0D0D0D] py-24 md:py-36" aria-label="Selected work">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#555]">Selected work</p>
            <h2 ref={ref} className="text-[clamp(32px,6vw,72px)] font-bold tracking-[-0.04em] leading-[0.95] text-white">
              <TextRoll text="Our" delay={0} className="block" />
              <TextRoll text="projects." delay={0.06} className="block" />
            </h2>
          </div>
          <motion.a href="#contact" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white border border-white/15 rounded-full px-5 py-2.5 hover:border-white/40 transition-colors duration-200 self-start md:self-auto">
            All projects <ArrowRight className="w-3.5 h-3.5" />
          </motion.a>
        </div>
        <div className="space-y-4">
          <CaseStudyCard study={CASE_STUDIES[0]} index={0} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CaseStudyCard study={CASE_STUDIES[1]} index={1} />
            <CaseStudyCard study={CASE_STUDIES[2]} index={2} />
          </div>
        </div>
      </div>
    </section>
  )
}

function AxionFooter() {
  return (
    <footer id="contact" className="bg-[#0D0D0D] border-t border-white/[0.06] py-16 px-6 sm:px-10" aria-label="Footer">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-12 mb-16">
          <div className="space-y-4">
            <p className="text-[22px] font-bold tracking-[-0.03em] text-white">AXION</p>
            <p className="text-[13px] text-[#555] leading-relaxed max-w-xs font-normal">
              A design studio for companies that believe aesthetics and strategy are inseparable.
            </p>
            <a href="mailto:hello@axion.studio" className="inline-block text-[13px] text-[#888] hover:text-white transition-colors duration-200 font-medium">
              hello@axion.studio
            </a>
          </div>
          <div className="space-y-5">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[#444]">Navigation</p>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link}>
                  <a href={"#" + link.toLowerCase()} className="text-[13px] text-[#666] hover:text-white transition-colors duration-200">{link}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[#444]">Connect</p>
            <ul className="space-y-3">
              {["Instagram", "LinkedIn", "Behance", "Dribbble"].map((s) => (
                <li key={s}>
                  <a href="#" className="text-[13px] text-[#666] hover:text-white transition-colors duration-200 inline-flex items-center gap-1.5 group">
                    {s} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-8 border-t border-white/[0.05]">
          <p className="text-[11.5px] text-[#333]">2025 Axion Studio. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy", "Terms"].map((l) => (
              <a key={l} href="#" className="text-[11.5px] text-[#333] hover:text-[#888] transition-colors duration-200">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export function AxionStudio() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <HeroSection />
      <AboutSection />
      <CaseStudiesSection />
      <AxionFooter />
    </div>
  )
}

export default AxionStudio
