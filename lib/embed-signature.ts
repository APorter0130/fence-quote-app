import crypto from "crypto";

type EmbedSignatureInput = {
  contractor: string;
  expiresAtUnix: number;
};

function getSigningSecret() {
  return process.env.EMBED_SIGNING_SECRET?.trim() ?? "";
}

function normalizeContractor(contractor: string) {
  return contractor.trim().toLowerCase();
}

function signaturePayload(input: EmbedSignatureInput) {
  return `${normalizeContractor(input.contractor)}:${input.expiresAtUnix}`;
}

export function createEmbedSignature(input: EmbedSignatureInput) {
  const secret = getSigningSecret();

  if (!secret) {
    return "";
  }

  return crypto
    .createHmac("sha256", secret)
    .update(signaturePayload(input))
    .digest("hex");
}

export function verifyEmbedSignature(input: EmbedSignatureInput & { signature: string }) {
  const secret = getSigningSecret();

  if (!secret) {
    return false;
  }

  if (!input.signature || input.signature.length < 32) {
    return false;
  }

  if (!Number.isFinite(input.expiresAtUnix) || input.expiresAtUnix <= 0) {
    return false;
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (input.expiresAtUnix < nowUnix) {
    return false;
  }

  const expected = createEmbedSignature({
    contractor: input.contractor,
    expiresAtUnix: input.expiresAtUnix,
  });

  if (!expected) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
