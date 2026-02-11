#!/usr/bin/env bash
#
# JubitMind — One-click installer for macOS and Linux
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/M1zwell/jubitmind/main/install.sh | bash
#   # or
#   git clone https://github.com/M1zwell/jubitmind.git && cd jubitmind && ./install.sh
#
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[32m'
CYAN='\033[36m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

info()  { echo -e "${CYAN}▸${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}⚠${RESET} $*"; }
fail()  { echo -e "${RED}✗${RESET} $*"; exit 1; }

echo -e "\n${BOLD}╔═══════════════════════════════════╗${RESET}"
echo -e "${BOLD}║  JubitMind Installer v1.2.0       ║${RESET}"
echo -e "${BOLD}║  AI Interaction Audit Platform    ║${RESET}"
echo -e "${BOLD}╚═══════════════════════════════════╝${RESET}\n"

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------

info "Checking prerequisites..."

# Node.js
if ! command -v node &>/dev/null; then
  fail "Node.js is required. Install from https://nodejs.org/ (v18+)"
fi
NODE_VER=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ required (found $NODE_VER)"
fi
ok "Node.js $NODE_VER"

# npm
if ! command -v npm &>/dev/null; then
  fail "npm is required"
fi
ok "npm $(npm -v)"

# Python 3.10+
PYTHON=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    PY_VER=$("$cmd" --version 2>&1 | sed 's/Python //')
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  warn "Python 3.10+ not found — LangExtract sidecar will not be available"
  warn "Install from https://www.python.org/downloads/ to enable entity extraction"
  SKIP_SIDECAR=true
else
  ok "Python $PY_VER ($PYTHON)"
  SKIP_SIDECAR=false
fi

# Git (optional)
if command -v git &>/dev/null; then
  ok "git $(git --version | sed 's/git version //')"
else
  warn "git not found — some features may be limited"
fi

echo ""

# ---------------------------------------------------------------------------
# 2. Install Node.js dependencies
# ---------------------------------------------------------------------------

info "Installing Node.js dependencies..."
npm install --loglevel=error
ok "Node.js dependencies installed"

# ---------------------------------------------------------------------------
# 3. Build the project
# ---------------------------------------------------------------------------

info "Building JubitMind..."
npm run build 2>&1 | tail -3
ok "Build complete"

# ---------------------------------------------------------------------------
# 4. Install Python sidecar (LangExtract)
# ---------------------------------------------------------------------------

if [ "$SKIP_SIDECAR" = false ]; then
  echo ""
  info "Setting up LangExtract sidecar..."

  # Create venv if it doesn't exist
  VENV_DIR="sidecar/.venv"
  if [ ! -d "$VENV_DIR" ]; then
    info "Creating Python virtual environment..."
    "$PYTHON" -m venv "$VENV_DIR"
  fi

  # Activate and install
  source "$VENV_DIR/bin/activate"
  pip install -q --upgrade pip
  pip install -q -r sidecar/requirements.txt
  deactivate

  ok "LangExtract sidecar installed (venv: $VENV_DIR)"
fi

# ---------------------------------------------------------------------------
# 5. Create launcher scripts
# ---------------------------------------------------------------------------

echo ""
info "Creating launcher scripts..."

# Main launcher
cat > start.sh << 'LAUNCHER'
#!/usr/bin/env bash
# JubitMind — Start all services
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

# Start sidecar if venv exists
if [ -d "$DIR/sidecar/.venv" ]; then
  echo "Starting LangExtract sidecar on port 3100..."
  source "$DIR/sidecar/.venv/bin/activate"
  python "$DIR/sidecar/main.py" &
  SIDECAR_PID=$!
  deactivate
  trap "kill $SIDECAR_PID 2>/dev/null" EXIT
fi

# Start JubitMind server
echo "Starting JubitMind on http://localhost:3000..."
cd "$DIR"
NODE_ENV=production node dist/server/index.js
LAUNCHER
chmod +x start.sh

# Dev launcher
cat > start-dev.sh << 'DEVLAUNCHER'
#!/usr/bin/env bash
# JubitMind — Start in development mode
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

# Start sidecar
if [ -d "$DIR/sidecar/.venv" ]; then
  echo "Starting LangExtract sidecar..."
  source "$DIR/sidecar/.venv/bin/activate"
  python "$DIR/sidecar/main.py" &
  SIDECAR_PID=$!
  deactivate
  trap "kill $SIDECAR_PID 2>/dev/null" EXIT
fi

# Start dev servers
cd "$DIR"
npm run dev
DEVLAUNCHER
chmod +x start-dev.sh

ok "Created start.sh and start-dev.sh"

# ---------------------------------------------------------------------------
# 6. Done
# ---------------------------------------------------------------------------

echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  JubitMind installed successfully!    ${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Quick start:${RESET}"
echo -e "    ${CYAN}./start.sh${RESET}          Production mode (http://localhost:3000)"
echo -e "    ${CYAN}./start-dev.sh${RESET}      Development mode (hot reload)"
echo ""
echo -e "  ${BOLD}Electron app:${RESET}"
echo -e "    ${CYAN}npm run electron:dev${RESET}        Run desktop app"
echo -e "    ${CYAN}npm run electron:build:mac${RESET}  Build macOS DMG"
echo -e "    ${CYAN}npm run electron:build:win${RESET}  Build Windows installer"
echo ""
echo -e "  ${BOLD}LangExtract sidecar:${RESET}"
if [ "$SKIP_SIDECAR" = false ]; then
  echo -e "    ${GREEN}✓ Installed${RESET} — starts automatically with ./start.sh"
  echo -e "    Configure API key in Settings > Extractions"
else
  echo -e "    ${YELLOW}⚠ Skipped${RESET} — install Python 3.10+ and run:"
  echo -e "    ${CYAN}python3 -m venv sidecar/.venv && source sidecar/.venv/bin/activate${RESET}"
  echo -e "    ${CYAN}pip install -r sidecar/requirements.txt${RESET}"
fi
echo ""
