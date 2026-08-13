"use client"

import React, { useState, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import FileUploadBox from "@/components/file-upload-box"
import Dock from "@/components/Dock"
import SpecularButton from "@/components/SpecularButton"

import { FileType } from "@/lib/types"
import {
  Radar,
  ArrowRight,
  Cpu,
  FileText,
  BookOpen,
  FileCode2,
  Smartphone,
} from "lucide-react"

// Lazy-load the WebGL component — defers GPU shader compilation
// until after the page has painted, preventing navigation stutter.
const FaultyTerminal = dynamic(
  () => import("@/components/FaultyTerminal"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#020617] animate-pulse opacity-30" />
    ),
  }
)

const FILE_TYPES: { type: FileType; label: string; icon: React.ReactNode }[] = [
  { type: FileType.PE,     label: "PE Executables", icon: <Cpu        size={22} strokeWidth={1.5} /> },
  { type: FileType.OFFICE, label: "Office Docs",    icon: <FileText   size={22} strokeWidth={1.5} /> },
  { type: FileType.PDF,    label: "PDF",             icon: <BookOpen   size={22} strokeWidth={1.5} /> },
  { type: FileType.SCRIPT, label: "Script",          icon: <FileCode2  size={22} strokeWidth={1.5} /> },
  { type: FileType.APK,    label: "APK",             icon: <Smartphone size={22} strokeWidth={1.5} /> },
]

export default function Home() {
  const [selectedFileType, setSelectedFileType] = useState<FileType>(FileType.PE)
  const scannerRef = useRef<HTMLDivElement>(null)

  const activeIndex = FILE_TYPES.findIndex((f) => f.type === selectedFileType)

  const dockItems = FILE_TYPES.map((f) => ({
    icon: f.icon,
    label: f.label,
    onClick: () => setSelectedFileType(f.type),
  }))

  const handleScrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-[#dce1fb]">
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-8 relative">
        
        {/* ── 1. HERO SECTION (FaultyTerminal WebGL Shader Matrix) ── */}
        <section className="relative w-full h-[340px] md:h-[420px] rounded-xl overflow-hidden glass-panel flex flex-col justify-center items-center text-center px-6 border border-[#1e293b] shadow-2xl">
          {/* FaultyTerminal Background Component */}
          <div className="absolute inset-0 w-full h-full opacity-65 pointer-events-auto">
            <FaultyTerminal
              scale={1.5}
              gridMul={[2, 1]}
              digitSize={1.2}
              timeScale={1}
              pause={false}
              scanlineIntensity={0.8}
              glitchAmount={1}
              flickerAmount={1}
              noiseAmp={0.8}
              chromaticAberration={0}
              dither={0.2}
              curvature={0.15}
              tint="#ef4444"
              mouseReact={true}
              mouseStrength={0.5}
              pageLoadAnimation={true}
              brightness={0.95}
            />
          </div>

          {/* Vignette Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50 pointer-events-none z-10" />

          {/* Hero Copy Content */}
          <div className="relative z-20 flex flex-col items-center gap-3 max-w-3xl mx-auto pointer-events-none select-none">
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white neon-text-cyan drop-shadow-lg">
              MalPulse — Advanced AI Malware Detection
            </h1>
            
            <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
              Instant static &amp; dynamic behavioral analysis powered by machine learning models and YARA signatures.
            </p>

            <div className="mt-4 flex gap-4 pointer-events-auto">
              <SpecularButton
                onClick={handleScrollToScanner}
                size="md"
                tint="#ef4444"
                tintOpacity={0.2}
                lineColor="#ef4444"
                baseColor="#ef4444"
                radius={10}
              >
                Initiate Scan
                <ArrowRight className="h-4 w-4 ml-1" />
              </SpecularButton>
              
              <Link href="/dashboard">
                <SpecularButton
                  size="md"
                  tint="#4cd7f6"
                  tintOpacity={0.1}
                  lineColor="#4cd7f6"
                  baseColor="#4cd7f6"
                  textColor="#4cd7f6"
                  radius={10}
                >
                  View Reports
                </SpecularButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. THREAT SCANNER WORKSPACE ── */}
        <div className="w-full max-w-5xl mx-auto" ref={scannerRef}>
          <div className="glass-panel rounded-xl p-6 md:p-8 flex flex-col gap-6 relative group shadow-xl border border-[#1e293b]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b] pb-4 gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Radar className="h-6 w-6 text-secondary animate-spin-slow" />
                Threat Scanner
              </h2>

              {/* Dock File Type Selector */}
              <div className="flex items-end justify-center">
                <Dock
                  items={dockItems}
                  activeIndex={activeIndex}
                  panelHeight={58}
                  baseItemSize={44}
                  magnification={62}
                  distance={140}
                />
              </div>
            </div>

            {/* Upload Dropzone Container */}
            <div className="pt-2">
              <FileUploadBox
                type={selectedFileType}
                title={`${selectedFileType.toUpperCase()} Analyzer`}
                description="Drop your file here or click to scan instantly"
                active={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
