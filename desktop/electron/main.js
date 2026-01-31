const { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain } = require("electron")
const path = require("path")
const { spawn } = require("child_process")
const fs = require("fs")
const os = require("os")
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

// Auto-updater só em produção (app empacotado)
let autoUpdater = null
if (app.isPackaged) {
  try {
    autoUpdater = require("electron-updater").autoUpdater
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
  } catch (err) {
    console.warn("electron-updater não disponível:", err.message)
  }
}

// Configurar logs em arquivo
let logPath
try {
  logPath = path.join(app.getPath("userData"), "blue-karaoke.log")
} catch (err) {
  // Se app ainda não estiver pronto, usar temp
  logPath = path.join(os.tmpdir(), "blue-karaoke.log")
}
const logStream = fs.createWriteStream(logPath, { flags: "a" })

// Salvar console original antes de modificar
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Função para log que escreve tanto no console quanto no arquivo
function log(...args) {
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  
  originalConsoleLog(...args)
  try {
    logStream.write(logMessage)
  } catch (err) {
    originalConsoleError("Erro ao escrever log:", err)
  }
}

// Redirecionar console para arquivo também
console.log = (...args) => {
  originalConsoleLog(...args)
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")
  const timestamp = new Date().toISOString()
  try {
    logStream.write(`[${timestamp}] ${message}\n`)
  } catch (err) {
    // Ignorar erro de escrita
  }
}

console.error = (...args) => {
  originalConsoleError(...args)
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")
  const timestamp = new Date().toISOString()
  try {
    logStream.write(`[${timestamp}] ERROR: ${message}\n`)
  } catch (err) {
    // Ignorar erro de escrita
  }
}

console.warn = (...args) => {
  originalConsoleWarn(...args)
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")
  const timestamp = new Date().toISOString()
  try {
    logStream.write(`[${timestamp}] WARN: ${message}\n`)
  } catch (err) {
    // Ignorar erro de escrita
  }
}

// Log inicial
log("=== Blue Karaoke iniciando ===")
log("Caminho do arquivo de log:", logPath)

let mainWindow = null
let nextServer = null
const PORT = 3000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1024,
    minHeight: 768,
    fullscreen: true,
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
    mainWindow.setFullScreen(true)
    mainWindow.show()
  })

  // Em produção o fullscreen às vezes não "gruda" no Windows; forçar de novo após mostrar
  if (app.isPackaged) {
    mainWindow.once("show", () => {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setFullScreen(true)
        }
      }, 100)
    })
  }

  const startUrl = `http://localhost:${PORT}`
  
  // Função para verificar se o servidor está respondendo
  function checkServerReady(retries = 10) {
    return new Promise((resolve, reject) => {
      const http = require("http")
      const check = () => {
        const req = http.get(`http://localhost:${PORT}`, (res) => {
          console.log(`Servidor respondeu com status: ${res.statusCode}`)
          resolve()
        })
        req.on("error", (err) => {
          if (retries > 0) {
            console.log(`Servidor não está pronto ainda, tentando novamente... (${retries} tentativas restantes)`)
            setTimeout(check, 1000)
            retries--
          } else {
            console.error("Servidor não respondeu após várias tentativas")
            reject(new Error("Servidor Next.js não está respondendo"))
          }
        })
        req.setTimeout(2000, () => {
          req.destroy()
          if (retries > 0) {
            setTimeout(check, 1000)
            retries--
          } else {
            reject(new Error("Timeout ao verificar servidor"))
          }
        })
      }
      check()
    })
  }
  
  // Verificar se servidor está pronto antes de carregar
  checkServerReady()
    .then(() => {
      console.log("Servidor está pronto, carregando URL:", startUrl)
      mainWindow.loadURL(startUrl).catch((err) => {
        console.error("Erro ao carregar URL:", err)
        // Tentar novamente após um delay
        setTimeout(() => {
          mainWindow.loadURL(startUrl)
        }, 2000)
      })
    })
    .catch((err) => {
      console.error("Erro ao verificar servidor:", err)
      // Tentar carregar mesmo assim
      mainWindow.loadURL(startUrl).catch((loadErr) => {
        console.error("Erro ao carregar URL:", loadErr)
      })
    })

  mainWindow.on("closed", () => {
    globalShortcut.unregister("Escape")
    mainWindow = null
  })

  mainWindow.once("ready-to-show", () => {
    globalShortcut.register("Escape", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close()
      }
    })
  })

  // Bloquear Num Lock para o teclado sempre estar ativo (evitar desativar por engano)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const isNumLock = (input.key === "NumLock" || input.code === "NumLock") && (input.type === "keyDown" || input.type === "rawKeyDown")
    if (isNumLock) {
      event.preventDefault()
      return
    }
    const isEscape = (input.key === "Escape" || input.keyCode === "Escape") && (input.type === "keyDown" || input.type === "rawKeyDown")
    if (isEscape) {
      event.preventDefault()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close()
      }
    }
  })

  // Log de erros
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Falha ao carregar:", errorCode, errorDescription, validatedURL)
    // Tentar recarregar após delay
    setTimeout(() => {
      console.log("Tentando recarregar...")
      mainWindow.loadURL(startUrl)
    }, 3000)
  })
  
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Página carregada com sucesso!")
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      console.log("Modo desenvolvimento: aguardando servidor Next.js...")
      setTimeout(() => resolve(), 2000)
      return
    }

    // Em produção, executar diretamente do standalone (sem ASAR)
    const appPath = app.getAppPath()
    const standaloneDir = path.join(appPath, ".next", "standalone")
    const serverPath = path.join(standaloneDir, "server.js")

    console.log("App path:", appPath)
    console.log("Standalone dir:", standaloneDir)
    console.log("Server path:", serverPath)

    // Verificar se o servidor existe
    if (!fs.existsSync(serverPath)) {
      console.error("Arquivo server.js não encontrado em:", serverPath)
      reject(new Error(`Servidor não encontrado: ${serverPath}`))
      return
    }

    try {
      console.log("Iniciando servidor Next.js...")
      
      // Executar servidor como processo separado (userData = pasta gravável para SQLite no release)
      const env = {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: "production",
        ELECTRON_RUN_AS_NODE: "1",
        BLUE_KARAOKE_USER_DATA: app.getPath("userData"),
      }
      
      nextServer = spawn(process.execPath, [serverPath], {
        cwd: standaloneDir,
        env: env,
        stdio: ["ignore", "pipe", "pipe"]
      })

      nextServer.stdout.on("data", (data) => {
        console.log("[Next.js]", data.toString().trim())
      })

      nextServer.stderr.on("data", (data) => {
        console.error("[Next.js ERROR]", data.toString().trim())
      })

      nextServer.on("error", (error) => {
        console.error("Erro ao iniciar servidor:", error)
        reject(error)
      })

      nextServer.on("exit", (code, signal) => {
        console.log(`Servidor encerrado. Código: ${code}, Signal: ${signal}`)
      })

      // Verificar se servidor está respondendo
      const http = require("http")
      let attempts = 0
      const maxAttempts = 60
      let serverStarted = false

      const checkServer = () => {
        attempts++
        const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
          console.log(`✅ Servidor respondendo! Status: ${res.statusCode}`)
          serverStarted = true
          resolve()
        })
        
        req.on("error", (err) => {
          if (attempts < maxAttempts) {
            if (attempts % 5 === 0) {
              console.log(`⏳ Aguardando servidor (${attempts}/${maxAttempts})... Erro: ${err.code}`)
            }
            setTimeout(checkServer, 500)
          } else {
            console.error("❌ Servidor não respondeu após", maxAttempts, "tentativas")
            if (nextServer && !nextServer.killed) {
              console.log("⚠️ Processo ainda está rodando, continuando...")
              resolve()
            } else {
              reject(new Error("Servidor Next.js não iniciou"))
            }
          }
        })
        
        req.setTimeout(1000, () => {
          req.destroy()
          if (attempts < maxAttempts && !serverStarted) {
            setTimeout(checkServer, 500)
          }
        })
      }

      setTimeout(checkServer, 3000)
      
    } catch (error) {
      console.error("Erro ao iniciar servidor:", error)
      reject(error)
    }
  })
}

// Aguardar Electron estar pronto
app.whenReady().then(async () => {
  // Atualizar logPath para o caminho correto do userData
  try {
    const correctLogPath = path.join(app.getPath("userData"), "blue-karaoke.log")
    if (correctLogPath !== logPath) {
      log("Caminho do log atualizado para:", correctLogPath)
      logPath = correctLogPath
    }
  } catch (err) {
    log("Não foi possível atualizar caminho do log:", err.message)
  }
  
  log("=== App pronto ===")
  log("Caminho do arquivo de log:", logPath)
  
  // Remover menu bar
  Menu.setApplicationMenu(null)

  // Handler para Esc sair (registrado antes de criar janela para evitar "No handler registered")
  ipcMain.handle("app-quit", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  ipcMain.handle("app-minimize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle("get-open-at-login", () => {
    const settings = app.getLoginItemSettings()
    return { openAtLogin: settings.openAtLogin }
  })

  ipcMain.handle("set-open-at-login", (_event, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin, path: process.execPath })
    return {}
  })

  // Atualizações (versão e verificar/instalar)
  ipcMain.handle("get-app-version", () => app.getVersion())
  ipcMain.handle("check-for-updates", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return {}
    if (!autoUpdater) {
      mainWindow.webContents.send("update-not-available")
      return {}
    }
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Erro ao verificar atualizações:", err)
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("update-error", err.message)
    })
    return {}
  })
  ipcMain.handle("quit-and-install", () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall(false, true)
    }
    return {}
  })

  try {
    await startNextServer()
    createWindow()

    // Registrar eventos do auto-updater após a janela existir
    if (autoUpdater && mainWindow && !mainWindow.isDestroyed()) {
      const send = (channel, ...args) => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
      }
      autoUpdater.on("update-available", (info) => send("update-available", { version: info.version }))
      autoUpdater.on("update-not-available", () => send("update-not-available"))
      autoUpdater.on("update-downloaded", (info) => send("update-downloaded", { version: info.version }))
      autoUpdater.on("error", (err) => send("update-error", err.message))
    }
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error)
    
    // Mostrar diálogo de erro para o usuário
    log("ERRO CRÍTICO:", error.message, error.stack)
    dialog.showErrorBox(
      "Erro ao Iniciar Aplicação",
      `Não foi possível iniciar o Blue Karaoke.\n\nErro: ${error.message}\n\nLogs salvos em:\n${logPath}\n\nPor favor, verifique o arquivo de log para mais detalhes.`
    )
    
    // Aguardar um pouco antes de fechar para o usuário ver o erro
    setTimeout(() => {
      app.quit()
    }, 5000)
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
  log("ERRO NÃO CAPTURADO:", error.message, error.stack)
  dialog.showErrorBox(
    "Erro Crítico",
    `Ocorreu um erro inesperado:\n\n${error.message}\n\nLogs salvos em:\n${logPath}\n\nA aplicação será fechada.`
  )
  app.quit()
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise rejeitada não tratada:", reason)
  if (reason instanceof Error) {
    dialog.showErrorBox(
      "Erro de Promise",
      `Uma operação falhou:\n\n${reason.message}`
    )
  }
})

