const { contextBridge } = require("electron")

// Expor APIs seguras para o renderer process se necessário
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  versions: process.versions,
})

