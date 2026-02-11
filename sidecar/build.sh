#!/usr/bin/env bash
# Build the LangExtract sidecar as a standalone binary using PyInstaller.
#
# Usage:
#   cd sidecar && ./build.sh
#
# Output: dist/sidecar/sidecar (binary + libs)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== JubitMind Sidecar Build ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Ensure Python venv exists
# ---------------------------------------------------------------------------

if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# ---------------------------------------------------------------------------
# 2. Install dependencies + PyInstaller
# ---------------------------------------------------------------------------

echo "[*] Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
pip install -q "pyinstaller>=6.0"

# ---------------------------------------------------------------------------
# 3. Build with PyInstaller
# ---------------------------------------------------------------------------

echo "[*] Building sidecar binary..."
pyinstaller sidecar.spec --clean --noconfirm

# ---------------------------------------------------------------------------
# 4. Verify
# ---------------------------------------------------------------------------

BINARY="dist/sidecar/sidecar"
if [ -f "$BINARY" ]; then
    SIZE=$(du -sh "$BINARY" | cut -f1)
    echo ""
    echo "[+] Build successful!"
    echo "    Binary: $BINARY ($SIZE)"
    echo "    Directory: dist/sidecar/"
    echo ""
    echo "    Test: ./dist/sidecar/sidecar"
    echo "    → Should start on http://127.0.0.1:3100"
else
    echo ""
    echo "[X] Build failed — binary not found at $BINARY"
    exit 1
fi
