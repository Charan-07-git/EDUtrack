import crypto from "crypto";
import QRCode from "qrcode";

export async function makeQr(sessionId) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const payload = JSON.stringify({ sessionId, token });
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { token, expiresAt, dataUrl };
}
