// LIFELINE AI — Delivery status screen
import { getState, store } from "../store.js";
import { buildIncidentPackage, getRecommendedContact } from "../contacts.js";
import {
  NOTIFICATION_STATUS,
  buildCopyableMessage,
  buildLocationLink,
  renderStatusBadge,
  selectProvider,
  buildDeviceSMSLink,
  buildPhoneLink,
  fetchProviderConfig,
  providerRequiresOnline,
} from "../notification-providers.js";
import { esc, showToast } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";

function channelView(escalation, provider) {
  // Map the single selected provider into per-channel view state.
  const ch = (escalation && escalation.channels) || {};
  const smsStatus = ch["device-sms"] ? ch["device-sms"].status : provider === "twilio" ? (escalation ? escalation.status : "—") : provider === "device-sms" ? (escalation ? escalation.status : "—") : "—";
  const phoneStatus = ch.phone ? ch.phone.status : provider === "phone" ? (escalation ? escalation.status : "—") : "—";
  const emailStatus = ch.email ? ch.email.status : provider === "email" ? (escalation ? escalation.status : "—") : "—";
  const webhookStatus = ch.webhook ? ch.webhook.status : provider === "webhook" ? (escalation ? escalation.status : "—") : "—";
  const demoStatus = ch.demo ? ch.demo.status : provider === "demo" ? (escalation ? escalation.status : "—") : "—";

  return {
    sms: { status: smsStatus, done: smsStatus !== "—" && provider === "twilio" },
    phone: { status: phoneStatus, done: phoneStatus !== "—" && provider === "phone" },
    email: { status: emailStatus, done: emailStatus !== "—" && provider === "email" },
    webhook: { status: webhookStatus, done: webhookStatus !== "—" && provider === "webhook" },
    demo: { status: demoStatus, done: demoStatus !== "—" },
  };
}

export function initDeliveryStatus(params = {}) {
  const state = getState();
  const incident = params.incidentId
    ? state.incidents.find((i) => i.id === params.incidentId)
    : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find((t) => t.id === incident.type) || { label: "Unknown", icon: "❓" };
  const pkg = buildIncidentPackage(incident);
  const escalation = incident.lastEscalation;
  const hasConfig = !!state.notificationConfig;

  const statusValue = escalation ? escalation.status : NOTIFICATION_STATUS.NOT_CONFIGURED;
  const provider = escalation ? escalation.provider : "none";
  const method = escalation ? escalation.method : "Not sent";
  const note = escalation ? escalation.note : "No escalation has been initiated.";
  const delivered = escalation ? escalation.delivered : false;
  const error = escalation ? escalation.error : null;
  const deviceLink = escalation && (escalation.channels[provider] || {}).deviceLink;
  const isOnline = state.isOnline;

  const cv = channelView(escalation, provider);

  const openComposerButton =
    provider === "device-sms" && deviceLink
      ? `<button class="btn btn-primary btn-sm" data-action="open-device-link" style="margin-top:12px;">OPEN SMS COMPOSER</button>`
      : "";
  const openDialerButton =
    provider === "phone" && deviceLink
      ? `<button class="btn btn-primary btn-sm" data-action="open-device-link" style="margin-top:12px;">OPEN PHONE DIALER</button>`
      : "";

  return `
    <div class="delivery-screen">
      <div class="card">
        <h2>Delivery status</h2>
        <p class="mu">LIFELINE ${esc(incident.id)}</p>
        <span class="text-small" style="color:var(--text-tertiary);">${isOnline ? "● Online" : "○ Offline"}</span>
      </div>

      <div class="card">
        <div class="flex-between">
          <div>
            <span style="font-size:20px;">${typeInfo.icon}</span>
            <span style="font-size:16px; font-weight:600; margin-left:8px;">${esc(typeInfo.label)}</span>
          </div>
          <span class="badge badge-urgent">${esc((incident.urgency || "urgent").toUpperCase())}</span>
        </div>

        <div class="divider"></div>

        <h3>Communication status</h3>
        <div style="margin: 12px 0;">
          ${renderStatusBadge(statusValue)}
          <span class="text-small" style="margin-left:8px; color:var(--text-secondary);">${esc(method)}</span>
        </div>

        <div class="progress-steps">
          <div class="progress-step">
            <div class="step-indicator complete">✓</div>
            <div class="step-label">Incident package created</div>
            <div class="step-status">COMPLETE</div>
          </div>
          <div class="progress-step">
            <div class="step-indicator complete">✓</div>
            <div class="step-label">Location link generated</div>
            <div class="step-status">COMPLETE</div>
          </div>
          ${channelStep("SMS", cv.sms.status, cv.sms.done)}
          ${channelStep("Phone", cv.phone.status, cv.phone.done)}
          ${channelStep("Email", cv.email.status, cv.email.done)}
          ${channelStep("Webhook", cv.webhook.status, cv.webhook.done)}
        </div>

        <div class="divider"></div>

        ${provider === "device-sms" ? `
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          ⚠ SMS composer opens via the button below. LIFELINE cannot confirm delivery — it is handled by your device and carrier.
        </div>` : ""}
        ${provider === "phone" ? `
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          ⚠ Phone dialer opens via the button below. LIFELINE cannot confirm the call was completed — handled by your device.
        </div>` : ""}
        ${provider === "demo" ? `
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          🧪 DEMO MODE: no real communication was sent. This is a simulated demonstration.
        </div>` : ""}
        ${provider === "twilio" && !delivered ? `
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          <span id="twilio-poll-status">Checking delivery status...</span>
        </div>` : ""}
        ${!hasConfig && !isOnline && providerRequiresOnline(provider) ? `
        <div class="warning-note" style="font-size:12px; line-height:1.6;">
          ⚠ You are offline. The notification is queued and will send when the connection returns.
        </div>` : ""}
        ${note ? `<p class="mu text-small" style="margin-top:8px;">${esc(note)}</p>` : ""}

        ${openComposerButton}
        ${openDialerButton}
      </div>

      <div class="card">
        <h3>Message prepared for recipient</h3>
        <p class="mu text-small">This is the exact message that would be sent via ${esc(method || provider)}:</p>
        <pre class="form-input" style="white-space:pre-wrap; font-family:monospace; font-size:12px; margin-top:8px; max-height:200px; overflow:auto;">${esc(buildCopyableMessage(pkg))}</pre>
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" data-action="copy-message" data-id="${incident.id}">COPY INCIDENT MESSAGE</button>
          <button class="btn btn-secondary btn-sm" id="copy-location-link">COPY LOCATION LINK</button>
        </div>
        ${error ? `
        <div class="warning-note" style="margin-top:8px; font-size:12px;">
          ⚠ ${esc(error)}
          <button class="btn btn-secondary btn-sm" data-action="retry-channel" data-id="${incident.id}" data-channel="${provider}" style="margin-top:8px;">Retry</button>
        </div>` : ""}
      </div>

      <div class="card">
        <h3>Location link</h3>
        ${pkg.mapLink ? `
          <a href="${pkg.mapLink}" target="_blank" rel="noopener" class="btn btn-secondary">OPEN MAP</a>
          <p class="mu text-small" style="margin-top:8px;">${esc(pkg.mapLink)}</p>
        ` : '<p class="mu">No location link available.</p>'}
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="navigate" data-to="brief" data-params='{"incidentId":"${incident.id}">VIEW INCIDENT</button>
        </div>
      </div>
    </div>
  `;
}

function channelStep(label, status, done) {
  const indicator = !done ? "○" : status === "FAILED" ? "✗" : "✓";
  const cls = !done ? "pending" : status === "FAILED" ? "" : "complete";
  const show = status && status !== "—" ? status : "—";
  return `
    <div class="progress-step">
      <div class="step-indicator ${cls}">${indicator}</div>
      <div class="step-label">${label}</div>
      <div class="step-status">${esc(show)}</div>
    </div>`;
}

export function setupDeliveryHandlers() {
  const state = getState();
  const id = document.querySelector('[data-action="copy-message"]')?.dataset?.id;
  const incident = id ? state.incidents.find((i) => i.id === id) : null;

  document.querySelector('[data-action="copy-message"]')?.addEventListener("click", () => {
    if (!incident) return;
    const pkg = buildIncidentPackage(incident);
    navigator.clipboard.writeText(buildCopyableMessage(pkg)).then(() => {
      showToast("Incident message copied to clipboard.");
    });
  });

  document.getElementById("copy-location-link")?.addEventListener("click", () => {
    if (!incident) return;
    const pkg = buildIncidentPackage(incident);
    const link = pkg.mapLink || buildLocationLink(pkg);
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        showToast("Location link copied.");
      });
    } else {
      showToast("No location to copy.");
    }
  });

  // Open the device SMS composer / phone dialer explicitly.
  document.querySelectorAll('[data-action="open-device-link"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const link = getDeviceLinkForIncident(incident, state);
      if (link) {
        window.location.href = link;
        showToast("Device interface opening...");
      }
    });
  });

  // Poll for Twilio message status if we have a messageId
  const escalation = incident?.lastEscalation;
  if (escalation?.provider === "twilio" && escalation?.channels?.twilio?.messageId) {
    startTwilioStatusPolling(escalation.channels.twilio.messageId, incident.id);
  }
}

function getDeviceLinkForIncident(incident, state) {
  if (!incident || !incident.lastEscalation) return null;
  const ch = incident.lastEscalation.channels[incident.lastEscalation.provider] || {};
  if (ch.deviceLink) return ch.deviceLink;
  const contact = state.contacts.find((c) => c.id === incident.lastEscalation.contact) || getRecommendedContact(incident.type);
  if (!contact) return null;
  const pkg = buildIncidentPackage(incident);
  const provider = incident.lastEscalation.provider;
  if (provider === "device-sms") return buildDeviceSMSLink(contact, pkg);
  if (provider === "phone") return buildPhoneLink(contact);
  return null;
}

function startTwilioStatusPolling(messageId, incidentId) {
  const statusEl = document.getElementById("twilio-poll-status");
  if (!statusEl) return;

  let attempts = 0;
  const maxAttempts = 30;
  const intervalMs = 5000;

  async function poll() {
    try {
      const res = await fetch(`/api/message-status?messageId=${encodeURIComponent(messageId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          statusEl.textContent = "Message not found on Twilio.";
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      const status = data.status || "UNKNOWN";
      const delivered = data.delivered === true;

      statusEl.innerHTML = `<b>Status:</b> ${status} ${delivered ? "✓ Delivered" : ""}`;

      if (delivered || ["DELIVERED", "FAILED", "UNDELIVERED"].includes(status)) {
        const state = getState();
        store.updateIncident(incidentId, {
          lastEscalation: {
            ...state.incidents.find(i => i.id === incidentId)?.lastEscalation,
            status: delivered ? "DELIVERED" : status,
            delivered,
            note: delivered ? "Message delivered to recipient." : `Final status: ${status}`,
            error: delivered ? null : (data.errorMessage || "Delivery failed"),
          },
        });
        statusEl.innerHTML += ` <span class="badge ${delivered ? "badge-ready" : "badge-immediate"}">${delivered ? "DELIVERED" : "FINAL"}</span>`;
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        statusEl.innerHTML += ` <span class="badge badge-monitor">Polling stopped (max attempts)</span>`;
        return;
      }
      setTimeout(poll, intervalMs);
    } catch (error) {
      console.warn("[LIFELINE] Status poll failed:", error.message);
      attempts++;
      if (attempts >= maxAttempts) {
        statusEl.textContent = "Status polling failed.";
        return;
      }
      setTimeout(poll, intervalMs);
    }
  }

  poll();
}
