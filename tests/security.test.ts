import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { DATABASE_SCHEMA_CATALOG, generateSafeSchemaScripts } from "../src/lib/databaseCatalog";
import {
  LoginAttemptTracker,
  createAuthLoginIpLimiter,
  createSecurityHeadersMiddleware,
  createStrictCorsMiddleware,
} from "../src/server/security";
import {
  applyThreeYearRetention,
  isWithinTrashRestoreWindow,
  isWithinBackupRestoreWindow,
  summarizeUserDataSnapshot,
  TRASH_RETENTION_DAYS,
  BACKUP_RETENTION_DAYS,
  RETENTION_YEARS,
} from "../src/server/retention";
import { detectSingleGranularMutation, detectGranularMutation } from "../src/utils/dataDiff";
import {
  ForeignRowOwnershipError,
  pickAllowedUserDataFields,
  sanitizePostgrestEmailFilter,
  assertNoForeignRowOwnership,
  remapCollidingImportIds,
  mergeScopedYearUserData,
} from "../src/server/isolation";
import {
  verifyMercadoPagoWebhookSignature,
  isPaymentSimulationAllowed,
} from "../src/server/paymentSecurity";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenActive,
  buildPasswordResetEmailPayload,
} from "../src/server/passwordReset";
import {
  ServerHealthMonitor,
  buildHealthPayload,
} from "../src/server/healthMonitor";
import { generateRecordId } from "../src/utils/id";
import { parsePtBrNumber, formatPtBrCurrency } from "../src/utils/numberUtils";
import { getTodayLocalDateStr } from "../src/utils/dateUtils";

describe("FinanFly Schema Safety & Performance Catalog", () => {
  it("contém 26 tabelas incluindo audit_logs, trash_items, user_backups e índices compostos", () => {
    const names = DATABASE_SCHEMA_CATALOG.map((t) => t.name);
    assert.equal(DATABASE_SCHEMA_CATALOG.length, 26);
    assert.ok(names.includes("audit_logs"), "audit_logs deve constar no catálogo");
    assert.ok(names.includes("trash_items"), "trash_items deve constar no catálogo");
    assert.ok(names.includes("user_backups"), "user_backups deve constar no catálogo");

    const existing = new Set(names.filter((n) => n !== "audit_logs" && n !== "trash_items" && n !== "user_backups"));
    const scripts = generateSafeSchemaScripts(existing, ["audit_logs", "trash_items", "user_backups"]);

    const stripSqlComments = (sql: string) =>
      sql
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n");

    assert.equal(/DROP\s+TABLE/i.test(stripSqlComments(scripts.differentialSql)), false, "Script diferencial nunca pode conter DROP TABLE");
    assert.equal(/DROP\s+TABLE/i.test(stripSqlComments(scripts.fullSafeSql)), false, "Script completo nunca pode conter DROP TABLE");
    assert.equal(/DROP\s+TABLE/i.test(stripSqlComments(scripts.rlsHardeningSql)), false, "Script RLS nunca pode conter DROP TABLE");

    assert.ok(scripts.differentialSql.includes("idx_expenses_email_date"));
    assert.ok(scripts.differentialSql.includes("idx_incomes_email_date"));
    assert.ok(scripts.differentialSql.includes("idx_investments_email_date"));
    assert.ok(scripts.differentialSql.includes("CREATE TABLE IF NOT EXISTS audit_logs"));
    assert.ok(scripts.differentialSql.includes("CREATE TABLE IF NOT EXISTS trash_items"));
    assert.ok(scripts.differentialSql.includes("CREATE TABLE IF NOT EXISTS user_backups"));
    assert.ok(scripts.rlsHardeningSql.includes('CREATE POLICY "Restrito service_role - trash_items"'));
    assert.ok(scripts.rlsHardeningSql.includes('CREATE POLICY "Restrito service_role - user_backups"'));
    assert.ok(scripts.differentialSql.includes("finanfly_prevent_email_reassignment"));
    assert.ok(scripts.differentialSql.includes("TG_OP = 'UPDATE'"));
    assert.ok(scripts.differentialSql.includes("CREATE UNIQUE INDEX IF NOT EXISTS"));
    assert.ok(scripts.fullSafeSql.includes("finanfly_prevent_email_reassignment"));
  });
});

describe("FinanFly 3-Year Data Retention & 3-Day Restore Windows", () => {
  it("mantém apenas dados dos últimos 3 anos e sobrescreve/remove registros mais antigos", () => {
    assert.equal(RETENTION_YEARS, 3);
    assert.equal(TRASH_RETENTION_DAYS, 3);
    assert.equal(BACKUP_RETENTION_DAYS, 3);

    const refDate = new Date("2026-11-24T12:00:00.000Z");
    const sample = {
      incomes: [
        { id: "inc-recent", date: "2026-11-01", description: "Salário", value: 5000 },
        { id: "inc-boundary", date: "2023-11-24", description: "Limite exato 3 anos", value: 1200 },
        { id: "inc-old", date: "2023-11-23", description: "Receita antiga >3 anos", value: 900 },
      ],
      expenses: [
        { id: "exp-ok", date: "2024-06-15", description: "Mercado", value: 300 },
        { id: "exp-old", date: "2022-05-10", description: "Conta antiga", value: 150 },
      ],
      annualPlanning: [
        { year: 2022, monthlyBudgets: {} },
        { year: 2023, monthlyBudgets: {} },
        { year: 2026, monthlyBudgets: {} },
      ],
      actionPlans: [
        { id: "goal-active", title: "Reserva", targetDate: "2022-01-01", status: "Em andamento", value: 1000 },
        { id: "goal-old-done", title: "Curso 2021", targetDate: "2021-12-01", status: "Concluído", value: 500 },
      ],
    };

    const result = applyThreeYearRetention(sample, refDate);
    assert.deepEqual(
      result.prunedData.incomes.map((i) => i.id),
      ["inc-recent", "inc-boundary"]
    );
    assert.deepEqual(
      result.prunedData.expenses.map((e) => e.id),
      ["exp-ok"]
    );
    assert.deepEqual(
      result.prunedData.annualPlanning.map((p) => p.year),
      [2023, 2026]
    );
    assert.deepEqual(
      result.prunedData.actionPlans.map((a) => a.id),
      ["goal-active"]
    );
    assert.equal(result.totalRemoved, 4);
  });

  it("permite restaurar itens da lixeira e backups somente nos últimos 3 dias (72 horas)", () => {
    const now = new Date("2026-11-24T12:00:00.000Z");
    const withinWindow = new Date(now.getTime() - 70 * 60 * 60 * 1000).toISOString(); // 70h atrás
    const exactLimit = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(); // 72h exatas
    const expired = new Date(now.getTime() - 73 * 60 * 60 * 1000).toISOString(); // 73h atrás (> 3 dias)

    assert.equal(isWithinTrashRestoreWindow(withinWindow, now), true);
    assert.equal(isWithinTrashRestoreWindow(exactLimit, now), true);
    assert.equal(isWithinTrashRestoreWindow(expired, now), false);
    assert.equal(isWithinTrashRestoreWindow("data-invalida", now), false);

    assert.equal(isWithinBackupRestoreWindow(withinWindow, now), true);
    assert.equal(isWithinBackupRestoreWindow(exactLimit, now), true);
    assert.equal(isWithinBackupRestoreWindow(expired, now), false);
    assert.equal(isWithinBackupRestoreWindow("data-invalida", now), false);

    const summary = summarizeUserDataSnapshot({
      incomes: [{ id: "1" }, { id: "2" }],
      expenses: [{ id: "3" }],
      incomeCategories: ["Salário"],
      expenseCategories: ["Casa", "Lazer"],
    });
    assert.equal(summary.incomes, 2);
    assert.equal(summary.expenses, 1);
    assert.equal(summary.totalRecords, 3);
    assert.equal(summary.categoriesCount, 3);
  });
});

describe("FinanFly Incremental Save Diff Detector", () => {
  it("detecta inclusão, edição e exclusão unitária sem disparar para alterações em lote", () => {
    const base = {
      expenses: [
        { id: "e1", description: "Café", value: 10 },
        { id: "e2", description: "Almoço", value: 35 },
      ],
      expenseCategories: ["Alimentação"],
    };

    const added = {
      expenses: [{ id: "e3", description: "Livro", value: 50 }, ...base.expenses],
    };
    assert.deepEqual(detectSingleGranularMutation(base, added), {
      entity: "expenses",
      action: "upsert",
      item: { id: "e3", description: "Livro", value: 50 },
    });

    const edited = {
      expenses: [{ id: "e1", description: "Café especial", value: 15 }, base.expenses[1]],
    };
    assert.deepEqual(detectSingleGranularMutation(base, edited), {
      entity: "expenses",
      action: "upsert",
      item: { id: "e1", description: "Café especial", value: 15 },
    });

    const deleted = {
      expenses: [base.expenses[1]],
    };
    assert.deepEqual(detectSingleGranularMutation(base, deleted), {
      entity: "expenses",
      action: "delete",
      id: "e1",
    });

    const bulk = {
      expenses: [
        { id: "e1", description: "Café A", value: 11 },
        { id: "e2", description: "Almoço B", value: 36 },
      ],
    };
    assert.equal(detectSingleGranularMutation(base, bulk), null);
  });

  it("detecta inclusões parceladas (upsert_many) e exclusões em lote (delete_many) sem reenviar toda a lista", () => {
    const base = {
      expenses: [
        { id: "e1", description: "Café", value: 10 },
        { id: "e2", description: "Almoço", value: 35 },
      ],
    };

    const parcelado = {
      expenses: [
        { id: "e3", description: "Compra (1/2)", value: 100 },
        { id: "e4", description: "Compra (2/2)", value: 100 },
        ...base.expenses,
      ],
    };
    assert.deepEqual(detectGranularMutation(base, parcelado), {
      entity: "expenses",
      action: "upsert_many",
      items: [
        { id: "e3", description: "Compra (1/2)", value: 100 },
        { id: "e4", description: "Compra (2/2)", value: 100 },
      ],
    });

    const bulkDelete = {
      expenses: [],
    };
    assert.deepEqual(detectGranularMutation(base, bulkDelete), {
      entity: "expenses",
      action: "delete_many",
      ids: ["e1", "e2"],
    });
  });
});

describe("FinanFly Auth Brute-Force Tracker", () => {
  it("bloqueia após atingir o limite de falhas e desbloqueia após sucesso", () => {
    const tracker = new LoginAttemptTracker(3, 60_000, 30_000);
    const email = "Teste@Example.com";

    assert.equal(tracker.isLocked(email).locked, false);
    tracker.recordFailure(email);
    tracker.recordFailure(email);
    assert.equal(tracker.isLocked(email).locked, false);

    const third = tracker.recordFailure(email);
    assert.equal(third.locked, true);

    const state = tracker.isLocked("teste@example.com");
    assert.equal(state.locked, true);
    assert.ok(state.retryAfterSeconds > 0);

    tracker.recordSuccess(email);
    assert.equal(tracker.isLocked(email).locked, false);
  });
});

describe("FinanFly Security Headers, CORS & Rate Limiting", () => {
  it("aplica headers seguros, rejeita origens não autorizadas e aciona rate limit 429", async () => {
    const app = express();
    app.use(createSecurityHeadersMiddleware());
    app.use("/api", createStrictCorsMiddleware(["https://app.finanfly.test"]));
    app.get("/api/ping", (_req, res) => res.json({ ok: true }));
    app.post("/api/auth/test-login", createAuthLoginIpLimiter({ max: 2, windowMs: 60_000 }), (_req, res) => {
      res.status(401).json({ error: "Credenciais inválidas" });
    });

    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const { port } = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${port}`;

      const okRes = await fetch(`${baseUrl}/api/ping`, {
        headers: { Origin: "https://app.finanfly.test" },
      });
      assert.equal(okRes.status, 200);
      assert.equal(okRes.headers.get("access-control-allow-origin"), "https://app.finanfly.test");
      assert.equal(okRes.headers.get("x-content-type-options"), "nosniff");
      assert.equal(okRes.headers.get("x-frame-options"), null, "X-Frame-Options deve permanecer desabilitado para iframe");

      const evilRes = await fetch(`${baseUrl}/api/ping`, {
        headers: { Origin: "https://malicious.example.com" },
      });
      assert.equal(evilRes.status, 403);
      assert.notEqual(evilRes.headers.get("access-control-allow-origin"), "*");

      const r1 = await fetch(`${baseUrl}/api/auth/test-login`, { method: "POST" });
      const r2 = await fetch(`${baseUrl}/api/auth/test-login`, { method: "POST" });
      const r3 = await fetch(`${baseUrl}/api/auth/test-login`, { method: "POST" });
      assert.equal(r1.status, 401);
      assert.equal(r2.status, 401);
      assert.equal(r3.status, 429);
    } finally {
      server.close();
    }
  });
});

describe("FinanFly Multi-Tenant Row Isolation & Input Sanitization", () => {
  it("bloqueia upsert quando um ID pertence a outro usuário e permite IDs próprios ou novos", async () => {
    const fakeSupabase = {
      from: (table: string) => ({
        select: () => ({
          in: async (_col: string, ids: string[]) => ({
            data: [
              { id: "exp-victim-1", email: "vitima@example.com" },
              { id: "exp-own-1", email: "atacante@example.com" },
            ].filter((r) => ids.includes(r.id)),
            error: null,
          }),
        }),
      }),
    };

    await assertNoForeignRowOwnership(fakeSupabase, "expenses", "atacante@example.com", [
      "exp-own-1",
      "exp-brand-new",
    ]);

    await assert.rejects(
      () =>
        assertNoForeignRowOwnership(fakeSupabase, "expenses", "atacante@example.com", [
          "exp-own-1",
          "exp-victim-1",
        ]),
      (err: any) => {
        assert.ok(err instanceof ForeignRowOwnershipError);
        assert.equal(err.statusCode, 403);
        assert.deepEqual(err.conflictingIds, ["exp-victim-1"]);
        return true;
      }
    );
  });

  it("remapeia IDs colidentes de terceiros na restauração de backup JSON", async () => {
    const fakeSupabase = {
      from: (_table: string) => ({
        select: () => ({
          in: async (_col: string, ids: string[]) => ({
            data: [{ id: "inc-foreign", email: "outro@example.com" }].filter((r) =>
              ids.includes(r.id)
            ),
            error: null,
          }),
        }),
      }),
    };

    const result = await remapCollidingImportIds(
      fakeSupabase,
      "usuario@example.com",
      {
        incomes: [
          { id: "inc-foreign", description: "Importado", value: 100 },
          { id: "inc-mine", description: "Próprio", value: 200 },
        ],
      },
      [{ key: "incomes", table: "incomes", prefix: "inc" }]
    );

    assert.equal(result.remappedCount, 1);
    assert.notEqual(result.userData.incomes[0].id, "inc-foreign");
    assert.ok(String(result.userData.incomes[0].id).startsWith("inc-"));
    assert.equal(result.userData.incomes[1].id, "inc-mine");
  });

  it("filtra estritamente chaves permitidas em POST /api/user/data e sanitiza filtro de auditoria", () => {
    const clean = pickAllowedUserDataFields({
      expenses: [{ id: "e1" }],
      incomes: "nao-array-invalido",
      role: "admin",
      isBlocked: false,
      _allowClearAll: true,
      extraInjected: { x: 1 },
    });

    assert.deepEqual(Object.keys(clean), ["expenses"]);
    assert.equal(clean.expenses.length, 1);

    assert.equal(
      sanitizePostgrestEmailFilter("test@example.com,actor_email.eq.admin@finanfly.com"),
      "test@example.comactor_email.eq.admin@finanfly.com"
    );
    assert.equal(sanitizePostgrestEmailFilter("  Maria.Silva+01@GMAIL.com "), "maria.silva+01@gmail.com");
  });

  it("gera IDs únicos criptograficamente aleatórios em sequência imediata", () => {
    const generated = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const id = generateRecordId("exp");
      assert.ok(id.startsWith("exp-"));
      assert.ok(id.length > 20);
      assert.equal(generated.has(id), false);
      generated.add(id);
    }
  });

  it("preserva lançamentos e planejamentos de outros anos ao salvar em modo ?year=YYYY", () => {
    const currentData = {
      expenses: [
        { id: "exp-2024", date: "2024-08-10", description: "Conta 2024", value: 120 },
        { id: "exp-2026-keep", date: "2026-01-15", description: "Luz", value: 200 },
        { id: "exp-2026-del", date: "2026-02-20", description: "Antiga 2026", value: 50 },
      ],
      annualPlanning: [
        { year: 2025, monthlyBudgets: [] },
        { year: 2026, monthlyBudgets: [{ month: 0, incomeBudget: 1000, expenseBudget: 500 }] },
      ],
    };

    const incoming = {
      expenses: [
        { id: "exp-2026-keep", date: "2026-01-15", description: "Luz atualizada", value: 215 },
        { id: "exp-2027-parcela", date: "2027-01-15", description: "Parcela", value: 100 },
      ],
      annualPlanning: [
        { year: 2026, monthlyBudgets: [{ month: 0, incomeBudget: 2000, expenseBudget: 700 }] },
      ],
    };

    const merged = mergeScopedYearUserData(currentData, incoming, 2026);
    assert.deepEqual(
      merged.expenses.map((e: any) => e.id).sort(),
      ["exp-2024", "exp-2026-keep", "exp-2027-parcela"]
    );
    assert.deepEqual(
      merged.annualPlanning.map((p: any) => p.year).sort(),
      [2025, 2026]
    );
    assert.equal(merged.annualPlanning.find((p: any) => p.year === 2026)?.monthlyBudgets[0].incomeBudget, 2000);
  });
});

describe("FinanFly Mercado Pago Webhook & Production Guard", () => {
  it("valida assinatura HMAC x-signature do Mercado Pago e bloqueia payload adulterado", async () => {
    const cryptoNode = await import("crypto");
    const secret = "mp-webhook-secret-test";
    const dataId = "123456789";
    const reqId = "req-abc-999";
    const ts = "1732480000";
    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const validHmac = cryptoNode.createHmac("sha256", secret).update(manifest).digest("hex");

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${validHmac}`,
      xRequestId: reqId,
      dataId,
      secret,
    });
    assert.equal(ok.valid, true);

    const tamperedId = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${validHmac}`,
      xRequestId: reqId,
      dataId: "999999999",
      secret,
    });
    assert.equal(tamperedId.valid, false);

    const missing = verifyMercadoPagoWebhookSignature({
      xSignature: undefined,
      xRequestId: reqId,
      dataId,
      secret,
    });
    assert.equal(missing.valid, false);
  });

  it("bloqueia simulação de pagamento quando token real está ativo ou em produção sem opt-in", () => {
    assert.equal(
      isPaymentSimulationAllowed({ hasRealToken: true, nodeEnv: "development", allowSimulationEnv: "true" }),
      false
    );
    assert.equal(
      isPaymentSimulationAllowed({ hasRealToken: false, nodeEnv: "production" }),
      false
    );
    assert.equal(
      isPaymentSimulationAllowed({ hasRealToken: false, nodeEnv: "production", allowSimulationEnv: "true" }),
      true
    );
    assert.equal(
      isPaymentSimulationAllowed({ hasRealToken: false, nodeEnv: "development" }),
      true
    );
    assert.equal(
      isPaymentSimulationAllowed({ hasRealToken: false, nodeEnv: "development", allowSimulationEnv: "false" }),
      false
    );
  });
});

describe("FinanFly Self-Service Password Reset Tokens", () => {
  it("gera token SHA-256 único, valida expiração/uso único e escapa HTML no e-mail", () => {
    const now = Date.parse("2026-11-24T12:00:00.000Z");
    const generated = generatePasswordResetToken(now);
    assert.ok(generated.rawToken.length >= 32);
    assert.equal(generated.tokenHash, hashPasswordResetToken(generated.rawToken));
    assert.ok(generated.settingKey.startsWith("password_reset:"));

    const activeRecord = {
      email: "usuario@example.com",
      expiresAt: generated.expiresAt,
      used: false,
      createdAt: new Date(now).toISOString(),
    };
    assert.equal(isPasswordResetTokenActive(activeRecord, now + 10 * 60 * 1000), true);
    assert.equal(isPasswordResetTokenActive(activeRecord, now + 31 * 60 * 1000), false);
    assert.equal(isPasswordResetTokenActive({ ...activeRecord, used: true }, now + 1000), false);

    const payload = buildPasswordResetEmailPayload({
      to: "usuario@example.com",
      userName: "<script>alert(1)</script>",
      resetUrl: "https://app.finanfly.test/?resetToken=abc",
      from: "FinanFly <onboarding@resend.dev>",
    });
    assert.equal(payload.html.includes("<script>"), false);
    assert.ok(payload.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  });
});

describe("FinanFly Health Monitor & 5xx Alert Telemetry", () => {
  it("contabiliza requisições e 5xx sem query string, respeita cooldown de alertas e monta payload /api/health", () => {
    const alerts: any[] = [];
    const monitor = new ServerHealthMonitor({
      alertCooldownMs: 60_000,
      onAlert: (ev) => alerts.push(ev),
    });

    monitor.recordRequest(200, "/api/user/data?year=2026", 1000);
    monitor.recordRequest(503, "/api/user/data?token=segredo", 2000);
    monitor.recordRequest(500, "/api/payment/webhook", 3000);
    monitor.recordMaintenanceRun(4, 4000);

    const snap = monitor.getSnapshot();
    assert.equal(snap.totalRequests, 3);
    assert.equal(snap.total5xx, 2);
    assert.equal(snap.last5xxPath, "/api/payment/webhook");
    assert.equal(snap.lastMaintenanceCleanedCount, 4);
    assert.equal(alerts.length, 1, "Cooldown deve evitar rajada de alertas repetidos");
    assert.equal(alerts[0].path, "/api/user/data");

    const health = buildHealthPayload({
      dbConnected: true,
      latencyMs: 12,
      usingServiceRole: true,
      jwtSecretConfigured: true,
      uptimeSeconds: 120,
      retentionYears: 3,
      trashDays: 3,
      backupDays: 3,
      monitorSnapshot: snap,
    });
    assert.equal(health.ok, true);
    assert.equal(health.status, "healthy");
    assert.equal(health.monitoring.total5xx, 2);
    assert.equal(health.retention.backupDays, 3);
  });
});

describe("FinanFly PT-BR Number Parsing & Local Date Formatting", () => {
  it("interpreta corretamente milhares e decimais PT-BR, formato US e entradas inválidas", () => {
    assert.equal(parsePtBrNumber("1.149,00"), 1149);
    assert.equal(parsePtBrNumber("1.250,50"), 1250.5);
    assert.equal(parsePtBrNumber("19,90"), 19.9);
    assert.equal(parsePtBrNumber("149.90"), 149.9);
    assert.equal(parsePtBrNumber("1.000"), 1000);
    assert.equal(parsePtBrNumber("R$ 2.500,75"), 2500.75);
    assert.equal(parsePtBrNumber(""), 0);
    assert.equal(parsePtBrNumber("invalido"), 0);
    assert.equal(parsePtBrNumber(Number.NaN), 0);
    assert.equal(formatPtBrCurrency(1149.5), "1.149,50");
    assert.equal(formatPtBrCurrency(0), "");
  });

  it("formata data local YYYY-MM-DD sem deslocar o dia pelo fuso UTC", () => {
    const localLateNight = new Date(2026, 10, 26, 23, 55, 0);
    assert.equal(getTodayLocalDateStr(localLateNight), "2026-11-26");
  });
});

import {
  isTransientSupabaseErrorText,
  createResilientSupabaseFetch,
} from "../src/server/supabaseResilience";

describe("FinanFly Supabase Gateway Clock-Skew & Transient Error Resilience", () => {
  it("reconhece e faz retry automático em 'JWT issued at future' sem mascarar chave inválida", async () => {
    assert.equal(isTransientSupabaseErrorText("JWT issued at future"), true);
    assert.equal(isTransientSupabaseErrorText("Invalid API key"), false);

    let attempts = 0;
    const retries: string[] = [];
    const flakyFetch: typeof fetch = async () => {
      attempts++;
      if (attempts < 3) {
        return new Response(
          JSON.stringify({ code: "PGRST301", message: "JWT issued at future" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify([{ email: "user@example.com" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const resilientFetch = createResilientSupabaseFetch({
      baseFetch: flakyFetch,
      retryDelaysMs: [1, 1],
      onRetry: (info) => retries.push(info.reason),
    });

    const okRes = await resilientFetch("https://example.supabase.co/rest/v1/users");
    assert.equal(okRes.status, 200);
    assert.equal(attempts, 3);
    assert.deepEqual(retries, ["JWT issued at future", "JWT issued at future"]);

    let permanentAttempts = 0;
    const badKeyFetch: typeof fetch = async () => {
      permanentAttempts++;
      return new Response(JSON.stringify({ message: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    };
    const resilientBadKeyFetch = createResilientSupabaseFetch({
      baseFetch: badKeyFetch,
      retryDelaysMs: [1, 1],
    });
    const badRes = await resilientBadKeyFetch("https://example.supabase.co/rest/v1/users");
    assert.equal(badRes.status, 401);
    assert.equal(permanentAttempts, 1, "Chave inválida permanente não deve ser retentada");
  });
});


