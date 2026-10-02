// LIFELINE AI — Confirmation screen
import { getState, store } from "../store.js";
import { getRecommendedContact, buildIncidentPackage } from "../contacts.js";
import { createLocationLink } from "../location.js";
import { esc } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";

export function initConfirmScreen(params = {}) {
  const state = getState();
  const incident = params.incidentId ? state.incidents.find(i => i.id === params.incidentId) : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: "Unknown", icon: "❓" };
  const contact = state.contacts.find(c => c.id === state.ui.selectedContact) || getRecommendedContact(incident.type);
  const pkg = buildIncidentPackage(incident);

  return `
    <div class="confirm-screen">
      <div class="card">
        <h2>Review &amp; Confirm</h2>
        <p class="mu">Review exactly what will be shared with the response contact.</p>
      </div>

      <div class="card">
        <h3>Recipient</h3>
        <p><b>${esc(contact?.name || "Not configured")}</b></p>
        <p class="mu">${esc(contact?.description || "")}</p>
        ${contact?.enabled === false ? `<div class="warning-note">This contact is not enabled. Configure it in Settings.</div>` : ""}
      </div>

      <div class="card">
        <h3>Channel</h3>
        <div class="btn-row">
          ${contact?.call && contact.phone ? `<span class="tag tag-gray">📞 Voice call</span>` : ""}
          ${contact?.sms && contact.phone ? `<span class="tag tag-gray">💬 SMS</span>` : ""}
          ${contact?.email && contact.email ? `<span class="tag tag-gray">✉️ Email</span>` : ""}
          ${contact?.webhook && contact.webhook ? `<span class="tag tag-gray">🔗 Webhook</span>` : ""}
        </div>
      </div>

      <div class="card">
        <h3>Incident</h3>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:20px;">${typeInfo.icon}</span>
          <span style="font-size:16px; font-weight:600;">${esc(typeInfo.label)}</span>
        </div>
        <span class="badge ${getUrgencyBadge(incident.urgency || "urgent")}">${esc(incident.urgency?.toUpperCase() || "URGENT")}</span>

        <h4 style="margin-top:12px;">Observations</h4>
        ${incident.observations?.length ? `
          <ul style="list-style:none; padding-left:0;">
            ${incident.observations.map(o => `<li style="padding:4px 0;">✓ ${esc(o)}</li>`).join('')}
          </ul>
        ` : '<p class="mu">No observations.</p>'}

        <h4>Missing information</h4>
        ${incident.missingInfo?.length ? `
          <ul style="list-style:none; padding-left:0;">
            ${incident.missingInfo.map(m => `<li style="padding:4px 0; color:var(--text-secondary);">? ${esc(m)}</li>`).join('')}
          </ul>
        ` : '<p class="mu text-muted">None detected.</p>'}
      </div>

      <div class="card">
        <h3>Location</h3>
        ${incident.location && incident.location.latitude !== undefined ? `
          <p><b>Latitude:</b> ${incident.location.latitude.toFixed(6)}</p>
          <p><b>Longitude:</b> ${incident.location.longitude.toFixed(6)}</p>
          <p><b>Accuracy:</b> ${incident.location.accuracy ? `±${Math.round(incident.location.accuracy)}m` : "Unknown"}</p>
          <p><b>Type:</b> ${esc(incident.location.sourceLabel || incident.location.source)}</p>
          <a href="${pkg.mapLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
            OPEN MAP
          </a>
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
          <button class="btn btn-secondary" data-action="navigate" data-to="escalation">CANCEL</button>
          <button class="btn btn-primary" data-action="send-escalation" data-contact="${contact?.id || ''}">
            CONFIRM &amp; SHARE
          </button>
        </div>
      </div>
    </div>
  `;
}

export async function setupConfirmHandlers() {
  const sendBtn = document.querySelector('[data-action="send-escalation"]');
  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      const contactId = sendBtn.dataset.contact;
      const state = getState();
      const incident = state.ui.selectedIncident || state.incidents[0];
      if (!incident) return;

      const contact = state.contacts.find(c => c.id === contactId) || getRecommendedContact(incident.type);
      if (!contact) {
        showError("No contact configured for this incident type.");
        return;
      }

      if (!contact.enabled) {
        showError("Contact is not enabled. Enable it in Settings first.");
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";

      const pkg = buildIncidentPackage(incident);

      let smsResult = { status: "not_attempted", delivered: false };
      let callResult = { status: "not_attempted", delivered: false };
      let emailResult = { status: "not_attempted", delivered: false };
      let webhookResult = { status: "not_attempted", delivered: false };

      async function sendNotification(channelType) {
        try {
          const response = await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: channelType, contact, incident: pkg }),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return { status: "failed", delivered: false, error: data.error || `Request failed (${response.status})` };
          }
          const data = await response.json();
          return { status: "sent", delivered: data.result?.delivered || false, error: null };
        } catch (error) {
          return { status: "failed", delivered: false, error: error.message };
        }
      }

      if (contact.sms && contact.phone) {
        smsResult = await sendNotification("sms");
      }
      if (contact.call && contact.phone) {
        window.location.href = contact.phone;
        callResult = { status: "dialer_opened", delivered: true };
      }
      if (contact.email && contact.email) {
        emailResult = await sendNotification("email");
      }
      if (contact.webhook && contact.webhook) {
        webhookResult = await sendNotification("webhook");
      }

      store.updateIncident(incident.id, {
        status: "active",
        lastEscalation: {
          at: Date.now(),
          contact: contact.id,
          channels: { sms: smsResult, call: callResult, email: emailResult, webhook: webhookResult },
        },
      });

      const url = new URL(window.location);
      url.hash = "#delivery";
      url.searchParams.set("incident", incident.id);
      window.location.href = url.toString();
    });
  }
}

function getUrgencyBadge(urgency) {
  const map = {
    information: "badge-ready", monitor: "badge-monitor", verify: "badge-verify",
    urgent: "badge-urgent", immediate: "badge-immediate",
  };
  return map[urgency] || "badge-gray";
}

function showError(msg) {
  const div = document.createElement("div");
  div.className = "toast toast-error";
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}
