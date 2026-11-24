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
  TRASH_RETENTION_DAYS,
  RETENTION_YEARS,
} from "../src/server/retention";
import { detectSingleGranularMutation } from "../src/utils/dataDiff";

describe("FinanFly Schema Safety & Performance Catalog", () => {
  it("contém 25 tabelas incluindo audit_logs, trash_items e índices compostos", () => {
    const names = DATABASE_SCHEMA_CATALOG.map((t) => t.name);
    assert.equal(DATABASE_SCHEMA_CATALOG.length, 25);
    assert.ok(names.includes("audit_logs"), "audit_logs deve constar no catálogo");
    assert.ok(names.includes("trash_items"), "trash_items deve constar no catálogo");

    const existing = new Set(names.filter((n) => n !== "audit_logs" && n !== "trash_items"));
    const scripts = generateSafeSchemaScripts(existing, ["audit_logs", "trash_items"]);

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
    assert.ok(scripts.rlsHardeningSql.includes('CREATE POLICY "Restrito service_role - trash_items"'));
  });
});

describe("FinanFly 3-Year Data Retention & 3-Day Trash Restore Window", () => {
  it("mantém apenas dados dos últimos 3 anos e sobrescreve/remove registros mais antigos", () => {
    assert.equal(RETENTION_YEARS, 3);
    assert.equal(TRASH_RETENTION_DAYS, 3);

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

  it("permite restaurar itens da lixeira somente nos últimos 3 dias (72 horas)", () => {
    const now = new Date("2026-11-24T12:00:00.000Z");
    const withinWindow = new Date(now.getTime() - 70 * 60 * 60 * 1000).toISOString(); // 70h atrás
    const exactLimit = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(); // 72h exatas
    const expired = new Date(now.getTime() - 73 * 60 * 60 * 1000).toISOString(); // 73h atrás (> 3 dias)

    assert.equal(isWithinTrashRestoreWindow(withinWindow, now), true);
    assert.equal(isWithinTrashRestoreWindow(exactLimit, now), true);
    assert.equal(isWithinTrashRestoreWindow(expired, now), false);
    assert.equal(isWithinTrashRestoreWindow("data-invalida", now), false);
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
