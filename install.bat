@echo off
REM JubitMind — One-click installer for Windows
REM Usage: git clone https://github.com/M1zwell/jubitmind.git && cd jubitmind && install.bat

echo.
echo ╔═══════════════════════════════════╗
echo ║  JubitMind Installer v1.1.0       ║
echo ║  AI Interaction Audit Platform    ║
echo ╚═══════════════════════════════════╝
echo.

REM ---------------------------------------------------------------------------
REM 1. Check prerequisites
REM ---------------------------------------------------------------------------

echo [*] Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js is required. Install from https://nodejs.org/ ^(v18+^)
    exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_VER=%%a
echo [+] Node.js found

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] npm is required
    exit /b 1
)
echo [+] npm found

REM Check Python
set PYTHON=
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
    echo [+] Python %PY_VER% found
    set PYTHON=python
) else (
    where python3 >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=2" %%v in ('python3 --version 2^>^&1') do set PY_VER=%%v
        echo [+] Python %PY_VER% found
        set PYTHON=python3
    ) else (
        echo [!] Python 3.10+ not found — LangExtract sidecar will not be available
        echo [!] Install from https://www.python.org/downloads/
        set SKIP_SIDECAR=1
    )
)

echo.

REM ---------------------------------------------------------------------------
REM 2. Install Node.js dependencies
REM ---------------------------------------------------------------------------

echo [*] Installing Node.js dependencies...
call npm install --loglevel=error
if %errorlevel% neq 0 (
    echo [X] npm install failed
    exit /b 1
)
echo [+] Node.js dependencies installed

REM ---------------------------------------------------------------------------
REM 3. Build the project
REM ---------------------------------------------------------------------------

echo [*] Building JubitMind...
call npm run build
if %errorlevel% neq 0 (
    echo [X] Build failed
    exit /b 1
)
echo [+] Build complete

REM ---------------------------------------------------------------------------
REM 4. Install Python sidecar
REM ---------------------------------------------------------------------------

if not defined SKIP_SIDECAR (
    echo.
    echo [*] Setting up LangExtract sidecar...

    if not exist "sidecar\.venv" (
        echo [*] Creating Python virtual environment...
        %PYTHON% -m venv sidecar\.venv
    )

    echo [*] Installing LangExtract...
    call sidecar\.venv\Scripts\pip install -q --upgrade pip
    call sidecar\.venv\Scripts\pip install -q -r sidecar\requirements.txt
    echo [+] LangExtract sidecar installed
)

REM ---------------------------------------------------------------------------
REM 5. Create launcher scripts
REM ---------------------------------------------------------------------------

echo.
echo [*] Creating launcher scripts...

REM start.bat
(
    echo @echo off
    echo REM JubitMind — Start all services
    echo.
    echo if exist "sidecar\.venv\Scripts\python.exe" ^(
    echo     echo Starting LangExtract sidecar on port 3100...
    echo     start /b sidecar\.venv\Scripts\python sidecar\main.py
    echo ^)
    echo.
    echo echo Starting JubitMind on http://localhost:3000...
    echo set NODE_ENV=production
    echo node dist\server\index.js
) > start.bat

REM start-dev.bat
(
    echo @echo off
    echo REM JubitMind — Start in development mode
    echo.
    echo if exist "sidecar\.venv\Scripts\python.exe" ^(
    echo     echo Starting LangExtract sidecar...
    echo     start /b sidecar\.venv\Scripts\python sidecar\main.py
    echo ^)
    echo.
    echo npm run dev
) > start-dev.bat

echo [+] Created start.bat and start-dev.bat

REM ---------------------------------------------------------------------------
REM 6. Done
REM ---------------------------------------------------------------------------

echo.
echo ═══════════════════════════════════════
echo   JubitMind installed successfully!
echo ═══════════════════════════════════════
echo.
echo   Quick start:
echo     start.bat           Production mode (http://localhost:3000)
echo     start-dev.bat       Development mode (hot reload)
echo.
echo   Electron app:
echo     npm run electron:dev        Run desktop app
echo     npm run electron:build:win  Build Windows installer
echo.
echo   LangExtract: Configure API key in Settings ^> Extractions
echo.

pause
