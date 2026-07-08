import React, { useEffect, useRef, memo } from 'react'

// Lazy-import mermaid so it doesn't block initial bundle parse
let mermaidInstance: any = null
const getMermaid = async () => {
  if (!mermaidInstance) {
    const m = await import('mermaid')
    mermaidInstance = m.default
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#18181b',
        primaryColor: '#6d28d9',
        primaryTextColor: '#e4e4e7',
        lineColor: '#52525b',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#27272a',
        edgeLabelBackground: '#18181b',
        nodeTextColor: '#e4e4e7',
      },
      flowchart: { curve: 'basis', htmlLabels: true },
    })
  }
  return mermaidInstance
}

let mermaidIdCounter = 0

interface Props {
  chart: string
}

export const MermaidDiagram: React.FC<Props> = memo(({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = useRef(`mermaid-${++mermaidIdCounter}`)

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current || !chart.trim()) return
      try {
        const mermaid = await getMermaid()
        const { svg } = await mermaid.render(id.current, chart.trim())
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
          }
        }
      } catch (err) {
        console.warn('Mermaid render error:', err)
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre style="font-size:11px;color:#71717a;padding:8px;background:#27272a;border-radius:8px;overflow:auto">${chart}</pre>`
        }
      }
    }
    render()
  }, [chart])

  return (
    <div
      ref={containerRef}
      className="my-4 p-4 rounded-xl bg-zinc-900/80 border border-purple-900/30 overflow-x-auto"
      style={{ minHeight: 60 }}
    />
  )
})

MermaidDiagram.displayName = 'MermaidDiagram'

