// ============================================================
// QR Service – generates time-limited QR codes for attendance
// ============================================================

import crypto from "crypto";
import QRCode from "qrcode";

// --------------------------------------------------
// makeQr – Creates a QR code for a given session
// 1. Generates a cryptographically random 48-char hex token
// 2. Sets expiry to 5 minutes from now
// 3. Encodes { sessionId, token } as JSON in the QR image
// 4. Returns: { token, expiresAt, dataUrl (base64 PNG) }
// --------------------------------------------------
export async function makeQr(sessionId) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const payload = JSON.stringify({ sessionId, token });
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { token, expiresAt, dataUrl };
}
