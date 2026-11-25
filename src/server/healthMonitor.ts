import type express from "express";

export interface HealthMonitorSnapshot {
  totalRequests: number;
  total5xx: number;
  last5xxAt: string | null;
  last5xxPath: string | null;
  lastMaintenanceAt: string | null;
  lastMaintenanceCleanedCount: number;
  memoryRssMb: number;
}

export interface MonitoringAlertEvent {
  type: "http_5xx" | "db_degraded";
  message: string;
  timestamp: string;
  path?: string;
  statusCode?: number;
}

export class ServerHealthMonitor {
  private totalRequests = 0;
  private total5xx = 0;
  private last5xxAt: string | null = null;
  private last5xxPath: string | null = null;
  private lastMaintenanceAt: string | null = null;
  private lastMaintenanceCleanedCount = 0;
  private lastAlertSentAt: number | null = null;
  private readonly alertCooldownMs: number;
  private readonly onAlert?: (event: MonitoringAlertEvent) => void;

  constructor(options?: {
    alertCooldownMs?: number;
    onAlert?: (event: MonitoringAlertEvent) => void;
  }) {
    this.alertCooldownMs = options?.alertCooldownMs ?? 10 * 60 * 1000;
    this.onAlert = options?.onAlert;
  }

  recordRequest(statusCode: number, rawPath: string, nowMs: number = Date.now()): void {
    this.totalRequests += 1;
    if (statusCode >= 500) {
      this.total5xx += 1;
      const cleanPath = String(rawPath || "/").split("?")[0].slice(0, 120);
      const iso = new Date(nowMs).toISOString();
      this.last5xxAt = iso;
      this.last5xxPath = cleanPath;

      if (this.onAlert && (this.lastAlertSentAt === null || nowMs - this.lastAlertSentAt >= this.alertCooldownMs)) {
        this.lastAlertSentAt = nowMs;
        this.onAlert({
          type: "http_5xx",
          message: `[FinanFly Alerta] Erro ${statusCode} detectado em ${cleanPath}`,
          timestamp: iso,
          path: cleanPath,
          statusCode,
        });
      }
    }
  }

  notifyDbDegraded(reason: string, nowMs: number = Date.now()): void {
    if (this.onAlert && (this.lastAlertSentAt === null || nowMs - this.lastAlertSentAt >= this.alertCooldownMs)) {
      this.lastAlertSentAt = nowMs;
      this.onAlert({
        type: "db_degraded",
        message: `[FinanFly Alerta] Saúde do banco degradada: ${reason}`,
        timestamp: new Date(nowMs).toISOString(),
      });
    }
  }

  recordMaintenanceRun(cleanedCount: number, nowMs: number = Date.now()): void {
    this.lastMaintenanceAt = new Date(nowMs).toISOString();
    this.lastMaintenanceCleanedCount = Math.max(0, Number(cleanedCount) || 0);
  }

  getSnapshot(): HealthMonitorSnapshot {
    const rssBytes = typeof process !== "undefined" && typeof process.memoryUsage === "function"
      ? process.memoryUsage().rss
      : 0;
    return {
      totalRequests: this.totalRequests,
      total5xx: this.total5xx,
      last5xxAt: this.last5xxAt,
      last5xxPath: this.last5xxPath,
      lastMaintenanceAt: this.lastMaintenanceAt,
      lastMaintenanceCleanedCount: this.lastMaintenanceCleanedCount,
      memoryRssMb: Math.round((rssBytes / (1024 * 1024)) * 10) / 10,
    };
  }
}

export function createHttpTelemetryMiddleware(monitor: ServerHealthMonitor): express.RequestHandler {
  return (req, res, next) => {
    res.on("finish", () => {
      monitor.recordRequest(res.statusCode, req.originalUrl || req.path || "/");
    });
    next();
  };
}

export async function sendMonitoringAlertWebhook(
  webhookUrl: string,
  event: MonitoringAlertEvent
): Promise<boolean> {
  const cleanUrl = String(webhookUrl || "").trim();
  if (!cleanUrl || !cleanUrl.startsWith("https://")) {
    return false;
  }
  try {
    const resp = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "FinanFly",
        text: event.message,
        content: event.message,
        ...event,
      }),
      signal: AbortSignal.timeout(4000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function buildHealthPayload(params: {
  dbConnected: boolean;
  latencyMs: number;
  dbError?: string;
  usingServiceRole: boolean;
  jwtSecretConfigured: boolean;
  uptimeSeconds: number;
  retentionYears: number;
  trashDays: number;
  backupDays: number;
  monitorSnapshot: HealthMonitorSnapshot;
  timestamp?: string;
}) {
  return {
    ok: params.dbConnected,
    status: params.dbConnected ? "healthy" : "degraded",
    uptimeSeconds: params.uptimeSeconds,
    timestamp: params.timestamp || new Date().toISOString(),
    database: {
      connected: params.dbConnected,
      latencyMs: params.latencyMs,
      usingServiceRole: params.usingServiceRole,
      ...(params.dbError ? { error: params.dbError } : {}),
    },
    security: {
      jwtSecretConfigured: params.jwtSecretConfigured,
      rateLimitingEnabled: true,
      corsRestricted: true,
      optimisticLockingEnabled: true,
    },
    retention: {
      dataYears: params.retentionYears,
      trashDays: params.trashDays,
      backupDays: params.backupDays,
    },
    monitoring: params.monitorSnapshot,
  };
}
