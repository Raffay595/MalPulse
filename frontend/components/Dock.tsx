"use client"

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type SpringOptions,
} from "motion/react"
import {
  Children,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from "react"
import "./Dock.css"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DockItemData {
  icon: ReactNode
  label: string
  onClick: () => void
  className?: string
}

interface DockItemProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  mouseX: ReturnType<typeof useMotionValue<number>>
  spring: SpringOptions
  distance: number
  magnification: number
  baseItemSize: number
  label: string
  isActive?: boolean
}

interface DockLabelProps {
  children: ReactNode
  className?: string
  isHovered?: ReturnType<typeof useMotionValue<number>>
}

interface DockIconProps {
  children: ReactNode
  className?: string
  isHovered?: ReturnType<typeof useMotionValue<number>>
}

interface DockProps {
  items: DockItemData[]
  className?: string
  distance?: number
  panelHeight?: number
  baseItemSize?: number
  dockHeight?: number
  magnification?: number
  spring?: SpringOptions
  activeIndex?: number
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  isActive = false,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const centerRef = useRef<number>(0)
  const isHovered = useMotionValue(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const updateCenter = () => {
      const rect = el.getBoundingClientRect()
      centerRef.current = rect.left + rect.width / 2
    }
    updateCenter()
    const ro = new ResizeObserver(updateCenter)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const mouseDistance = useTransform(mouseX, (val: number) => {
    if (!centerRef.current) return distance + 1
    return val - centerRef.current
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  )
  const size = useSpring(targetSize, spring)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${isActive ? "dock-item--active" : ""} ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-label={label}
      aria-pressed={isActive}
      onKeyDown={handleKeyDown}
    >
      {Children.map(children, (child) =>
        cloneElement(child as ReactElement<{ isHovered: typeof isHovered }>, { isHovered })
      )}
    </motion.div>
  )
}

function DockLabel({ children, className = "", isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isHovered) return
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1)
    })
    return () => unsubscribe()
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: "-50%" } as any}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>

  )
}

function DockIcon({ children, className = "" }: DockIconProps) {
  return <div className={`dock-icon ${className}`}>{children}</div>
}

// ─── Main Dock ────────────────────────────────────────────────────────────────
export default function Dock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 170, damping: 15 },
  magnification = 64,
  distance = 150,
  panelHeight = 56,
  dockHeight = 80,
  baseItemSize = 44,
  activeIndex,
}: DockProps) {
  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + 20),
    [magnification, dockHeight]
  )
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)

  return (
    <motion.div style={{ height, scrollbarWidth: "none" } as any} className="dock-outer">
      <motion.div
        onMouseMove={(e) => {
          isHovered.set(1)
          mouseX.set(e.clientX)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mouseX.set(Infinity)
        }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="File type selector"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            isActive={activeIndex === index}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  )
}

