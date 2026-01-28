const { contextBridge, ipcRenderer } = require("electron")

// Expor APIs seguras para o renderer process
// Nota: Não usamos os/path aqui porque não são necessários no sandbox
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
  /** Iniciar com Windows: obter estado. */
  getOpenAtLogin: () => ipcRenderer.invoke("get-open-at-login"),
  /** Iniciar com Windows: definir (true/false). */
  setOpenAtLogin: (openAtLogin) => ipcRenderer.invoke("set-open-at-login", openAtLogin),
})
