import crypto from "crypto";

export function verifyGitHubSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expected = `sha256=${digest}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
