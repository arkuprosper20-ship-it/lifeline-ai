// LIFELINE AI - Notification API handler
// Handles notification delivery: SMS, email, webhook, telephony
//
// IMPORTANT: Twilio is OPTIONAL. The function loads the Twilio SDK lazily
// (only when configured AND installed) and never crashes if it is absent.
// Credentials are never sent to the frontend and never imported there.

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
    const maxSize = 2 * 1024 * 1024;
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

// ---------------------------------------------------------------------------
// Configuration state (no secrets exposed to clients)
// ---------------------------------------------------------------------------

var STATUS = {
  NOT_CONFIGURED: "NOT CONFIGURED",
  READY: "READY",
  SENDING: "SENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  SIMULATED: "SIMULATED",
  UNAVAILABLE: "UNAVAILABLE",
};

function isTwilioConfigured() {
  return Boolean(
    process.env.SMS_PROVIDER === "twilio" &&
      process.env.SMS_ACCOUNT_SID &&
      process.env.SMS_AUTH_TOKEN &&
      process.env.SMS_FROM
  );
}

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_PROVIDER && process.env.EMAIL_FROM_ADDRESS);
}

function isWebhookConfigured() {
  return Boolean(process.env.WEBHOOK_URL);
}

// ---------------------------------------------------------------------------
// Twilio provider (lazy + optional)
// ---------------------------------------------------------------------------

var _twilioChecked = false;
var _twilioAvailable = false;
var _twilioClient = null;

function loadTwilio() {
  if (_twilioChecked) return _twilioAvailable ? _twilioClient : null;
  _twilioChecked = true;
  if (!isTwilioConfigured()) return null;
  try {
    var twilio = require("twilio");
    _twilioClient = twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
    _twilioAvailable = !!_twilioClient;
  } catch (e) {
    console.warn("[LIFELINE] Twilio SDK not installed; falling back to device SMS.");
    _twilioAvailable = false;
  }
  return _twilioAvailable ? _twilioClient : null;
}

function classifyTwilioError(error) {
  var code = error.code;
  var status = error.status || error.statusCode || null;
  if (status === 401 || /authenticat/i.test(error.message || "")) {
    return { status: STATUS.FAILED, code: "auth_failed", message: "Twilio authentication failed." };
  }
  if (status === 429 || code === 34003) {
    return { status: STATUS.FAILED, code: "rate_limited", message: "Twilio rate limit reached." };
  }
  if (code === 21211 || code === 21614 || status === 400) {
    return { status: STATUS.FAILED, code: "invalid_destination", message: "Invalid destination phone number." };
  }
  if (code === 21610 || code === 21611) {
    return { status: STATUS.FAILED, code: "unreachable_destination", message: "SMS cannot be delivered to this destination." };
  }
  if (!status) {
    return { status: STATUS.FAILED, code: "network_failure", message: "Network failure contacting Twilio." };
  }
  return { status: STATUS.FAILED, code: "provider_error", message: error.message || "Twilio request failed." };
}

async function sendTwilioSMS(contact, pkg) {
  var client = loadTwilio();
  if (!client) {
    return {
      provider: "device-sms",
      status: STATUS.NOT_CONFIGURED,
      delivered: false,
      ready: false,
      note: "Twilio is not configured server-side. Use your device SMS composer.",
      to: contact.phone || null,
    };
  }
  var to = (contact.phone || "").replace(/^tel:/, "").replace(/[\s-]/g, "");
  if (!to) {
    return { provider: "twilio", status: STATUS.FAILED, delivered: false, code: "invalid_destination", message: "No phone number configured." };
  }
  var body = pkg.smsMessage || pkg.textMessage || "";
  var message;
  try {
    var statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL || (process.env.BASE_URL ? process.env.BASE_URL + "/api/twilio-webhook" : null);
    var createOpts = {
      from: process.env.SMS_FROM,
      to: to,
      body: body,
    };
    if (statusCallback) createOpts.statusCallback = statusCallback;
    message = await client.messages.create(createOpts);
  } catch (error) {
    var classified = classifyTwilioError(error);
    return {
      provider: "twilio",
      status: classified.status,
      delivered: false,
      code: classified.code,
      message: classified.message,
      to: to,
    };
  }
  return {
    provider: "twilio",
    status: STATUS.SENT,
    delivered: false,
    messageId: message.sid,
    note: "Message accepted by Twilio. Delivery confirmation via status webhook.",
    to: to,
  };
}

// ---------------------------------------------------------------------------
// Provider handlers
// ---------------------------------------------------------------------------

async function sendSMS(contact, pkg) {
  var phone = (contact.phone || "").replace(/^tel:/, "").trim();
  if (!phone) {
    return { provider: "device-sms", status: STATUS.FAILED, delivered: false, message: "No phone number configured." };
  }
  if (isTwilioConfigured()) {
    return sendTwilioSMS(contact, pkg);
  }
  return {
    provider: "device-sms",
    status: STATUS.READY,
    delivered: false,
    ready: true,
    note: "Open your device SMS composer. Delivery is handled by your carrier.",
    to: phone,
  };
}

async function sendEmail(contact, pkg) {
  if (!contact.email) {
    return { provider: "email", status: STATUS.FAILED, delivered: false, message: "No email configured." };
  }
  if (isEmailConfigured()) {
    return {
      provider: "email",
      status: STATUS.FAILED,
      delivered: false,
      code: "not_implemented",
      message: "Server-side email provider is configured but not wired. Use a webhook or deploy the SES transport.",
      to: contact.email,
    };
  }
  return {
    provider: "email",
    status: STATUS.NOT_CONFIGURED,
    delivered: false,
    note: "No email provider configured server-side.",
    to: contact.email,
  };
}

async function sendWebhook(contact, pkg) {
  var url = contact.webhook || process.env.WEBHOOK_URL;
  if (!url) {
    return { provider: "webhook", status: STATUS.FAILED, delivered: false, message: "No webhook configured." };
  }
  try {
    var response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pkg.webhookPayload),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return { provider: "webhook", status: STATUS.FAILED, delivered: false, code: "http_error", statusCode: response.status, message: "Webhook returned " + response.status };
    }
    var data = {};
    try {
      data = await response.json();
    } catch {
      // treat as accepted
    }
    return {
      provider: "webhook",
      status: STATUS.SENT,
      delivered: true,
      statusCode: response.status,
      response: data,
      to: url,
    };
  } catch (error) {
    return {
      provider: "webhook",
      status: STATUS.FAILED,
      delivered: false,
      code: "network_failure",
      message: error.message || "Webhook request failed.",
      to: url,
    };
  }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

module.exports = async function handler(req, res) {
  if (!getOriginAllowed(req)) {
    return sendJson(res, 403, { error: "Origin not allowed.", code: "origin_denied" });
  }

  if (req.method === "GET") {
    var twilioOk = isTwilioConfigured();
    return sendJson(res, 200, {
      configured: twilioOk || isEmailConfigured() || isWebhookConfigured(),
      smsProvider: twilioOk ? "twilio" : "device-sms",
      twilioConfigured: twilioOk,
      twilioAvailable: twilioOk,
      emailConfigured: isEmailConfigured(),
      webhookConfigured: isWebhookConfigured(),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed.", code: "method_not_allowed" });
  }

  try {
    var body = await getBody(req);
    var type = body.type;
    var contact = body.contact;
    var incident = body.incident;

    if (!type || !contact || !incident) {
      return sendJson(res, 400, { error: "Missing required fields.", code: "invalid_request" });
    }

    var result;
    switch (type) {
      case "call":
        result = { provider: "phone", status: STATUS.READY, delivered: false, note: "Open your device dialer to place the call. Call status is handled by your device.", to: contact.phone || null };
        break;
      case "sms":
        result = await sendSMS(contact, incident);
        break;
      case "email":
        result = await sendEmail(contact, incident);
        break;
      case "webhook":
        result = await sendWebhook(contact, incident);
        break;
      default:
        return sendJson(res, 400, { error: "Unknown notification type.", code: "invalid_type" });
    }

    var ok = result.status === STATUS.SENT || result.status === STATUS.DELIVERED || result.status === STATUS.READY || result.status === STATUS.NOT_CONFIGURED;
    return sendJson(res, 200, { success: true, result: result, ok: ok });
  } catch (error) {
    console.error("[LIFELINE] Notification error:", error);
    return sendJson(res, 502, {
      error: error.message || "Notification failed.",
      code: "notification_failed",
    });
  }
};
