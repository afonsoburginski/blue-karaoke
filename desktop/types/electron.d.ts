/** API do Electron exposta via preload (window.electron). */
declare global {
  interface Window {
    electron?: {
      quit?: () => void
      minimize?: () => void
      getOpenAtLogin?: () => Promise<{ openAtLogin: boolean }>
      setOpenAtLogin?: (openAtLogin: boolean) => Promise<void>
      getAppVersion?: () => Promise<string>
      checkForUpdates?: () => Promise<void>
      onUpdateAvailable?: (cb: (data: { version?: string }) => void) => void
      onUpdateNotAvailable?: (cb: () => void) => void
      onUpdateDownloaded?: (cb: (data: { version?: string }) => void) => void
      onUpdateError?: (cb: (message: string) => void) => void
      quitAndInstall?: () => Promise<void>
    }
  }
}

export {}
