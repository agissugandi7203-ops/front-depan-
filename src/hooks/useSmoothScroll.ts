import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'

export function useSmoothScroll() {
  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExponential
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
    })

    // Integrate with GSAP ticker
    const update = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    // Store globally for navigation scroll hooks
    ;(window as any).lenis = lenis

    return () => {
      lenis.destroy()
      gsap.ticker.remove(update)
      delete (window as any).lenis
    }
  }, [])
}
