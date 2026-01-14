const { contextBridge, ipcRenderer } = require("electron")
const os = require("os")
const path = require("path")

// Obter diretório de dados do usuário
const getUserDataPath = () => {
  const platform = process.platform
  const homeDir = os.homedir()
  const appName = "blue-karaoke"
  
  switch (platform) {
    case "win32":
      return path.join(process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"), appName)
    case "darwin":
      return path.join(homeDir, "Library", "Application Support", appName)
    case "linux":
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config"), appName)
  }
}

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  versions: process.versions,
  isLinux: process.platform === "linux",
  isWindows: process.platform === "win32",
  isMac: process.platform === "darwin",
  userDataPath: getUserDataPath(),
})

