module.exports = {
  appId: "com.bluekaraoke.app",
  productName: "Blue Karaoke",
  directories: {
    output: "dist",
    buildResources: "build",
  },
  files: [
    "electron/**/*",
    ".next/standalone/**/*",
    ".next/static/**/*",
    "public/**/*",
    "package.json",
    "node_modules/better-sqlite3/**/*",
  ],
  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
    {
      from: ".next/static",
      to: ".next/static",
      filter: ["**/*"],
    },
  ],
  // Configuração para melhor-sqlite3
  rebuild: false,
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    icon: "public/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  mac: {
    target: ["dmg"],
    icon: "public/icon.icns",
    category: "public.app-category.music",
  },
  linux: {
    target: ["AppImage"],
    icon: "public/icon.png",
    category: "AudioVideo",
  },
}

