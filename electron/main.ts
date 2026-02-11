import { app, BrowserWindow, shell, Menu, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import net from 'net';
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let sidecarProcess: ChildProcess | null = null;
let serverPort = 3000;

// ---------------------------------------------------------------------------
// Persistent store (window state, first-run flag)
// ---------------------------------------------------------------------------

interface StoreSchema {
  windowBounds: { x?: number; y?: number; width: number; height: number; isMaximized: boolean };
  firstRunComplete: boolean;
}

const store = new Store<StoreSchema>({
  name: 'jubitmind-settings',
  defaults: {
    windowBounds: { width: 1400, height: 900, isMaximized: false },
    firstRunComplete: false,
  },
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Find a free port starting from the given port. */
async function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findFreePort(start + 1)));
  });
}

/** Wait for the Express server to be ready. */
async function waitForServer(port: number, timeout = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/system/health`);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Wait for the sidecar to be ready. */
async function waitForSidecar(timeout = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch('http://127.0.0.1:3100/health');
      if (response.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Start the LangExtract sidecar — tries bundled binary first, falls back to Python venv. */
function startSidecar(): ChildProcess | null {
  const fs = require('fs');
  const sidecarDir = path.join(__dirname, '..', 'sidecar');

  // --- Strategy 1: Bundled binary (packaged Electron app) ---
  // electron-builder puts extraResources into process.resourcesPath
  const resourcesPath = (process as { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    const binaryName = process.platform === 'win32' ? 'sidecar.exe' : 'sidecar';
    const bundledBinary = path.join(resourcesPath, 'sidecar', binaryName);

    if (fs.existsSync(bundledBinary)) {
      console.log('[sidecar] Starting bundled binary...');
      const dataDir = path.join(app.getPath('userData'), 'sidecar-data');
      fs.mkdirSync(dataDir, { recursive: true });

      const proc = spawn(bundledBinary, [], {
        env: {
          ...process.env,
          SIDECAR_PORT: '3100',
          JUBITMIND_DATA_DIR: dataDir,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data: Buffer) => {
        console.log(`[sidecar] ${data.toString().trim()}`);
      });
      proc.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[sidecar] ${msg}`);
      });
      proc.on('exit', (code: number | null) => {
        console.log(`[sidecar] exited with code ${code}`);
        sidecarProcess = null;
      });

      return proc;
    }
  }

  // --- Strategy 2: Python venv (development mode) ---
  const venvPython = process.platform === 'win32'
    ? path.join(sidecarDir, '.venv', 'Scripts', 'python.exe')
    : path.join(sidecarDir, '.venv', 'bin', 'python3');
  const mainPy = path.join(sidecarDir, 'main.py');

  if (!fs.existsSync(venvPython) || !fs.existsSync(mainPy)) {
    console.log('[sidecar] Not installed — skipping (run install.sh to set up)');
    return null;
  }

  console.log('[sidecar] Starting Python venv sidecar (dev mode)...');
  const proc = spawn(venvPython, [mainPy], {
    cwd: sidecarDir,
    env: { ...process.env, SIDECAR_PORT: '3100' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout?.on('data', (data: Buffer) => {
    console.log(`[sidecar] ${data.toString().trim()}`);
  });
  proc.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[sidecar] ${msg}`);
  });
  proc.on('exit', (code: number | null) => {
    console.log(`[sidecar] exited with code ${code}`);
    sidecarProcess = null;
  });

  return proc;
}

/** Start the Express server as a child process. */
function startServer(port: number): ChildProcess {
  const serverPath = path.join(__dirname, '..', 'dist', 'server', 'index.js');
  const proc = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout?.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`);
  });

  proc.stderr?.on('data', (data) => {
    console.error(`[server] ${data.toString().trim()}`);
  });

  proc.on('exit', (code) => {
    console.log(`[server] exited with code ${code}`);
  });

  return proc;
}

// ---------------------------------------------------------------------------
// Window state persistence
// ---------------------------------------------------------------------------

function isVisibleOnAnyDisplay(bounds: { x?: number; y?: number; width: number; height: number }): boolean {
  if (bounds.x === undefined || bounds.y === undefined) return false;
  const displays = screen.getAllDisplays();
  return displays.some((display) => {
    const { x, y, width, height } = display.workArea;
    return (
      bounds.x! >= x - 100 &&
      bounds.y! >= y - 100 &&
      bounds.x! < x + width - 50 &&
      bounds.y! < y + height - 50
    );
  });
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function saveWindowState() {
  if (!mainWindow) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', { ...bounds, isMaximized: false });
    } else {
      store.set('windowBounds.isMaximized', true);
    }
  }, 500);
}

// ---------------------------------------------------------------------------
// App menu
// ---------------------------------------------------------------------------

function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Generate Report',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export-report');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'JubitMind Documentation',
          click: () => shell.openExternal('https://github.com/M1zwell/jubitmind'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/M1zwell/jubitmind/issues'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle('is-first-run', () => !store.get('firstRunComplete', false));
ipcMain.handle('complete-setup', () => {
  store.set('firstRunComplete', true);
  return true;
});

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow() {
  const saved = store.get('windowBounds');
  const bounds = isVisibleOnAnyDisplay(saved) ? saved : { width: 1400, height: 900 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...('x' in bounds ? { x: bounds.x } : {}),
    ...('y' in bounds ? { y: bounds.y } : {}),
    minWidth: 800,
    minHeight: 600,
    title: 'JubitMind',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d1117',
    show: false, // Don't show until splash is loaded
  });

  // Load splash screen immediately
  // splash.html stays in electron/ dir, __dirname is dist-electron-ts/
  mainWindow.loadFile(path.join(__dirname, '..', 'electron', 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (saved.isMaximized) mainWindow?.maximize();
  });

  // Save window state on resize/move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  // Set up app menu
  Menu.setApplicationMenu(buildAppMenu());

  // Find port and create window with splash screen
  serverPort = await findFreePort(3000);
  console.log(`[JubitMind] Starting server on port ${serverPort}...`);
  createWindow();

  // Start sidecar (non-blocking, optional)
  sidecarProcess = startSidecar();

  // Update splash: extraction engine starting
  if (sidecarProcess) {
    mainWindow?.webContents.executeJavaScript(`
      const s = document.getElementById('status');
      if (s) s.textContent = 'Starting extraction engine...';
    `).catch(() => {});

    // Wait for sidecar in background (don't block server startup)
    waitForSidecar(10000).then((ready) => {
      if (ready) {
        console.log('[JubitMind] Sidecar ready');
      } else {
        console.log('[JubitMind] Sidecar not ready — continuing without it');
      }
    });
  }

  // Start server
  serverProcess = startServer(serverPort);

  // Update splash: server starting
  mainWindow?.webContents.executeJavaScript(`
    const s = document.getElementById('status');
    if (s) s.textContent = 'Starting server...';
  `).catch(() => {});

  // Wait for server to be ready
  const ready = await waitForServer(serverPort);
  if (!ready) {
    console.error('[JubitMind] Server failed to start within timeout');
    // Show error on splash screen
    mainWindow?.webContents.executeJavaScript(`
      document.getElementById('status').style.display = 'none';
      document.querySelector('.progress-container').style.display = 'none';
      const err = document.getElementById('error');
      err.style.display = 'block';
      err.textContent = 'Failed to start server. Please check your installation and try again.';
    `).catch(() => {});
    return;
  }

  console.log('[JubitMind] Server ready, loading app...');
  mainWindow?.loadURL(`http://127.0.0.1:${serverPort}`);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      // If server is already running, load app directly
      mainWindow?.loadURL(`http://127.0.0.1:${serverPort}`);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (sidecarProcess && !sidecarProcess.killed) {
    sidecarProcess.kill('SIGTERM');
  }
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
