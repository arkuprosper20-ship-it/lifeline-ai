// LIFELINE AI - Notification provider abstraction
//
// Twilio is OPTIONAL. The application ships without any SMS API credentials
// and works out of the box using device-SMS / phone-link fallbacks. When a
// real provider (Twilio) is configured server-side it is used instead.
//
// Providers: TwilioProvider, DeviceSMSProvider, PhoneProvider,
//            EmailProvider, WebhookProvider, DemoProvider
//
// Runtime config is fetched once from GET /api/notify and stored in
// LIFELINE AI - 
import { createLocationLink } from "./location.js";

export const NOTIFICATION_STATUS = {
  NOT_CONFIGURED: "NOT CONFIGURED",
  READY: "READY",
  WAITING: "WAITING FOR CONFIRMATION",
  SENDING: "SENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  SIMULATED: "SIMULATED",
  UNAVAILABLE: "UNAVAILABLE",
  OFFLINE: "OFFLINE",
  QUEUED: "QUEUED",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
};

// Server-side providers that require a network connection.
// Device SMS / phone links are handled entirely on the client and work offline.
export const ONLINE_PROVIDERS = { twilio: true, email: true, webhook: true };

export function providerRequiresOnline(provider) {
  return Boolean(ONLINE_PROVIDERS[provider]);
}

export const PROVIDER_LABELS = {
  "device-sms": "Device SMS",
  phone: "Phone link",
  email: "Email",
  webhook: "Webhook",
  twilio: "Twilio SMS",
  demo: "Demo",
  none: "Not configured",
};

// Provider priority (see spec section 3):
//   Twilio -> Device SMS -> Phone -> Email -> Webhook -> Copy/manual
export function selectProvider(config, contact, isDemo) {
  if (isDemo) {
    return { provider: "demo", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS.demo };
  }

  var twilio = config && config.twilioConfigured;
  var hasPhone = !!(contact && contact.phone);
  var hasSMS = twilio && hasPhone && contact.sms !== false;
  var hasCall = hasPhone && contact.call;
  var hasEmail = !!(contact && contact.email);
  var hasWebhook = !!(contact && contact.webhook);

  if (twilio && hasPhone && (contact.sms !== false)) {
    return { provider: "twilio", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS.twilio };
  }
  if (hasPhone && contact.sms !== false) {
    return { provider: "device-sms", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS["device-sms"] };
  }
  if (hasPhone && contact.call) {
    return { provider: "phone", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS.phone };
  }
  if (hasEmail && (config && config.emailConfigured)) {
    return { provider: "email", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS.email };
  }
  if (hasWebhook && (config && config.webhookConfigured)) {
    return { provider: "webhook", status: NOTIFICATION_STATUS.READY, label: PROVIDER_LABELS.webhook };
  }

  return { provider: "none", status: NOTIFICATION_STATUS.NOT_CONFIGURED, label: PROVIDER_LABELS.none };
}

function formatTimestamp(time) {
  try {
    return new Date(time).toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

// Build the full, shareable incident message (spec section 4)
export function buildFullMessage(pkg) {
  var lines = [
    "LIFELINE INCIDENT",
    "",
    "Incident ID:",
    pkg.incidentId || "",
    "",
    "Category:",
    pkg.typeLabel || pkg.type || "Unknown",
    "",
    "Urgency:",
    (pkg.urgency || "N/A").toUpperCase(),
    "",
    "Summary:",
    pkg.summary || "See incident brief for details.",
    "",
  ];

  if (pkg.location && pkg.location.latitude !== undefined && pkg.location.longitude !== undefined) {
    lines.push("Location:");
    lines.push(createLocationLink(pkg.location.latitude, pkg.location.longitude));
    if (pkg.location.accuracy != null) {
      lines.push("Accuracy: \u00b1" + Math.round(pkg.location.accuracy) + "m");
    }
    lines.push("");
  } else if (pkg.location && pkg.location.description) {
    lines.push("Location:");
    lines.push(pkg.location.description);
    lines.push("");
  }

  if (pkg.observations && pkg.observations.length) {
    lines.push("Observations:");
    pkg.observations.forEach(function (o) {
      var label = typeof o === "string" ? o : o.label || JSON.stringify(o);
      lines.push("- " + label);
    });
    lines.push("");
  }

  lines.push("Timestamp:");
  lines.push(pkg.time || formatTimestamp(null));
  lines.push("");
  lines.push("This information was generated from a community report and has not been independently verified.");
  return lines.join("\n");
}

// Compact SMS message (length-safe for carriers)
export function buildSMSMessage(pkg) {
  var parts = ["LIFELINE " + (pkg.incidentId || "")];
  if (pkg.typeLabel) parts.push(pkg.typeLabel);
  if (pkg.mapLink) parts.push("Location: " + pkg.mapLink);
  var obs = pkg.observations || [];
  if (obs.length) {
    var first = (typeof obs[0] === "string" ? obs[0] : obs[0].label).slice(0, 120);
    parts.push("\n" + first);
  }
  parts.push("\nNeeds verification.");
  var msg = parts.join(" ");
  return msg.length > 1500 ? msg.slice(0, 1497) + "..." : msg;
}

export function buildDeviceSMSLink(contact, pkg) {
  var phone = (contact && contact.phone ? contact.phone : "").replace(/^tel:/, "").replace(/[\s-]/g, "");
  var message = buildFullMessage(pkg);
  var encoded = encodeURIComponent(message);
  return "sms:" + phone + "?body=" + encoded;
}

export function buildPhoneLink(contact) {
  var phone = (contact && contact.phone ? contact.phone : "").replace(/^tel:/, "").trim();
  return "tel:" + phone;
}

export function buildLocationLink(pkg) {
  if (pkg.location && pkg.location.latitude !== undefined && pkg.location.longitude !== undefined) {
    return createLocationLink(pkg.location.latitude, pkg.location.longitude);
  }
  return pkg.mapLink || null;
}

export function buildCopyableMessage(pkg) {
  return buildFullMessage(pkg);
}

export function buildNotificationObject(pkg, contact, provider, status) {
  var obj = {
    incidentId: pkg.incidentId,
    category: pkg.type,
    categoryLabel: pkg.typeLabel || "",
    urgency: pkg.urgency || null,
    summary: pkg.summary || "",
    timestamp: pkg.time || new Date().toISOString(),
    latitude: pkg.location && pkg.location.latitude != null ? pkg.location.latitude : null,
    longitude: pkg.location && pkg.location.longitude != null ? pkg.location.longitude : null,
    accuracy: pkg.location && pkg.location.accuracy != null ? pkg.location.accuracy : null,
    locationUrl: buildLocationLink(pkg) || null,
    recipient: (contact && contact.name) || "Unknown",
    provider: provider || "device-sms",
    status: status || NOTIFICATION_STATUS.READY,
  };
  return obj;
}

export function getDemoNotification(pkg, contact) {
  return {
    incidentId: pkg.incidentId,
    category: pkg.type,
    categoryLabel: pkg.typeLabel || pkg.type || "Unknown",
    urgency: pkg.urgency || null,
    summary: pkg.summary || "",
    timestamp: pkg.time || new Date().toISOString(),
    latitude: pkg.location && pkg.location.latitude != null ? pkg.location.latitude : null,
    longitude: pkg.location && pkg.location.longitude != null ? pkg.location.longitude : null,
    accuracy: pkg.location && pkg.location.accuracy != null ? pkg.location.accuracy : null,
    locationUrl: buildLocationLink(pkg) || null,
    recipient: "Demo Response Team",
    provider: "demo",
    status: NOTIFICATION_STATUS.SIMULATED,
    message: "Demo notification - no real message was sent.",
  };
}

export function renderStatusBadge(status) {
  var map = {};
  map[NOTIFICATION_STATUS.READY] = "badge-ready";
  map[NOTIFICATION_STATUS.SENDING] = "badge-warning";
  map[NOTIFICATION_STATUS.SENT] = "badge-ready";
  map[NOTIFICATION_STATUS.DELIVERED] = "badge-ready";
  map[NOTIFICATION_STATUS.FAILED] = "badge-immediate";
  map[NOTIFICATION_STATUS.SIMULATED] = "badge-warning";
  map[NOTIFICATION_STATUS.NOT_CONFIGURED] = "badge-monitor";
  map[NOTIFICATION_STATUS.WAITING] = "badge-verify";
  map[NOTIFICATION_STATUS.CANCELLED] = "badge-gray";
  map[NOTIFICATION_STATUS.UNAVAILABLE] = "badge-gray";
  return '<span class="badge ' + (map[status] || "badge-gray") + '">' + status + "</span>";
}

// Fetch the (secret-free) provider config from the backend.
// Falls back to a local-only configuration when the API is unreachable,
// so Twilio is never required for the app to run.
export async function fetchProviderConfig() {
  try {
    var res = await fetch("/api/notify", { cache: "no-store" });
    if (!res.ok) throw new Error("config fetch failed");
    var data = await res.json();
    return {
      smsProvider: data.smsProvider || "device-sms",
      twilioConfigured: !!data.twilioConfigured,
      emailConfigured: !!data.emailConfigured,
      webhookConfigured: !!data.webhookConfigured,
      configured: !!data.configured,
    };
  } catch (e) {
    console.warn("[LIFELINE] Could not reach notification config endpoint; using local fallback.", e && e.message);
    return {
      smsProvider: "device-sms",
      twilioConfigured: false,
      emailConfigured: false,
      webhookConfigured: false,
      configured: false,
    };
  }
}

