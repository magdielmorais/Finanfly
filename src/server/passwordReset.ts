import crypto from "crypto";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const PASSWORD_RESET_SETTING_PREFIX = "password_reset:";

export interface PasswordResetRecord {
  email: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
  usedAt?: string;
}

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(String(rawToken || "").trim()).digest("hex");
}

export function generatePasswordResetToken(nowMs: number = Date.now()): {
  rawToken: string;
  tokenHash: string;
  settingKey: string;
  expiresAt: string;
} {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashPasswordResetToken(rawToken);
  return {
    rawToken,
    tokenHash,
    settingKey: `${PASSWORD_RESET_SETTING_PREFIX}${tokenHash}`,
    expiresAt: new Date(nowMs + PASSWORD_RESET_TTL_MS).toISOString(),
  };
}

export function isPasswordResetTokenActive(
  record: unknown,
  nowMs: number = Date.now()
): record is PasswordResetRecord {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return false;
  }
  const r = record as Partial<PasswordResetRecord>;
  if (r.used === true) return false;
  if (typeof r.email !== "string" || !r.email.trim()) return false;
  if (typeof r.expiresAt !== "string") return false;
  const expMs = Date.parse(r.expiresAt);
  if (!Number.isFinite(expMs)) return false;
  return nowMs <= expMs;
}

export function escapeHtml(input: string): string {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPasswordResetEmailPayload(params: {
  to: string;
  userName: string;
  resetUrl: string;
  from: string;
}) {
  const safeName = escapeHtml(params.userName || "Usuário");
  const safeUrl = escapeHtml(params.resetUrl);
  const subject = "FinanFly - Redefinição de Senha";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 16px;">
      <h2 style="margin: 0 0 12px 0; color: #38bdf8;">FinanFly - Redefinição de Senha</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Olá, <strong>${safeName}</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Recebemos uma solicitação para criar uma nova senha para sua conta no FinanFly. Clique no botão abaixo para continuar (este link é válido por <strong>30 minutos</strong> e pode ser usado apenas uma vez):
      </p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 10px; font-size: 14px;">
          Criar Nova Senha
        </a>
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
        Se você não solicitou esta alteração, basta ignorar este e-mail — sua senha atual continuará protegida.
      </p>
    </div>
  `.trim();

  const text = [
    `Olá, ${params.userName || "Usuário"}!`,
    "",
    "Recebemos uma solicitação para redefinir sua senha no FinanFly.",
    "Acesse o link abaixo (válido por 30 minutos e de uso único):",
    params.resetUrl,
    "",
    "Se você não solicitou esta alteração, ignore este e-mail.",
  ].join("\n");

  return {
    from: params.from,
    to: [params.to],
    subject,
    html,
    text,
  };
}
