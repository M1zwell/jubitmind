import { app, BrowserWindow, shell, Menu, ipcMain, screen, Tray, nativeImage, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import net from 'net';
import fs from 'fs';
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let sidecarProcess: ChildProcess | null = null;
let serverPort = 3000;
let tray: Tray | null = null;
let isQuitting = false;

// ---------------------------------------------------------------------------
// Persistent store (window state, first-run flag, settings)
// ---------------------------------------------------------------------------

interface AdapterStatus {
  id: string;
  name: string;
  available: boolean;
  sessionCount?: number;
}

interface StoreSchema {
  windowBounds: { x?: number; y?: number; width: number; height: number; isMaximized: boolean };
  firstRunComplete: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  autoLaunch: boolean;
  enabledAdapters: string[];
  lastScanTime?: string;
  detectedAdapters?: AdapterStatus[];
}

const store = new Store<StoreSchema>({
  name: 'jubitmind-settings',
  defaults: {
    windowBounds: { width: 1400, height: 900, isMaximized: false },
    firstRunComplete: false,
    minimizeToTray: true,
    startMinimized: false,
    autoLaunch: false,
    enabledAdapters: ['claude-code', 'cursor', 'antigravity', 'continue-dev', 'copilot'],
  },
});

// ---------------------------------------------------------------------------
// Auto-launch (Windows startup)
// ---------------------------------------------------------------------------

function setAutoLaunch(enable: boolean) {
  if (process.platform !== 'win32') return;

  const appPath = app.getPath('exe');
  const appName = 'JubitMind';

  try {
    const { execSync } = require('child_process');
    if (enable) {
      // Add to Windows startup via registry
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "\\"${appPath}\\"" /f`, { stdio: 'ignore' });
      console.log('[AutoLaunch] Enabled');
    } else {
      // Remove from Windows startup
      execSync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`, { stdio: 'ignore' });
      console.log('[AutoLaunch] Disabled');
    }
  } catch (error) {
    console.error('[AutoLaunch] Failed:', error);
  }
}

// ---------------------------------------------------------------------------
// System Tray
// ---------------------------------------------------------------------------

function createTray() {
  // Create tray icon - use a simple icon or generate one
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '..', 'build', 'icon.ico')
    : path.join(__dirname, '..', 'build', 'icon.png');

  let trayIcon: Electron.NativeImage;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple colored icon if no icon file exists
    trayIcon = nativeImage.createEmpty();
    // Fallback: create a small 16x16 icon
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      buffer[i * 4] = 59;     // R (green-ish)
      buffer[i * 4 + 1] = 130; // G
      buffer[i * 4 + 2] = 246; // B
      buffer[i * 4 + 3] = 255; // A
    }
    trayIcon = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip('JubitMind - AI Audit Monitor');

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function updateTrayMenu(status?: string) {
  if (!tray) return;

  const detectedAdapters = store.get('detectedAdapters') || [];
  const availableCount = detectedAdapters.filter(a => a.available).length;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: status || `JubitMind - Monitoring ${availableCount} AI tools`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open JubitMind',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Scan AI Tools Now',
      click: async () => {
        updateTrayMenu('Scanning...');
        await scanAdapters();
        showNotification('Scan Complete', `Found ${availableCount} AI tools available`);
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Minimize to Tray',
          type: 'checkbox',
          checked: store.get('minimizeToTray'),
          click: (item) => store.set('minimizeToTray', item.checked),
        },
        {
          label: 'Start Minimized',
          type: 'checkbox',
          checked: store.get('startMinimized'),
          click: (item) => store.set('startMinimized', item.checked),
        },
        {
          label: 'Launch at Startup',
          type: 'checkbox',
          checked: store.get('autoLaunch'),
          click: (item) => {
            store.set('autoLaunch', item.checked);
            setAutoLaunch(item.checked);
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit JubitMind',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ---------------------------------------------------------------------------
// Adapter Scanning
// ---------------------------------------------------------------------------

async function scanAdapters(): Promise<AdapterStatus[]> {
  try {
    const response = await fetch(`http://127.0.0.1:${serverPort}/api/adapters`);
    if (response.ok) {
      const adapters = await response.json() as AdapterStatus[];
      store.set('detectedAdapters', adapters);
      store.set('lastScanTime', new Date().toISOString());
      return adapters;
    }
  } catch (error) {
    console.error('[Scan] Failed to scan adapters:', error);
  }
  return [];
}

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
async function waitForServer(port: number, timeout = 30000): Promise<boolean> {
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
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      JUBITMIND_PROJECT_ROOT: app.getPath('home'),
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
        {
          label: 'Scan AI Tools',
          accelerator: 'CmdOrCtrl+R',
          click: async () => {
            await scanAdapters();
            mainWindow?.webContents.send('adapters-scanned');
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
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow?.hide();
          },
        },
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

// Settings IPC
ipcMain.handle('get-settings', () => ({
  minimizeToTray: store.get('minimizeToTray'),
  startMinimized: store.get('startMinimized'),
  autoLaunch: store.get('autoLaunch'),
  enabledAdapters: store.get('enabledAdapters'),
}));

ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
  store.set(key as keyof StoreSchema, value as never);
  if (key === 'autoLaunch') {
    setAutoLaunch(value as boolean);
  }
  updateTrayMenu();
  return true;
});

// Adapter scanning IPC
ipcMain.handle('scan-adapters', async () => {
  return await scanAdapters();
});

ipcMain.handle('get-detected-adapters', () => {
  return store.get('detectedAdapters') || [];
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
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d1117',
    show: false, // Don't show until splash is loaded
    icon: process.platform === 'win32'
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(__dirname, '..', 'build', 'icon.png'),
  });

  // Load splash screen immediately
  // splash.html stays in electron/ dir, __dirname is dist-electron-ts/
  mainWindow.loadFile(path.join(__dirname, '..', 'electron', 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    // Check if we should start minimized
    if (store.get('startMinimized')) {
      // Don't show window, just minimize to tray
      console.log('[JubitMind] Starting minimized to tray');
    } else {
      mainWindow?.show();
      if (saved.isMaximized) mainWindow?.maximize();
    }
  });

  // Save window state on resize/move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Minimize to tray instead of closing (on Windows)
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray') && process.platform === 'win32') {
      event.preventDefault();
      mainWindow?.hide();
      showNotification('JubitMind', 'Running in background. Click tray icon to open.');
    }
  });

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

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Set up app menu
    Menu.setApplicationMenu(buildAppMenu());

    // Create system tray
    createTray();

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

    console.log('[JubitMind] Server ready, scanning adapters...');

    // Scan adapters on startup
    await scanAdapters();
    updateTrayMenu();

    // Check if this is first run - show setup wizard
    if (!store.get('firstRunComplete')) {
      console.log('[JubitMind] First run detected, loading setup wizard...');
      mainWindow?.loadURL(`http://127.0.0.1:${serverPort}/setup-wizard`);
    } else {
      mainWindow?.loadURL(`http://127.0.0.1:${serverPort}`);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        // If server is already running, load app directly
        mainWindow?.loadURL(`http://127.0.0.1:${serverPort}`);
      } else {
        mainWindow?.show();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // On Windows with minimize to tray, don't quit
  if (process.platform !== 'darwin' && !store.get('minimizeToTray')) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (sidecarProcess && !sidecarProcess.killed) {
    sidecarProcess.kill('SIGTERM');
  }
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
