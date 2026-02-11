@echo off
REM Build the LangExtract sidecar as a standalone binary using PyInstaller.
REM
REM Usage:
REM   cd sidecar && build.bat
REM
REM Output: dist\sidecar\sidecar.exe (binary + libs)

echo === JubitMind Sidecar Build ===
echo.

REM ---------------------------------------------------------------------------
REM 1. Ensure Python venv exists
REM ---------------------------------------------------------------------------

if not exist ".venv" (
    echo [*] Creating Python virtual environment...
    python -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat

REM ---------------------------------------------------------------------------
REM 2. Install dependencies + PyInstaller
REM ---------------------------------------------------------------------------

echo [*] Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt
pip install -q "pyinstaller>=6.0"

REM ---------------------------------------------------------------------------
REM 3. Build with PyInstaller
REM ---------------------------------------------------------------------------

echo [*] Building sidecar binary...
pyinstaller sidecar.spec --clean --noconfirm

REM ---------------------------------------------------------------------------
REM 4. Verify
REM ---------------------------------------------------------------------------

if exist "dist\sidecar\sidecar.exe" (
    echo.
    echo [+] Build successful!
    echo     Binary: dist\sidecar\sidecar.exe
    echo     Directory: dist\sidecar\
    echo.
    echo     Test: dist\sidecar\sidecar.exe
    echo     -^> Should start on http://127.0.0.1:3100
) else (
    echo.
    echo [X] Build failed — binary not found
    exit /b 1
)
