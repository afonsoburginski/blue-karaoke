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
    target: ["AppImage", "deb", "rpm"],
    icon: "public/icon.png",
    category: "AudioVideo",
    desktop: {
      Name: "Blue Karaoke",
      Comment: "Sistema de Karaokê",
      Categories: "AudioVideo;Audio;Music;",
      StartupWMClass: "blue-karaoke",
    },
  },
  deb: {
    depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils", "libatspi2.0-0", "libuuid1"],
    packageCategory: "sound",
  },
  rpm: {
    depends: ["gtk3", "libnotify", "nss", "libXScrnSaver", "libXtst", "xdg-utils", "at-spi2-core", "libuuid"],
  },
}

