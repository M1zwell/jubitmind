import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { getAllSessions, type CachedSessionMeta } from './session-cache.js';
import { getStatsCache } from './claude-sessions.js';
import { refreshAll } from './session-cache.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditReport {
  id: string;
  timestamp: string;
  type: 'scheduled' | 'emergency';
  duration_ms: number;
  security: {
    criticalFindings: number;
    highFindings: number;
    sessionsScanned: number;
    topRisks: Array<{ sessionId: string; risk: string; detail: string }>;
    newSinceLastAudit: number;
  };
  performance: {
    totalSessions: number;
    totalSizeBytes: number;
    largestSession: { id: string; sizeBytes: number };
    avgSessionSizeBytes: number;
    sessionsOver10MB: number;
  };
  billing: {
    estimatedCostUsd: number;
    costChangePercent: number;
    topModels: Array<{ model: string; tokens: number }>;
    alert: boolean;
    alertReason?: string;
  };
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INTERVAL_MS = 1_800_000; // 30 minutes
const REPORTS_DIR = path.join(process.cwd(), 'data', 'auditor');
const TEN_MB = 10 * 1024 * 1024;
const COST_SPIKE_THRESHOLD_PERCENT = 50; // alert if cost jumps >50%

// Dangerous patterns reused from risk-scorer.ts
const CRITICAL_BASH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive)\b/, label: 'rm -rf' },
  { pattern: /\bsudo\b/, label: 'sudo usage' },
  { pattern: /\bgit\s+push\s+(-f|--force)\b/, label: 'git push --force' },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, label: 'DROP TABLE/DATABASE' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, label: 'TRUNCATE TABLE' },
  { pattern: /\bkill\s+-9\b/, label: 'kill -9' },
  { pattern: /\bgit\s+reset\s+--hard\b/, label: 'git reset --hard' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/, label: 'git clean -f' },
  { pattern: /\bchmod\s+777\b/, label: 'chmod 777' },
  { pattern: /\bmkfs\b/, label: 'mkfs (format disk)' },
  { pattern: /\bdd\s+if=/, label: 'dd (raw disk write)' },
];

const CRITICAL_FILE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\.env($|\.)/, label: '.env file access' },
  { pattern: /credentials/i, label: 'credentials file' },
  { pattern: /\/etc\//, label: '/etc/ system config' },
  { pattern: /\.pem$/, label: 'PEM certificate' },
  { pattern: /\.key$/, label: 'private key file' },
  { pattern: /id_rsa/, label: 'SSH private key' },
  { pattern: /\.ssh\//, label: '.ssh directory access' },
  { pattern: /password/i, label: 'password file' },
  { pattern: /secret/i, label: 'secrets file' },
  { pattern: /\.kube\/config/, label: 'kube config' },
  { pattern: /aws\/credentials/, label: 'AWS credentials' },
];

const HIGH_BASH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgit\s+push\b/, label: 'git push' },
  { pattern: /\bnpm\s+publish\b/, label: 'npm publish' },
  { pattern: /\bcurl\s+/, label: 'curl (network request)' },
  { pattern: /\bwget\s+/, label: 'wget (network request)' },
  { pattern: /\bssh\s+/, label: 'ssh connection' },
  { pattern: /\bscp\s+/, label: 'scp file transfer' },
  { pattern: /\bnpm\s+install\s+-g\b/, label: 'npm install -g' },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let auditorTimer: ReturnType<typeof setInterval> | null = null;
let lastAuditTimestamp: string | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateReportId(): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `audit-${datePart}-${rand}`;
}

async function ensureReportsDir(): Promise<void> {
  await fsp.mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * Scan a single session's preview text for dangerous patterns.
 * Returns an array of findings (risk label + detail).
 */
function scanSessionForRisks(
  session: CachedSessionMeta,
): Array<{ risk: string; detail: string }> {
  const findings: Array<{ risk: string; detail: string }> = [];
  const text = session.preview || '';

  // Check for critical bash patterns in preview text
  for (const { pattern, label } of CRITICAL_BASH_PATTERNS) {
    if (pattern.test(text)) {
      findings.push({ risk: 'critical', detail: label });
    }
  }

  // Check for sensitive file access patterns
  for (const { pattern, label } of CRITICAL_FILE_PATTERNS) {
    if (pattern.test(text)) {
      findings.push({ risk: 'critical', detail: label });
    }
  }

  // Check for high-risk bash patterns
  for (const { pattern, label } of HIGH_BASH_PATTERNS) {
    if (pattern.test(text)) {
      findings.push({ risk: 'high', detail: label });
    }
  }

  // Also use the risk metadata already computed by the risk-scorer pipeline
  if (session.riskLevel === 'critical') {
    findings.push({ risk: 'critical', detail: 'Session flagged critical by risk scorer' });
  } else if (session.riskLevel === 'high') {
    findings.push({ risk: 'high', detail: 'Session flagged high by risk scorer' });
  }

  return findings;
}

/**
 * Parse stats-cache.json for billing information.
 */
function extractBillingInfo(
  stats: Record<string, unknown> | null,
  previousCost: number,
): AuditReport['billing'] {
  const billing: AuditReport['billing'] = {
    estimatedCostUsd: 0,
    costChangePercent: 0,
    topModels: [],
    alert: false,
  };

  if (!stats) return billing;

  // Attempt to extract cost data from common stats-cache structures
  const costField = stats.totalCost ?? stats.total_cost ?? stats.estimatedCost ?? stats.cost;
  if (typeof costField === 'number') {
    billing.estimatedCostUsd = Math.round(costField * 100) / 100;
  }

  // Extract per-model token usage
  const models = stats.models ?? stats.modelUsage ?? stats.model_usage;
  if (models && typeof models === 'object' && !Array.isArray(models)) {
    const modelEntries = Object.entries(models as Record<string, unknown>);
    billing.topModels = modelEntries
      .map(([model, usage]) => {
        let tokens = 0;
        if (typeof usage === 'number') {
          tokens = usage;
        } else if (usage && typeof usage === 'object') {
          const u = usage as Record<string, unknown>;
          tokens =
            (typeof u.total_tokens === 'number' ? u.total_tokens : 0) ||
            (typeof u.totalTokens === 'number' ? u.totalTokens : 0) ||
            (typeof u.tokens === 'number' ? u.tokens : 0) ||
            ((typeof u.input_tokens === 'number' ? u.input_tokens : 0) +
              (typeof u.output_tokens === 'number' ? u.output_tokens : 0));
        }
        return { model, tokens };
      })
      .filter((m) => m.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);
  }

  // Calculate cost change percentage
  if (previousCost > 0 && billing.estimatedCostUsd > 0) {
    billing.costChangePercent = Math.round(
      ((billing.estimatedCostUsd - previousCost) / previousCost) * 100,
    );
  }

  // Alert on cost spike
  if (billing.costChangePercent > COST_SPIKE_THRESHOLD_PERCENT) {
    billing.alert = true;
    billing.alertReason = `Cost increased by ${billing.costChangePercent}% since last audit period`;
  }

  return billing;
}

/**
 * Generate recommendations based on audit findings.
 */
function generateRecommendations(
  security: AuditReport['security'],
  performance: AuditReport['performance'],
  billing: AuditReport['billing'],
): string[] {
  const recs: string[] = [];

  // Security recommendations
  if (security.criticalFindings > 0) {
    recs.push(
      `URGENT: ${security.criticalFindings} critical security finding(s) detected. Review sessions immediately.`,
    );
  }
  if (security.highFindings > 5) {
    recs.push(
      `High-risk activity detected in ${security.highFindings} sessions. Consider tightening tool permissions.`,
    );
  }
  if (security.newSinceLastAudit > 20) {
    recs.push(
      `${security.newSinceLastAudit} new sessions since last audit. Consider increasing audit frequency.`,
    );
  }

  // Performance recommendations
  if (performance.sessionsOver10MB > 0) {
    recs.push(
      `${performance.sessionsOver10MB} session(s) exceed 10MB. Large sessions may impact dashboard performance.`,
    );
  }
  if (performance.avgSessionSizeBytes > 5 * 1024 * 1024) {
    recs.push(
      `Average session size is ${(performance.avgSessionSizeBytes / (1024 * 1024)).toFixed(1)}MB. Consider archiving old sessions.`,
    );
  }
  if (performance.totalSizeBytes > 500 * 1024 * 1024) {
    recs.push(
      `Total session storage is ${(performance.totalSizeBytes / (1024 * 1024)).toFixed(0)}MB. Consider implementing data retention policies.`,
    );
  }

  // Billing recommendations
  if (billing.alert) {
    recs.push(`BILLING ALERT: ${billing.alertReason}`);
  }
  if (billing.estimatedCostUsd > 100) {
    recs.push(
      `Estimated cost is $${billing.estimatedCostUsd.toFixed(2)}. Review model usage for optimization opportunities.`,
    );
  }

  if (recs.length === 0) {
    recs.push('No issues detected. All systems operating normally.');
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Core audit logic
// ---------------------------------------------------------------------------

/**
 * Execute a full audit scan and return the report.
 */
async function executeAudit(type: 'scheduled' | 'emergency'): Promise<AuditReport> {
  const startTime = Date.now();

  // Refresh session cache to get latest data
  await refreshAll();

  // Fetch all sessions (no limit for auditing)
  const sessions = await getAllSessions(10_000);

  // --- Security scanning ---
  let criticalFindings = 0;
  let highFindings = 0;
  const topRisks: Array<{ sessionId: string; risk: string; detail: string }> = [];

  // Determine which sessions are new since last audit
  let newSinceLastAudit = 0;
  for (const session of sessions) {
    if (lastAuditTimestamp && session.updatedAt > lastAuditTimestamp) {
      newSinceLastAudit++;
    }

    const findings = scanSessionForRisks(session);
    for (const finding of findings) {
      if (finding.risk === 'critical') {
        criticalFindings++;
      } else if (finding.risk === 'high') {
        highFindings++;
      }

      // Collect top risks (limit to 20 for report brevity)
      if (topRisks.length < 20) {
        topRisks.push({
          sessionId: session.sessionId,
          risk: finding.risk,
          detail: finding.detail,
        });
      }
    }
  }

  // If no last audit timestamp, all sessions are "new"
  if (!lastAuditTimestamp) {
    newSinceLastAudit = sessions.length;
  }

  const security: AuditReport['security'] = {
    criticalFindings,
    highFindings,
    sessionsScanned: sessions.length,
    topRisks: topRisks.slice(0, 10),
    newSinceLastAudit,
  };

  // --- Performance monitoring ---
  let totalSizeBytes = 0;
  let largestSession = { id: '', sizeBytes: 0 };
  let sessionsOver10MB = 0;

  for (const session of sessions) {
    const size = session.sizeBytes || 0;
    totalSizeBytes += size;

    if (size > largestSession.sizeBytes) {
      largestSession = { id: session.sessionId, sizeBytes: size };
    }

    if (size > TEN_MB) {
      sessionsOver10MB++;
    }
  }

  const avgSessionSizeBytes =
    sessions.length > 0 ? Math.round(totalSizeBytes / sessions.length) : 0;

  const performance: AuditReport['performance'] = {
    totalSessions: sessions.length,
    totalSizeBytes,
    largestSession,
    avgSessionSizeBytes,
    sessionsOver10MB,
  };

  // --- Billing analysis ---
  const stats = await getStatsCache();
  const previousCost = await getPreviousAuditCost();
  const billing = extractBillingInfo(stats, previousCost);

  // --- Recommendations ---
  const recommendations = generateRecommendations(security, performance, billing);

  const report: AuditReport = {
    id: generateReportId(),
    timestamp: new Date().toISOString(),
    type,
    duration_ms: Date.now() - startTime,
    security,
    performance,
    billing,
    recommendations,
  };

  // Persist report
  await saveReport(report);

  // Update last audit timestamp
  lastAuditTimestamp = report.timestamp;

  return report;
}

// ---------------------------------------------------------------------------
// Report persistence
// ---------------------------------------------------------------------------

async function saveReport(report: AuditReport): Promise<void> {
  await ensureReportsDir();
  const filename = `${report.id}.json`;
  const filePath = path.join(REPORTS_DIR, filename);
  await fsp.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Read the cost from the most recent audit report for comparison.
 */
async function getPreviousAuditCost(): Promise<number> {
  try {
    const latest = await getLatestReport();
    return latest?.billing.estimatedCostUsd ?? 0;
  } catch {
    return 0;
  }
}

/**
 * List report files sorted by name descending (newest first).
 */
async function listReportFiles(): Promise<string[]> {
  try {
    await ensureReportsDir();
    const files = await fsp.readdir(REPORTS_DIR);
    return files
      .filter((f) => f.startsWith('audit-') && f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the most recent audit report, or null if none exist.
 */
export async function getLatestReport(): Promise<AuditReport | null> {
  const files = await listReportFiles();
  if (files.length === 0) return null;

  const filePath = path.join(REPORTS_DIR, files[0]);
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as AuditReport;
  } catch {
    return null;
  }
}

/**
 * Get recent audit reports, newest first.
 */
export async function getReportHistory(limit = 10): Promise<AuditReport[]> {
  const files = await listReportFiles();
  const reports: AuditReport[] = [];

  for (const file of files.slice(0, limit)) {
    try {
      const filePath = path.join(REPORTS_DIR, file);
      const raw = await fsp.readFile(filePath, 'utf-8');
      reports.push(JSON.parse(raw) as AuditReport);
    } catch {
      // skip corrupted report files
    }
  }

  return reports;
}

/**
 * Run an audit immediately (for emergencies or on-demand checks).
 * Returns the completed audit report.
 */
export async function runAuditNow(): Promise<AuditReport> {
  if (isRunning) {
    throw new Error('An audit is already in progress. Please wait for it to complete.');
  }

  isRunning = true;
  try {
    const report = await executeAudit('emergency');
    console.log(
      `[auditor] Emergency audit completed in ${report.duration_ms}ms ` +
        `(${report.security.criticalFindings} critical, ${report.security.highFindings} high)`,
    );
    return report;
  } finally {
    isRunning = false;
  }
}

/**
 * Start the background auditor timer.
 * Runs an initial audit immediately, then repeats at the configured interval.
 */
export function startAuditor(): void {
  if (auditorTimer) {
    console.log('[auditor] Auditor is already running.');
    return;
  }

  const intervalMs = parseInt(process.env.AUDITOR_INTERVAL_MS || '', 10) || DEFAULT_INTERVAL_MS;

  console.log(
    `[auditor] Starting background auditor (interval: ${(intervalMs / 60_000).toFixed(1)} min)`,
  );

  // Run initial audit after a short delay to let the server finish starting
  setTimeout(async () => {
    if (!isRunning) {
      isRunning = true;
      try {
        const report = await executeAudit('scheduled');
        console.log(
          `[auditor] Initial audit completed in ${report.duration_ms}ms ` +
            `(${report.security.criticalFindings} critical, ${report.security.highFindings} high, ` +
            `${report.performance.totalSessions} sessions scanned)`,
        );
      } catch (err) {
        console.error('[auditor] Initial audit failed:', err);
      } finally {
        isRunning = false;
      }
    }
  }, 5_000);

  // Schedule recurring audits
  auditorTimer = setInterval(async () => {
    if (isRunning) {
      console.log('[auditor] Skipping scheduled audit - previous audit still running.');
      return;
    }

    isRunning = true;
    try {
      const report = await executeAudit('scheduled');
      console.log(
        `[auditor] Scheduled audit completed in ${report.duration_ms}ms ` +
          `(${report.security.criticalFindings} critical, ${report.security.highFindings} high, ` +
          `${report.performance.totalSessions} sessions scanned)`,
      );
    } catch (err) {
      console.error('[auditor] Scheduled audit failed:', err);
    } finally {
      isRunning = false;
    }
  }, intervalMs);

  // Prevent the timer from keeping the Node process alive if everything else shuts down
  if (auditorTimer && typeof auditorTimer === 'object' && 'unref' in auditorTimer) {
    auditorTimer.unref();
  }
}

/**
 * Stop the background auditor timer.
 */
export function stopAuditor(): void {
  if (auditorTimer) {
    clearInterval(auditorTimer);
    auditorTimer = null;
    console.log('[auditor] Background auditor stopped.');
  }
}
