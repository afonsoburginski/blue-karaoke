const { contextBridge } = require("electron")

// Expor APIs seguras para o renderer process
// Nota: Não usamos os/path aqui porque não são necessários no sandbox
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  versions: process.versions,
  isLinux: process.platform === "linux",
  isWindows: process.platform === "win32",
  isMac: process.platform === "darwin",
})
