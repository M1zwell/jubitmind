import { contextBridge, ipcRenderer } from 'electron';

export interface JubitMindSettings {
  minimizeToTray: boolean;
  startMinimized: boolean;
  autoLaunch: boolean;
  enabledAdapters: string[];
}

export interface DetectedAdapter {
  id: string;
  name: string;
  available: boolean;
  sessionCount?: number;
  description?: string;
}

contextBridge.exposeInMainWorld('jubitmind', {
  platform: process.platform,
  isElectron: true,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // First-run wizard
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  completeSetup: () => ipcRenderer.invoke('complete-setup'),

  // Settings
  getSettings: (): Promise<JubitMindSettings> => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown): Promise<boolean> =>
    ipcRenderer.invoke('set-setting', key, value),

  // Adapter scanning
  scanAdapters: (): Promise<DetectedAdapter[]> => ipcRenderer.invoke('scan-adapters'),
  getDetectedAdapters: (): Promise<DetectedAdapter[]> => ipcRenderer.invoke('get-detected-adapters'),

  // Menu events
  onMenuExportReport: (callback: () => void) => {
    ipcRenderer.on('menu-export-report', () => callback());
    return () => { ipcRenderer.removeAllListeners('menu-export-report'); };
  },

  // Adapter scan complete event
  onAdaptersScanned: (callback: () => void) => {
    ipcRenderer.on('adapters-scanned', () => callback());
    return () => { ipcRenderer.removeAllListeners('adapters-scanned'); };
  },
});

// Type declaration for window.jubitmind
declare global {
  interface Window {
    jubitmind?: {
      platform: string;
      isElectron: boolean;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      isFirstRun: () => Promise<boolean>;
      completeSetup: () => Promise<boolean>;
      getSettings: () => Promise<JubitMindSettings>;
      setSetting: (key: string, value: unknown) => Promise<boolean>;
      scanAdapters: () => Promise<DetectedAdapter[]>;
      getDetectedAdapters: () => Promise<DetectedAdapter[]>;
      onMenuExportReport: (callback: () => void) => () => void;
      onAdaptersScanned: (callback: () => void) => () => void;
    };
  }
}
