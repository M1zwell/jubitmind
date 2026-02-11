#!/usr/bin/env bash
# Build the LangExtract sidecar binary and prepare it for Electron packaging.
#
# Usage:
#   npm run sidecar:build
#   # or directly: ./scripts/build-sidecar.sh
#
# This script:
# 1. Runs PyInstaller in sidecar/ to produce dist/sidecar/
# 2. Verifies the binary works
# 3. Reports size for packaging awareness

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SIDECAR_DIR="$PROJECT_DIR/sidecar"

echo "=== Building LangExtract Sidecar Binary ==="
echo "    Project: $PROJECT_DIR"
echo "    Sidecar: $SIDECAR_DIR"
echo ""

# Run the sidecar's own build script
cd "$SIDECAR_DIR"
bash build.sh

# Report total size of the dist directory
DIST_DIR="$SIDECAR_DIR/dist/sidecar"
if [ -d "$DIST_DIR" ]; then
    TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
    FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')
    echo ""
    echo "=== Sidecar Build Complete ==="
    echo "    Directory: $DIST_DIR"
    echo "    Total size: $TOTAL_SIZE"
    echo "    Files: $FILE_COUNT"
    echo ""
    echo "    Ready for electron-builder (extraResources)"
fi
