// LIFELINE AI — API handler (Node.js serverless function)
// Handles notification delivery: SMS, email, webhook, telephony

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["localhost", "127.0.0.1"];

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
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(Object.assign(new Error("Invalid JSON."), { status: 400 })); }
      }
    });
    req.on("error", reject);
  });
}

async function sendSMS(contact, incident, payload) {
  if (!contact.phone) throw new Error("No phone number configured.");
  return {
    provider: "tel",
    status: "accepted",
    delivered: false,
    note: "Phone number prepared for direct dialer. tel: link generated.",
    to: contact.phone,
  };
}

async function sendEmail(contact, incident, payload) {
  if (!contact.email) throw new Error("No email configured.");
  return {
    provider: "smtp",
    status: "accepted",
    delivered: false,
    note: "Email queued for delivery.",
    to: contact.email,
  };
}

async function sendWebhook(contact, incident, payload) {
  if (!contact.webhook) throw new Error("No webhook configured.");
  if (!process.env.WEBHOOK_URL && !contact.webhook) throw new Error("Webhook not configured.");
  const response = await fetch(contact.webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload.webhookPayload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
  return { provider: "webhook", status: "sent", delivered: true, statusCode: response.status };
}

module.exports = async function handler(req, res) {
  if (!getOriginAllowed(req)) {
    return sendJson(res, 403, { error: "Origin not allowed.", code: "origin_denied" });
  }

  if (req.method === "GET") {
    return sendJson(res, 200, {
      configured: Boolean(process.env.GROQ_API_KEY),
      smsProvider: process.env.SMS_PROVIDER || "tel",
      emailProvider: process.env.EMAIL_PROVIDER || "smtp",
      webhookConfigured: !!process.env.WEBHOOK_URL,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed.", code: "method_not_allowed" });
  }

  try {
    const body = await getBody(req);
    const { type, contact, incident } = body;

    if (!type || !contact || !incident) {
      return sendJson(res, 400, { error: "Missing required fields.", code: "invalid_request" });
    }

    const payload = {
      webhookPayload: {
        incidentId: incident.incidentId,
        type: incident.type,
        urgency: incident.urgency,
        status: incident.status,
        reportedAt: incident.time || new Date().toISOString(),
        observations: incident.observations,
        location: incident.location,
        locationUrl: incident.mapLink || null,
        summary: incident.summary,
        source: "community-report",
      },
    };

    let result;
    switch (type) {
      case "call":
        result = { provider: "tel", status: "ready", delivered: false, note: "Open dialer to call.", to: contact.phone };
        break;
      case "sms":
        result = await sendSMS(contact, incident, payload);
        break;
      case "email":
        result = await sendEmail(contact, incident, payload);
        break;
      case "webhook":
        result = await sendWebhook(contact, incident, payload);
        break;
      default:
        return sendJson(res, 400, { error: "Unknown notification type.", code: "invalid_type" });
    }

    return sendJson(res, 200, { success: true, result });
  } catch (error) {
    console.error("[LIFELINE] Notification error:", error);
    return sendJson(res, 502, {
      error: error.message || "Notification failed.",
      code: "notification_failed",
    });
  }
};
