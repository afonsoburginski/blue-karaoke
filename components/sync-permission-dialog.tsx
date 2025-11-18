"use client"

import { useEffect, useState, useCallback } from "react"
import { Music, X, Download } from "lucide-react"

interface SyncPermissionDialogProps {
  availableCount: number
  onAllow: () => void
  onDeny: () => void
}

export function SyncPermissionDialog({ availableCount, onAllow, onDeny }: SyncPermissionDialogProps) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onAllow()
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault()
        onDeny()
      }
    },
    [onAllow, onDeny]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [handleKeyPress])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-400/30 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-cyan-400/20 rounded-lg">
            <Music className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Novas Músicas Disponíveis</h2>
            <p className="text-sm text-gray-400 mt-1">Servidor Blue Karaoke</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Há <span className="font-bold text-cyan-400">{availableCount}</span>{" "}
            {availableCount === 1 ? "música nova" : "músicas novas"} disponíveis para download.
          </p>
          <p className="text-sm text-gray-400">
            Deseja baixar até 5 músicas agora?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAllow}
            className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <Download className="w-5 h-5" />
            Permitir (Enter)
          </button>
          <button
            onClick={onDeny}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <X className="w-5 h-5" />
            Negar (-)
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Pressione <kbd className="px-2 py-1 bg-slate-700 rounded">Enter</kbd> para permitir ou{" "}
          <kbd className="px-2 py-1 bg-slate-700 rounded">-</kbd> para negar
        </p>
      </div>
    </div>
  )
}

