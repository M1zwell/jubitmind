import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 3000;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
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
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

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

app.whenReady().then(async () => {
  serverPort = await findFreePort(3000);
  console.log(`[JubitMind] Starting server on port ${serverPort}...`);

  serverProcess = startServer(serverPort);

  const ready = await waitForServer(serverPort);
  if (!ready) {
    console.error('[JubitMind] Server failed to start within timeout');
    app.quit();
    return;
  }

  console.log('[JubitMind] Server ready, opening window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
