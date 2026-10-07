// LIFELINE AI - Message delivery status API
// Fetches delivery status for a specific message ID
// Used by frontend to poll for Twilio delivery receipts

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
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(Object.assign(new Error("Invalid JSON."), { status: 400 }));
        }
      }
    });
    req.on("error", reject);
  });
}

var _twilioChecked = false;
var _twilioAvailable = false;
var _twilioClient = null;

function isTwilioConfigured() {
  return Boolean(
    process.env.SMS_PROVIDER === "twilio" &&
      process.env.SMS_ACCOUNT_SID &&
      process.env.SMS_AUTH_TOKEN &&
      process.env.SMS_FROM
  );
}

function loadTwilio() {
  if (_twilioChecked) return _twilioAvailable ? _twilioClient : null;
  _twilioChecked = true;
  if (!isTwilioConfigured()) return null;
  try {
    var twilio = require("twilio");
    _twilioClient = twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
    _twilioAvailable = !!_twilioClient;
  } catch (e) {
    console.warn("[LIFELINE] Twilio SDK not installed; status fetch unavailable.");
    _twilioAvailable = false;
  }
  return _twilioAvailable ? _twilioClient : null;
}

const STATUS_MAP = {
  queued: "QUEUED",
  sending: "SENDING",
  sent: "SENT",
  delivered: "DELIVERED",
  undelivered: "FAILED",
  failed: "FAILED",
  read: "DELIVERED",
};

module.exports = async function handler(req, res) {
  if (!getOriginAllowed(req)) {
    return sendJson(res, 403, { error: "Origin not allowed.", code: "origin_denied" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed.", code: "method_not_allowed" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const messageId = url.searchParams.get("messageId") || url.pathname.split("/").pop();

  if (!messageId || messageId === "message-status") {
    return sendJson(res, 400, { error: "Missing messageId parameter.", code: "invalid_request" });
  }

  if (!isTwilioConfigured()) {
    return sendJson(res, 503, {
      error: "Twilio not configured.",
      code: "not_configured",
    });
  }

  try {
    var client = loadTwilio();
    if (!client) {
      return sendJson(res, 503, {
        error: "Twilio SDK not available.",
        code: "sdk_unavailable",
      });
    }

    var message = await client.messages(messageId).fetch();

    return sendJson(res, 200, {
      success: true,
      messageId: message.sid,
      status: STATUS_MAP[message.status] || message.status.toUpperCase(),
      delivered: ["delivered", "read"].includes(message.status),
      to: message.to,
      from: message.from,
      errorCode: message.errorCode || null,
      errorMessage: message.errorMessage || null,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      dateSent: message.dateSent,
      price: message.price,
      priceUnit: message.priceUnit,
      direction: message.direction,
    });
  } catch (error) {
    if (error.code === 20404) {
      return sendJson(res, 404, { error: "Message not found.", code: "not_found" });
    }
    console.error("[LIFELINE] Message status fetch error:", error);
    return sendJson(res, 502, {
      error: error.message || "Status fetch failed.",
      code: "status_failed",
    });
  }
};