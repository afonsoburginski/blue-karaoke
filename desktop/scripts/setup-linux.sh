#!/bin/bash

# Setup script para Blue Karaoke no Linux
# Execute com: chmod +x scripts/setup-linux.sh && ./scripts/setup-linux.sh

echo "🎤 Blue Karaoke - Setup Linux"
echo "==============================="

# Detectar distribuição
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    echo "Distribuição detectada: $NAME"
else
    echo "Não foi possível detectar a distribuição"
    DISTRO="unknown"
fi

# Instalar dependências do sistema
echo ""
echo "📦 Instalando dependências do sistema..."

case $DISTRO in
    ubuntu|debian|linuxmint|pop)
        sudo apt update
        sudo apt install -y build-essential python3 libsqlite3-dev \
            libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 \
            xdg-utils libatspi2.0-0 libuuid1 libasound2
        ;;
    fedora|rhel|centos)
        sudo dnf install -y gcc gcc-c++ make python3 sqlite-devel \
            gtk3 libnotify nss libXScrnSaver libXtst \
            xdg-utils at-spi2-core libuuid alsa-lib
        ;;
    arch|manjaro)
        sudo pacman -S --noconfirm base-devel python sqlite \
            gtk3 libnotify nss libxss libxtst \
            xdg-utils at-spi2-atk util-linux alsa-lib
        ;;
    opensuse*)
        sudo zypper install -y gcc gcc-c++ make python3 sqlite3-devel \
            gtk3 libnotify nss libXss libXtst \
            xdg-utils at-spi2-core libuuid1 alsa-lib
        ;;
    *)
        echo "⚠️  Distribuição não reconhecida. Instale manualmente:"
        echo "   - build-essential (gcc, g++, make)"
        echo "   - python3"
        echo "   - libsqlite3-dev"
        echo "   - GTK3 e dependências do Electron"
        ;;
esac

# Verificar Node.js/Bun
echo ""
echo "🔍 Verificando Node.js/Bun..."

if command -v bun &> /dev/null; then
    echo "✓ Bun instalado: $(bun --version)"
elif command -v node &> /dev/null; then
    echo "✓ Node.js instalado: $(node --version)"
else
    echo "❌ Node.js ou Bun não encontrado!"
    echo "   Instale Bun: curl -fsSL https://bun.sh/install | bash"
    echo "   Ou Node.js: https://nodejs.org/"
    exit 1
fi

# Instalar dependências do projeto
echo ""
echo "📦 Instalando dependências do projeto..."
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

# Rebuild do better-sqlite3
echo ""
echo "🔧 Reconstruindo better-sqlite3 para seu sistema..."
if command -v bun &> /dev/null; then
    bun run rebuild:sqlite
else
    npm run rebuild:sqlite
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Para executar em modo desenvolvimento:"
echo "   bun run electron:dev"
echo ""
echo "Para criar o pacote para Linux:"
echo "   bun run electron:build:linux"
echo ""
