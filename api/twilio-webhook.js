// LIFELINE AI — Twilio Status Callback Webhook
// Receives delivery receipts and updates incident status
// Configure in Twilio Console: Messaging > Settings > Status Callback URL

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["localhost", "127.0.0.1"];

function getOriginAllowed(req) {
  if (process.env.NODE_ENV !== "production") return true;
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const maxSize = 1024 * 1024;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxSize) {
        reject(Object.assign(new Error("Request too large."), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) resolve({});
      else {
        try {
          const contentType = req.headers?.["content-type"] || "";
          if (contentType.includes("application/x-www-form-urlencoded")) {
            const body = Buffer.concat(chunks).toString("utf8");
            const params = new URLSearchParams(body);
            const obj = {};
            for (const [k, v] of params) obj[k] = v;
            resolve(obj);
          } else {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          }
        } catch {
          reject(Object.assign(new Error("Invalid body."), { status: 400 }));
        }
      }
    });
    req.on("error", reject);
  });
}

const TWILIO_STATUS_MAP = {
  queued: "QUEUED",
  sending: "SENDING",
  sent: "SENT",
  delivered: "DELIVERED",
  undelivered: "FAILED",
  failed: "FAILED",
  "read": "DELIVERED",
};

module.exports = async function handler(req, res) {
  if (!getOriginAllowed(req)) {
    return sendJson(res, 403, { error: "Origin not allowed.", code: "origin_denied" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed.", code: "method_not_allowed" });
  }

  try {
    const body = await getBody(req);
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      To,
      From,
      ApiVersion,
      AccountSid,
    } = body;

    if (!MessageSid || !MessageStatus) {
      return sendJson(res, 400, { error: "Missing required fields.", code: "invalid_request" });
    }

    console.log("[LIFELINE] Twilio webhook:", { MessageSid, MessageStatus, ErrorCode, To });

    const mappedStatus = TWILIO_STATUS_MAP[MessageStatus] || MessageStatus.toUpperCase();

    const result = {
      success: true,
      messageId: MessageSid,
      status: mappedStatus,
      delivered: ["DELIVERED", "READ"].includes(mappedStatus),
      to: To,
      from: From,
      errorCode: ErrorCode || null,
      errorMessage: ErrorMessage || null,
      timestamp: new Date().toISOString(),
    };

    // In production, this would update the incident in your database
    // For now, we log and return success so Twilio knows we received it
    // The frontend polls /api/notify GET for config and can fetch status via a new endpoint

    return sendJson(res, 200, result);
  } catch (error) {
    console.error("[LIFELINE] Twilio webhook error:", error);
    return sendJson(res, 502, {
      error: error.message || "Webhook failed.",
      code: "webhook_failed",
    });
  }
};