/**
 * Loader component para primeira carga do app
 * Usado apenas em casos específicos (entrar no site, não durante navegação)
 */

"use client"

import Image from "next/image"

export function AppLoader() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center">
      <div 
        className="absolute inset-0 blur-sm scale-105"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-40 h-40">
          <Image
            src="/logo-white.png"
            alt="Blue Karaokê"
            fill
            className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-pulse"
            priority
          />
        </div>
        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </main>
  )
}
