import type express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export function extractClientIp(req: express.Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim().length > 0) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function buildAllowedCorsOrigins(extraOrigins: string[] = []): Set<string> {
  const allowed = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
  ]);

  const envAppUrl = (process.env.APP_URL || "").trim();
  if (envAppUrl) {
    try {
      allowed.add(new URL(envAppUrl).origin);
    } catch {
      // ignora URL inválida
    }
  }

  const extraCsv = (process.env.CORS_ALLOWED_ORIGINS || "").trim();
  if (extraCsv) {
    for (const raw of extraCsv.split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        allowed.add(new URL(trimmed).origin);
      } catch {
        allowed.add(trimmed);
      }
    }
  }

  for (const item of extraOrigins) {
    if (item) allowed.add(item);
  }

  return allowed;
}

export function createSecurityHeadersMiddleware() {
  return helmet({
    // Necessário para permitir exibição segura dentro de iframe do ambiente preview/produção
    frameguard: false,
    // Mantém compatibilidade com scripts inline de inicialização e gráficos SVG no Vite/React
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

export function createStrictCorsMiddleware(extraOrigins: string[] = []) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const originHeader = req.headers.origin;
    if (!originHeader) {
      // Requisições same-origin sem header Origin ou ferramentas de saúde internas
      return next();
    }

    const allowedOrigins = buildAllowedCorsOrigins(extraOrigins);
    const hostHeader = req.headers.host;
    const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || (req.secure ? "https" : "http");
    if (hostHeader) {
      allowedOrigins.add(`${proto}://${hostHeader}`);
      allowedOrigins.add(`https://${hostHeader}`);
      allowedOrigins.add(`http://${hostHeader}`);
    }

    if (!allowedOrigins.has(originHeader)) {
      return res.status(403).json({
        error: "Origem não autorizada pela política de segurança CORS.",
      });
    }

    res.setHeader("Access-Control-Allow-Origin", originHeader);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-auth-token, x-user-email");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return next();
  };
}

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
}

export function createAuthLoginIpLimiter(opts: RateLimiterOptions = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? 15 * 60 * 1000,
    max: opts.max ?? 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Muitas tentativas de acesso a partir deste endereço. Aguarde alguns minutos e tente novamente.",
    },
  });
}

export function createAuthSensitiveIpLimiter(opts: RateLimiterOptions = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? 15 * 60 * 1000,
    max: opts.max ?? 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Limite de solicitações de segurança atingido. Aguarde alguns minutos para tentar novamente.",
    },
  });
}

export function createApiGeneralLimiter(opts: RateLimiterOptions = {}) {
  return rateLimit({
    windowMs: opts.windowMs ?? 60 * 1000,
    max: opts.max ?? 400,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health",
    message: {
      error: "Muitas requisições em sequência. Aguarde alguns segundos e tente novamente.",
    },
  });
}

export class LoginAttemptTracker {
  private attempts = new Map<string, { failures: number; firstFailureAt: number; lockedUntil: number }>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly lockDurationMs: number;

  constructor(maxFailures = 8, windowMs = 10 * 60 * 1000, lockDurationMs = 2 * 60 * 1000) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
    this.lockDurationMs = lockDurationMs;
  }

  public isLocked(email: string): { locked: boolean; retryAfterSeconds: number } {
    const key = email.toLowerCase().trim();
    const entry = this.attempts.get(key);
    if (!entry) return { locked: false, retryAfterSeconds: 0 };

    const now = Date.now();
    if (entry.lockedUntil > now) {
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
      };
    }

    if (now - entry.firstFailureAt > this.windowMs) {
      this.attempts.delete(key);
    }

    return { locked: false, retryAfterSeconds: 0 };
  }

  public recordFailure(email: string): { locked: boolean; failures: number } {
    const key = email.toLowerCase().trim();
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || now - current.firstFailureAt > this.windowMs) {
      const next = { failures: 1, firstFailureAt: now, lockedUntil: 0 };
      this.attempts.set(key, next);
      return { locked: false, failures: 1 };
    }

    current.failures += 1;
    if (current.failures >= this.maxFailures) {
      current.lockedUntil = now + this.lockDurationMs;
    }
    this.attempts.set(key, current);
    return { locked: current.lockedUntil > now, failures: current.failures };
  }

  public recordSuccess(email: string): void {
    this.attempts.delete(email.toLowerCase().trim());
  }
}
