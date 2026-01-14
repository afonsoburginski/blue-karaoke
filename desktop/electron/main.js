
const { app, BrowserWindow, Menu } = require("electron")
const path = require("path")
const { spawn } = require("child_process")
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

let mainWindow = null
let nextServer = null
const PORT = 3000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
    },
    icon: path.join(__dirname, "../public/icon.png"),
    show: false,
    titleBarStyle: "default",
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    mainWindow.maximize()
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  const startUrl = `http://localhost:${PORT}`
  
  // Tentar carregar a URL
  mainWindow.loadURL(startUrl).catch((err) => {
    console.error("Erro ao carregar URL:", err)
    // Tentar novamente após um delay
    setTimeout(() => {
      mainWindow.loadURL(startUrl)
    }, 2000)
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Log de erros
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Falha ao carregar:", errorCode, errorDescription)
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // Em desenvolvimento, o servidor Next.js já está rodando
      console.log("Modo desenvolvimento: aguardando servidor Next.js...")
      // Aguardar um pouco para garantir que o servidor está pronto
      setTimeout(() => {
        resolve()
      }, 2000)
      return
    }

    // Em produção, iniciar o servidor Next.js standalone
    const appPath = app.getAppPath()
    const nextPath = path.join(appPath, ".next", "standalone")
    const serverPath = path.join(nextPath, "server.js")

    console.log("Iniciando servidor Next.js standalone:", serverPath)

    if (!require("fs").existsSync(serverPath)) {
      reject(new Error(`Servidor Next.js não encontrado em: ${serverPath}`))
      return
    }

    nextServer = spawn("node", [serverPath], {
      cwd: nextPath,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: "production",
      },
      stdio: "inherit",
    })

    nextServer.on("error", (error) => {
      console.error("Erro ao iniciar servidor Next.js:", error)
      reject(error)
    })

    nextServer.on("exit", (code, signal) => {
      console.log(`Servidor Next.js encerrado. Código: ${code}, Signal: ${signal}`)
    })

    // Aguardar servidor estar pronto (dar tempo para iniciar)
    setTimeout(() => {
      resolve()
    }, 4000)
  })
}

// Aguardar Electron estar pronto
app.whenReady().then(async () => {
  // Remover menu bar
  Menu.setApplicationMenu(null)
  
  try {
    await startNextServer()
    createWindow()
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error)
    app.quit()
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill("SIGTERM")
  }
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill("SIGTERM")
  }
})

// Tratar erros não capturados
process.on("uncaughtException", (error) => {
  console.error("Erro não capturado:", error)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise rejeitada não tratada:", reason)
})

