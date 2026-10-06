// LIFELINE AI — Confirmation screen
import { getState, store } from "../store.js";
import { getRecommendedContact, buildIncidentPackage } from "../contacts.js";
import { getRecommendedEmergencyContact } from "../emergency-contacts.js";
import { esc, showToast } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";
import {
  NOTIFICATION_STATUS,
  selectProvider,
  buildFullMessage,
  buildDeviceSMSLink,
  buildPhoneLink,
  buildLocationLink,
  buildCopyableMessage,
  buildNotificationObject,
  fetchProviderConfig,
  providerRequiresOnline,
} from "../notification-providers.js";
import { enqueueNotification, readNotifications } from "../sync.js";

export function initConfirmScreen(params = {}) {
  const state = getState();
  const incident = params.incidentId
    ? state.incidents.find((i) => i.id === params.incidentId)
    : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find((t) => t.id === incident.type) || { label: "Unknown", icon: "❓", color: "type-other" };
  const countryCode = state.settings.countryCode || "US";
  const emergencyContact = getRecommendedEmergencyContact(incident.type, countryCode);
  const contact = state.contacts.find((c) => c.id === (state.ui.selectedContact || params.contact))
    || getRecommendedContact(incident.type)
    || { id: emergencyContact?.category, name: emergencyContact?.name || "Emergency Services", phone: emergencyContact?.phone, email: "", category: emergencyContact?.category || "general", enabled: true, sms: emergencyContact?.sms || false, call: emergencyContact?.call || true, description: emergencyContact?.description || "Emergency response services" };
  const pkg = buildIncidentPackage(incident);
  const config = state.notificationConfig || { smsProvider: "device-sms", twilioConfigured: false, emailConfigured: false, webhookConfigured: false, configured: false };
  const isDemo = state.demoMode;
  const provider = selectProvider(config, contact, isDemo);

  const providerNote = getProviderNote(provider, config);

  return `
    <div class="confirm-screen">
      <div class="card">
        <h2>Ready to send</h2>
        <p class="mu">Review exactly what will be shared with the response contact.</p>
      </div>

      <div class="card">
        <h3>Recipient</h3>
        <p><b>${esc(contact?.name || "Not configured")}</b></p>
        <p class="mu">${esc(contact?.description || "")}</p>
        ${contact?.enabled === false ? `<div class="warning-note">This contact is not enabled. Configure it in Settings.</div>` : ""}
      </div>

      <div class="card">
        <h3>Method</h3>
        <div class="btn-row">
          <span class="tag tag-gray">${esc(provider.label)}</span>
          ${provider.provider === "demo" ? '<span class="tag tag-gray">SIMULATED</span>' : ""}
        </div>
        <p class="mu text-small" style="margin-top:8px;">${providerNote}</p>
      </div>

      <div class="card">
        <h3>Information to be shared</h3>
        <ul style="list-style:none; padding-left:0;">
          <li style="padding:4px 0;">✓ Incident summary</li>
          <li style="padding:4px 0;">✓ Category: ${esc(typeInfo.label)}</li>
          <li style="padding:4px 0;">✓ Urgency: ${esc((incident.urgency || "urgent").toUpperCase())}</li>
          <li style="padding:4px 0;">✓ Location</li>
          <li style="padding:4px 0;">✓ Location accuracy</li>
          <li style="padding:4px 0;">✓ Map link</li>
          <li style="padding:4px 0;">✓ Timestamp</li>
        </ul>
      </div>

      <div class="card">
        <h3>Incident</h3>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:20px;">${typeInfo.icon}</span>
          <span style="font-size:16px; font-weight:600;">${esc(typeInfo.label)}</span>
        </div>
        <span class="badge ${getUrgencyBadge(incident.urgency || "urgent")}">${esc((incident.urgency || "URGENT").toUpperCase())}</span>

        <h4 style="margin-top:12px;">Incident ID</h4>
        <p class="text-small">${esc(incident.id)}</p>

        <h4>Observations</h4>
        ${incident.observations?.length ? `
          <ul style="list-style:none; padding-left:0;">
            ${incident.observations.map((o) => `<li style="padding:4px 0;">✓ ${esc(o)}</li>`).join("")}
          </ul>
        ` : '<p class="mu">No observations.</p>'}
      </div>

      <div class="card">
        <h3>Location</h3>
        ${incident.location && incident.location.latitude !== undefined ? `
          <p><b>Latitude:</b> ${incident.location.latitude.toFixed(6)}</p>
          <p><b>Longitude:</b> ${incident.location.longitude.toFixed(6)}</p>
          <p><b>Accuracy:</b> ${incident.location.accuracy ? `±${Math.round(incident.location.accuracy)}m` : "Unknown"}</p>
          <p><b>Type:</b> ${esc(incident.location.sourceLabel || incident.location.source)}</p>
          <a href="${pkg.mapLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">OPEN MAP</a>
        ` : '<p class="mu">No location captured.</p>'}
      </div>

      <div class="card">
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          <b>IMPORTANT:</b> Review this information before sharing. Your approved location
          will be included as a clickable map link. This is not a substitute for calling
          emergency services (e.g., 911) for immediate danger.
        </div>
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="navigate" data-to="escalation">EDIT</button>
          <button class="btn btn-secondary" data-action="navigate" data-to="escalation">CANCEL</button>
          <button class="btn btn-primary" id="confirm-send-btn"
            data-action="confirm-send"
            data-contact="${contact?.id || ""}"
            ${provider.provider === "none" ? "disabled" : ""}>
            CONFIRM &amp; SEND
          </button>
        </div>
      </div>
    </div>
  `;
}

function getProviderNote(provider, config) {
  if (provider.provider === "demo") {
    return "DEMO MODE: no real message will be sent. Status will show as SIMULATED.";
  }
  if (provider.provider === "twilio") {
    return "SMS will be sent through the configured Twilio account (server-side).";
  }
  if (provider.provider === "device-sms") {
    return "Twilio is not configured. Your device SMS composer will open. Delivery is handled by your carrier.";
  }
  if (provider.provider === "email") {
    return config && config.emailConfigured ? "Email will be sent through the configured provider." : "No email provider configured server-side.";
  }
  if (provider.provider === "webhook") {
    return config && config.webhookConfigured ? "A structured JSON payload will be POSTed to the configured webhook." : "No webhook configured server-side.";
  }
  if (provider.provider === "phone") {
    return "Your device dialer will open. Call status is handled by your device.";
  }
  return "No notification method is available. Use COPY INCIDENT MESSAGE to share manually.";
}

export async function setupConfirmHandlers() {
  const sendBtn = document.getElementById("confirm-send-btn");
  if (!sendBtn) return;

  sendBtn.addEventListener("click", async () => {
    const contactId = sendBtn.dataset.contact;
    const state = getState();
    const incident = state.ui.selectedIncident || state.incidents[0];
    if (!incident) return;

    const contact = state.contacts.find((c) => c.id === contactId) || getRecommendedContact(incident.type);
    if (!contact) {
      showToast("No response contact configured for this incident type.");
      return;
    }
    if (!contact.enabled) {
      showToast("Contact is not enabled. Enable it in Settings first.");
      return;
    }
    if (!state.notificationConfig) {
      state.notificationConfig = await fetchProviderConfig();
      store.setNotificationConfig(state.notificationConfig);
    }

    const pkg = buildIncidentPackage(incident);
    const isDemo = state.demoMode;
    const provider = selectProvider(state.notificationConfig, contact, isDemo);

    if (!isDemo && provider.provider === "none") {
      showToast("No notification method available. Copy the prepared message to share manually.");
      return;
    }

    if (!isDemo && !contact.enabled) {
      showToast("Contact is not enabled. Enable it in Settings first.");
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    try {
      const escalation = await dispatchNotification(provider, contact, pkg, incident);
      store.updateIncident(incident.id, escalation.updates);

      state.ui.needsRender = true;
      sendBtn.disabled = false;
      sendBtn.textContent = "CONFIRM & SEND";

      const url = new URL(window.location);
      url.hash = "#delivery";
      url.searchParams.set("incident", incident.id);
      window.location.href = url.toString();
    } catch (error) {
      sendBtn.disabled = false;
      sendBtn.textContent = "CONFIRM & SEND";
      console.error("[LIFELINE] Escalation failed:", error);
      showToast("Escalation failed: " + (error.message || "unknown error"));
    }
  });
}

// Dispatch a notification through the selected provider.
// Returns { updates } to persist on the incident.
async function dispatchNotification(provider, contact, pkg, incident) {
  const isDemo = provider.provider === "demo";
  const notification = buildNotificationObject(pkg, contact, provider.provider, NOTIFICATION_STATUS.READY);

  // Offline handling: server-side providers cannot be reached while offline.
  // Device SMS / phone links work locally and need no connectivity.
  if (!isDemo && providerRequiresOnline(provider.provider) && !navigator.onLine) {
    const queued = enqueueNotification({
      incidentId: pkg.incidentId,
      contactId: contact.id,
      type: provider.provider,
      pkg,
    });
    const channel = {
      provider: provider.provider,
      method: provider.provider === "twilio" ? "SMS" : provider.provider === "email" ? "Email" : "Webhook",
      status: NOTIFICATION_STATUS.QUEUED,
      delivered: false,
      note: "Offline — notification queued. It will send automatically when the connection returns. You can also retry from the delivery screen.",
      messageId: null,
      error: null,
      queueId: queued.id,
    };
    // Also queue in Service Worker for Background Sync
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          type: "QUEUE_NOTIFICATION",
          payload: { type: provider.provider === "twilio" ? "sms" : provider.provider, contact: { id: contact.id }, incident: pkg },
        });
      }).catch(() => {});
    }
    notification.provider = provider.provider;
    notification.status = NOTIFICATION_STATUS.QUEUED;
    notification.delivered = false;
    notification.note = channel.note;
    return {
      updates: {
        status: "queued",
        lastEscalation: {
          at: Date.now(),
          contact: contact.id,
          contactName: contact.name,
          provider: provider.provider,
          method: channel.method,
          status: NOTIFICATION_STATUS.QUEUED,
          delivered: false,
          note: channel.note,
          messageId: null,
          error: null,
          channels: { [provider.provider]: channel },
          notification,
        },
      },
    };
  }

  let channel;
  let overall;

  if (isDemo) {
    channel = {
      provider: "demo",
      method: "DEMO",
      status: NOTIFICATION_STATUS.SIMULATED,
      delivered: false,
      note: "Demo notification — no real message was sent.",
      messageId: null,
      error: null,
    };
    overall = {
      provider: "demo",
      method: "DEMO notification",
      status: NOTIFICATION_STATUS.SIMULATED,
      delivered: false,
      note: "SIMULATED: no real communication was performed.",
      messageId: null,
      error: null,
    };
    notification.status = NOTIFICATION_STATUS.SIMULATED;
  } else if (provider.provider === "twilio") {
    const result = await callNotify("sms", contact, pkg);
    channel = mapBackendResult(result, "SMS", "twilio");
    overall = summarizeChannel(channel, "Twilio SMS");
  } else if (provider.provider === "device-sms") {
    // Hand off to the device: the actual sms: link is opened from the delivery
    // screen via an explicit "OPEN SMS COMPOSER" button so the app stays intact
    // and the user explicitly authorises the handoff.
    const link = buildDeviceSMSLink(contact, pkg);
    channel = {
      provider: "device-sms",
      method: "SMS",
      status: NOTIFICATION_STATUS.READY,
      delivered: false,
      note: "Ready to open your device SMS composer. Delivery is handled by your carrier.",
      deviceLink: link,
      messageId: null,
      error: null,
    };
    overall = summarizeChannel(channel, "Device SMS");
  } else if (provider.provider === "phone") {
    const link = buildPhoneLink(contact);
    channel = {
      provider: "phone",
      method: "Phone",
      status: NOTIFICATION_STATUS.READY,
      delivered: false,
      note: "Ready to open your device dialer. Call status is handled by your device.",
      deviceLink: link,
      messageId: null,
      error: null,
    };
    overall = summarizeChannel(channel, "Phone");
  } else if (provider.provider === "email") {
    const result = await callNotify("email", contact, pkg);
    channel = mapBackendResult(result, "Email", "email");
    overall = summarizeChannel(channel, "Email");
  } else if (provider.provider === "webhook") {
    const result = await callNotify("webhook", contact, pkg);
    channel = mapBackendResult(result, "Webhook", "webhook");
    overall = summarizeChannel(channel, "Webhook");
  } else {
    channel = {
      provider: "none",
      method: "Manual",
      status: NOTIFICATION_STATUS.NOT_CONFIGURED,
      delivered: false,
      note: "No provider configured. Use COPY INCIDENT MESSAGE.",
      messageId: null,
      error: null,
    };
    overall = summarizeChannel(channel, "Manual");
  }

  notification.provider = channel.provider;
  notification.status = overall.status;
  notification.delivered = overall.delivered;

  const primaryChannelKey = isDemo ? "demo" : provider.provider;

  return {
    updates: {
      status: "active",
      lastEscalation: {
        at: Date.now(),
        contact: contact.id,
        contactName: contact.name,
        provider: provider.provider,
        method: overall.method,
        status: overall.status,
        delivered: overall.delivered,
        note: overall.note,
        messageId: overall.messageId || null,
        error: overall.error || null,
        channels: { [primaryChannelKey]: channel },
        notification,
      },
    },
  };
}

async function callNotify(type, contact, pkg) {
  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, contact, incident: pkg }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || `Request failed (${response.status})` };
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function mapBackendResult(result, method, provider) {
  if (!result || !result.success) {
    const err = (result && result.error) || "Provider request failed.";
    return { provider, method, status: NOTIFICATION_STATUS.FAILED, delivered: false, note: err, messageId: null, error: err };
  }
  const r = result.result || {};
  return {
    provider: r.provider || provider,
    method,
    status: r.status === "NOT CONFIGURED" ? NOTIFICATION_STATUS.NOT_CONFIGURED : r.status === "SENT" ? NOTIFICATION_STATUS.SENT : r.status === "DELIVERED" ? NOTIFICATION_STATUS.DELIVERED : NOTIFICATION_STATUS.SENT,
    delivered: !!r.delivered,
    note: r.note || "",
    messageId: r.messageId || null,
    error: r.error || null,
  };
}

function summarizeChannel(channel, method) {
  return {
    provider: channel.provider,
    method,
    status: channel.status,
    delivered: channel.delivered,
    note: channel.note,
    messageId: channel.messageId || null,
    error: channel.error || null,
  };
}

function getUrgencyBadge(urgency) {
  const map = {
    information: "badge-ready",
    monitor: "badge-monitor",
    verify: "badge-verify",
    urgent: "badge-urgent",
    immediate: "badge-immediate",
  };
  return map[urgency] || "badge-gray";
}
