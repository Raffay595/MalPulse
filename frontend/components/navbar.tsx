"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, BarChart2, History, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import GooeyNav from "@/components/GooeyNav"

const routes = [
  { label: "Scanner",      href: "/",         icon: <Upload    className="h-3.5 w-3.5" /> },
  { label: "Dashboard",    href: "/dashboard", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { label: "Scan History", href: "/history",   icon: <History   className="h-3.5 w-3.5" /> },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isRouteActive = (href: string) => {
    if (!pathname) return false
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/analysis")
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const activeIndex = Math.max(
    routes.findIndex((r) => isRouteActive(r.href)),
    0
  )

  return (
    <header className="sticky top-0 z-50 bg-[#0c1324]/80 backdrop-blur-xl border-b border-[#1e293b] shadow-sm overflow-hidden">
      {/* 3-column grid: logo | nav (centered) | spacer */}
      <div className="container grid grid-cols-[auto_1fr_auto] h-16 items-center px-4 md:px-6">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center font-semibold group">
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary-fixed to-secondary">
            MalPulse
          </span>
        </Link>

        {/* ── Desktop GooeyNav — true center ── */}
        <div className="hidden md:flex justify-center items-center">
          <GooeyNav
            items={routes}
            initialActiveIndex={activeIndex}
            particleCount={12}
            particleDistances={[80, 8]}
            particleR={80}
            animationTime={500}
            timeVariance={250}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>

        {/* ── Mobile trigger (right slot) ── */}
        <div className="md:hidden flex justify-end">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-[#0c1324] border-slate-800 text-white">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                <span className="text-lg font-bold">MalPulse</span>
              </div>
              <div className="flex flex-col gap-2">
                {routes.map((route) => {
                  const active = isRouteActive(route.href)
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "text-sm font-medium transition-all flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                        active
                          ? "text-[#4cd7f6] font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                      )}
                    >
                      {route.icon}
                      {route.label}
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Right spacer (desktop) — mirrors logo width for symmetry ── */}
        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </header>
  )
}
