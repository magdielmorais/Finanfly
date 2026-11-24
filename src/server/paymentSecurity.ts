import crypto from "crypto";

export interface WebhookSignatureCheckInput {
  xSignature?: string | string[] | null;
  xRequestId?: string | string[] | null;
  dataId?: string | number | null;
  secret?: string | null;
}

export interface WebhookSignatureCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Valida a assinatura HMAC-SHA256 oficial (`x-signature`) enviada pelos webhooks do Mercado Pago.
 * Formato esperado de `x-signature`: `ts=<timestamp>,v1=<hmac_hex>`
 * Manifest oficial: `[id:<dataId>;][request-id:<xRequestId>;]ts:<ts>;`
 */
export function verifyMercadoPagoWebhookSignature(
  input: WebhookSignatureCheckInput
): WebhookSignatureCheckResult {
  const secret = String(input.secret || "").trim();
  if (!secret) {
    return { valid: false, reason: "missing_secret" };
  }

  const rawSig = Array.isArray(input.xSignature) ? input.xSignature[0] : input.xSignature;
  if (!rawSig || typeof rawSig !== "string") {
    return { valid: false, reason: "missing_x_signature" };
  }

  let ts = "";
  let v1 = "";
  for (const part of rawSig.split(",")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const val = part.slice(eqIdx + 1).trim();
    if (key === "ts") ts = val;
    if (key === "v1") v1 = val.toLowerCase();
  }

  if (!ts || !v1 || !/^[a-f0-9]{64}$/.test(v1)) {
    return { valid: false, reason: "malformed_x_signature" };
  }

  const rawReqId = Array.isArray(input.xRequestId) ? input.xRequestId[0] : input.xRequestId;
  const reqId = typeof rawReqId === "string" ? rawReqId.trim() : "";
  const dataId =
    input.dataId !== undefined && input.dataId !== null ? String(input.dataId).trim().toLowerCase() : "";

  let manifest = "";
  if (dataId) {
    manifest += `id:${dataId};`;
  }
  if (reqId) {
    manifest += `request-id:${reqId};`;
  }
  manifest += `ts:${ts};`;

  const expectedHex = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const actualBuf = Buffer.from(v1, "hex");
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (actualBuf.length !== expectedBuf.length) {
      return { valid: false, reason: "signature_mismatch" };
    }
    const matches = crypto.timingSafeEqual(actualBuf, expectedBuf);
    return matches ? { valid: true } : { valid: false, reason: "signature_mismatch" };
  } catch {
    return { valid: false, reason: "signature_mismatch" };
  }
}

export function isPaymentSimulationAllowed(params: {
  hasRealToken: boolean;
  nodeEnv?: string;
  allowSimulationEnv?: string;
}): boolean {
  if (params.hasRealToken) {
    return false;
  }
  const flag = String(params.allowSimulationEnv || "").trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") {
    return false;
  }
  if (flag === "true" || flag === "1" || flag === "yes") {
    return true;
  }
  return String(params.nodeEnv || "").trim().toLowerCase() !== "production";
}
