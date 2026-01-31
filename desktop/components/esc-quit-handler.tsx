"use client"

import { useEffect } from "react"

/**
 * No Electron: Esc fecha o app.
 * Só atua se window.electron.quit existir (ambiente Electron).
 */
export function EscQuitHandler() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.closest("input") || target.closest("textarea") || target.closest("[contenteditable]")
      if (isInput) return

      if (e.key === "Escape" && typeof window.electron?.quit === "function") {
        e.preventDefault()
        window.electron.quit()
      }
      if (e.key === " " && typeof window.electron?.minimize === "function") {
        e.preventDefault()
        window.electron.minimize()
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [])
  return null
}
