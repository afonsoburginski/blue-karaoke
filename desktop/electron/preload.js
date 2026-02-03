const { contextBridge, ipcRenderer } = require("electron")

// Callbacks para eventos de atualização (um por tipo)
let onUpdateAvailableCb = null
let onUpdateNotAvailableCb = null
let onUpdateDownloadedCb = null
let onUpdateErrorCb = null

ipcRenderer.on("update-available", (_event, data) => { if (onUpdateAvailableCb) onUpdateAvailableCb(data) })
ipcRenderer.on("update-not-available", () => { if (onUpdateNotAvailableCb) onUpdateNotAvailableCb() })
ipcRenderer.on("update-downloaded", (_event, data) => { if (onUpdateDownloadedCb) onUpdateDownloadedCb(data) })
ipcRenderer.on("update-error", (_event, message) => { if (onUpdateErrorCb) onUpdateErrorCb(message) })

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  versions: process.versions,
  isLinux: process.platform === "linux",
  isWindows: process.platform === "win32",
  isMac: process.platform === "darwin",
  /** Fechar o app (Esc para sair). Só disponível no Electron. */
  quit: () => ipcRenderer.invoke("app-quit"),
  /** Minimizar janela (Espaço). Só disponível no Electron. */
  minimize: () => ipcRenderer.invoke("app-minimize"),
  /** Caminho do arquivo de log (pasta do app instalado). */
  getLogPath: () => ipcRenderer.invoke("get-log-path"),
  /** Abre a pasta de logs no explorador de arquivos. */
  openLogFolder: () => ipcRenderer.invoke("open-log-folder"),
  /** Iniciar com Windows: obter estado. */
  getOpenAtLogin: () => ipcRenderer.invoke("get-open-at-login"),
  /** Iniciar com Windows: definir (true/false). */
  setOpenAtLogin: (openAtLogin) => ipcRenderer.invoke("set-open-at-login", openAtLogin),
  // Atualizações (só em app empacotado)
  /** Versão atual do app. */
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  /** Verificar atualizações no GitHub. */
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  /** Registrar callback quando houver atualização disponível. */
  onUpdateAvailable: (cb) => { onUpdateAvailableCb = cb },
  /** Registrar callback quando não houver atualização. */
  onUpdateNotAvailable: (cb) => { onUpdateNotAvailableCb = cb },
  /** Registrar callback quando a atualização foi baixada (pronta para instalar). */
  onUpdateDownloaded: (cb) => { onUpdateDownloadedCb = cb },
  /** Registrar callback em erro de atualização. */
  onUpdateError: (cb) => { onUpdateErrorCb = cb },
  /** Fechar e instalar atualização. */
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
  /** Baixar instalador da release e executar (atualização interna quando electron-updater não acha). */
  downloadAndInstallUpdate: (version) => ipcRenderer.invoke("download-and-install-update", version),
})
