import { spawn, execSync, type ChildProcess } from 'child_process';
import { PATHS } from './config-resolver.js';

let activeProcess: ChildProcess | null = null;

export function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(PATHS.cliBinary, args, {
      cwd: PATHS.projectRoot,
      env: { ...process.env, NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `Process exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

export function runCliSync(args: string[]): string {
  try {
    return execSync(`${PATHS.cliBinary} ${args.join(' ')}`, {
      cwd: PATHS.projectRoot,
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    throw new Error(e.stderr || e.message || 'CLI command failed');
  }
}

export function streamCli(
  args: string[],
  onData: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): void {
  cancelCli(); // Kill any existing process

  const child = spawn(PATHS.cliBinary, args, {
    cwd: PATHS.projectRoot,
    env: { ...process.env, NO_COLOR: '1' },
  });

  activeProcess = child;

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      onData(line);
    }
  });

  child.stderr.on('data', (data) => {
    onData(JSON.stringify({ type: 'error', content: data.toString() }));
  });

  child.on('close', () => {
    activeProcess = null;
    onDone();
  });

  child.on('error', (err) => {
    activeProcess = null;
    onError(err);
  });
}

export function cancelCli(): boolean {
  if (activeProcess) {
    activeProcess.kill('SIGTERM');
    activeProcess = null;
    return true;
  }
  return false;
}
