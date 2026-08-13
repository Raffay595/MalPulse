"use client"

import { useRef, useEffect, useCallback } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  /** Resting x position on the waveform path */
  baseX: number
  /** Resting y position on the waveform path */
  baseY: number
  /** Current rendered x */
  x: number
  /** Current rendered y */
  y: number
  /** Velocity x (spring damper) */
  vx: number
  /** Velocity y (spring damper) */
  vy: number
  /** 0–1, decays each frame — used to add glow on recently displaced dots */
  disturbance: number
}

export interface DotPulseProps {
  /** Number of dots in the waveform (default: 320) */
  dotCount?: number
  /** Visual radius of each dot in px (default: 2.5) */
  dotRadius?: number
  /** Cursor influence radius in px (default: 130) */
  influenceRadius?: number
  /** Waveform scroll speed multiplier (default: 1.0) */
  speed?: number
  /**
   * Dot color. If omitted the component reads --primary from the document's
   * CSS custom properties so it stays in sync with the design system.
   */
  color?: string
  className?: string
}

// ─── Waveform function ────────────────────────────────────────────────────────

/**
 * Returns a normalized y value [−1, 1] for a given x position [0, 1] along
 * one ECG cycle. Produces: flatline → small P-wave → sharp QRS complex →
 * T-wave → settle → flatline.
 */
function ecgY(t: number): number {
  // P-wave: gentle bump around 0.15
  const p = 0.18 * Math.exp(-Math.pow((t - 0.15) / 0.04, 2))
  // Q-deflection: tiny dip before spike
  const q = -0.12 * Math.exp(-Math.pow((t - 0.28) / 0.015, 2))
  // R-peak: sharp upward spike
  const r = 1.0 * Math.exp(-Math.pow((t - 0.32) / 0.02, 2))
  // S-dip: small dip after spike
  const s = -0.25 * Math.exp(-Math.pow((t - 0.37) / 0.018, 2))
  // T-wave: slower bump
  const tw = 0.28 * Math.exp(-Math.pow((t - 0.52) / 0.07, 2))
  return p + q + r + s + tw
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DotPulse({
  dotCount = 320,
  dotRadius = 2.5,
  influenceRadius = 130,
  speed = 1.0,
  color,
  className = "",
}: DotPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef(0)
  const mouseRef = useRef({ x: -9999, y: -9999, inside: false })
  const rafRef = useRef<number>(0)
  const reducedMotionRef = useRef(false)
  const resolvedColorRef = useRef<string>("#ef4444")

  // Resolve color from CSS custom property if not explicitly provided
  const resolveColor = useCallback(() => {
    if (color) {
      resolvedColorRef.current = color
      return
    }
    if (typeof window !== "undefined") {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim()
      // raw is "H S% L%" (without the hsl() wrapper in shadcn's CSS vars)
      if (raw) {
        resolvedColorRef.current = `hsl(${raw})`
      }
    }
  }, [color])

  // Build particle array sized to current canvas logical dimensions
  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = []
      for (let i = 0; i < dotCount; i++) {
        const t = i / dotCount
        const bx = t * width
        const midY = height / 2
        const amplitude = height * 0.32
        const by = midY - ecgY(t) * amplitude
        particles.push({
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          disturbance: 0,
        })
      }
      particlesRef.current = particles
    },
    [dotCount]
  )

  // Main animation loop — runs inside requestAnimationFrame, no React state
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Work in CSS-pixel space (canvas is scaled by DPR but transform handles it)
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1
    const particles = particlesRef.current
    const mouse = mouseRef.current
    const col = resolvedColorRef.current
    const reduced = reducedMotionRef.current

    // Advance phase (scrolls the waveform continuously)
    if (!reduced) {
      phaseRef.current = (phaseRef.current + 0.003 * speed) % 1
    }
    const phase = phaseRef.current

    // Spring constants
    const SPRING_K = 0.16    // stiffness
    const DAMPING = 0.74     // velocity damping (< 1 = energy loss per frame)
    const REPULSION = 0.6    // strength of cursor push

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Recompute base position from the scrolling waveform
      const t = ((i / particles.length) + phase) % 1
      p.baseX = (i / particles.length) * W
      p.baseY = H / 2 - ecgY(t) * (H * 0.32)

      if (!reduced) {
        // Cursor repulsion target
        let targetX = p.baseX
        let targetY = p.baseY

        if (mouse.inside) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < influenceRadius && dist > 0) {
            const strength = (1 - dist / influenceRadius) * REPULSION
            targetX = p.baseX + (dx / dist) * strength * influenceRadius
            targetY = p.baseY + (dy / dist) * strength * influenceRadius
            p.disturbance = Math.min(1, p.disturbance + 0.35)
          }
        }

        // Spring-damper toward target
        p.vx = (p.vx + (targetX - p.x) * SPRING_K) * DAMPING
        p.vy = (p.vy + (targetY - p.y) * SPRING_K) * DAMPING
        p.x += p.vx
        p.y += p.vy

        // Decay disturbance
        p.disturbance *= 0.91
      } else {
        // Reduced motion: snap directly to base
        p.x = p.baseX
        p.y = p.baseY
        p.disturbance = 0
      }

      // Draw dot
      const disturb = p.disturbance
      const r = dotRadius + disturb * dotRadius * 0.9
      const alpha = 0.5 + disturb * 0.5

      ctx.save()
      if (disturb > 0.06) {
        ctx.shadowColor = col
        ctx.shadowBlur = 6 + disturb * 14
      }
      ctx.globalAlpha = alpha
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
    rafRef.current = requestAnimationFrame(animate)
  }, [dotRadius, influenceRadius, speed])

  // Resize handler — updates canvas buffer size and rebuilds particles
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    initParticles(rect.width, rect.height)
  }, [initParticles])

  useEffect(() => {
    // Check reduced-motion preference
    if (typeof window !== "undefined") {
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    }

    resolveColor()
    handleResize()

    // Watch for container size changes
    const ro = new ResizeObserver(() => handleResize())
    const canvas = canvasRef.current
    if (canvas) ro.observe(canvas)

    // Mouse tracking (relative to canvas)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas?.getBoundingClientRect()
      if (!rect) return
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        inside: true,
      }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, inside: false }
    }
    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas?.getBoundingClientRect()
      if (!rect || !e.touches[0]) return
      mouseRef.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
        inside: true,
      }
    }
    const handleTouchEnd = () => {
      mouseRef.current = { x: -9999, y: -9999, inside: false }
    }

    canvas?.addEventListener("mousemove", handleMouseMove)
    canvas?.addEventListener("mouseleave", handleMouseLeave)
    canvas?.addEventListener("touchmove", handleTouchMove, { passive: true })
    canvas?.addEventListener("touchend", handleTouchEnd)

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas?.removeEventListener("mousemove", handleMouseMove)
      canvas?.removeEventListener("mouseleave", handleMouseLeave)
      canvas?.removeEventListener("touchmove", handleTouchMove)
      canvas?.removeEventListener("touchend", handleTouchEnd)
    }
  }, [animate, handleResize, resolveColor])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block" }}
      aria-label="Animated MalPulse ECG heartbeat visualization"
      role="img"
    />
  )
}
