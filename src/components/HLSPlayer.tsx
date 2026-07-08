import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface HLSPlayerProps {
  src: string
  className?: string
}

export function HLSPlayer({ src, className }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 10, // Optimize memory & latency
        enableWorker: true,
        lowLatencyMode: true,
      })

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(err => {
          console.log('Autoplay was prevented, trying muted autoplay...', err)
          video.muted = true
          video.play().catch(pErr => console.error('Play failed:', pErr))
        })
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error encountered, trying to recover...')
              hls?.startLoad()
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error encountered, trying to recover...')
              hls?.recoverMediaError()
              break;
            default:
              console.error('Fatal HLS error, destroying player:', data)
              hls?.destroy()
              break;
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback for Safari natively supporting HLS
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
          console.log('Autoplay was prevented natively, trying muted...', err)
          video.muted = true
          video.play().catch(pErr => console.error('Native play failed:', pErr))
        })
      })
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      className={className}
      playsInline
      autoPlay
      loop
      muted
      controls={false}
    />
  )
}
