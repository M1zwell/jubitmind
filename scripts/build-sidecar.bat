@echo off
REM Build the LangExtract sidecar binary and prepare it for Electron packaging.
REM
REM Usage:
REM   npm run sidecar:build:win
REM   REM or directly: scripts\build-sidecar.bat

echo === Building LangExtract Sidecar Binary ===
echo.

cd /d "%~dp0\..\sidecar"
call build.bat

echo.
echo === Sidecar Build Complete ===
echo     Ready for electron-builder (extraResources)
