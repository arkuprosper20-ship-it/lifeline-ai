// LIFELINE AI — Delivery status screen
import { getState, store } from "../store.js";
import { buildIncidentPackage } from "../contacts.js";
import { createLocationLink } from "../location.js";
import { esc, formatTimeAgo } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";

export function initDeliveryStatus(params = {}) {
  const state = getState();
  const incident = params.incidentId ? state.incidents.find(i => i.id === params.incidentId) : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: "Unknown", icon: "❓" };
  const pkg = buildIncidentPackage(incident);
  const escalation = incident.lastEscalation;

  return `
    <div class="delivery-screen">
      <div class="card">
        <h2>Delivery status</h2>
        <p class="mu">LIFELINE ${esc(incident.id)}</p>
      </div>

      <div class="card">
        <div class="flex-between">
          <div>
            <span style="font-size:20px;">${typeInfo.icon}</span>
            <span style="font-size:16px; font-weight:600; margin-left:8px;">${esc(typeInfo.label)}</span>
          </div>
          <span class="badge badge-urgent">${esc(incident.urgency?.toUpperCase() || "URGENT")}</span>
        </div>

        <div class="divider"></div>

        <h3>Communication channels</h3>
        <div style="margin-bottom:12px;">
          ${escalation ? `
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
              ${escalation.channels.sms?.status === "sent" ? `
              <div class="progress-step">
                <div class="step-indicator complete">✓</div>
                <div class="step-label">SMS sent</div>
                <div class="step-status">${escalation.channels.sms.delivered ? "DELIVERED" : "ACCEPTED"}</div>
              </div>` : ""}
              ${escalation.channels.call?.status === "dialer_opened" ? `
              <div class="progress-step">
                <div class="step-indicator complete">✓</div>
                <div class="step-label">Phone dialer opened</div>
                <div class="step-status">COMPLETE</div>
              </div>` : ""}
              <div class="progress-step">
                <div class="step-indicator ${!!escalation.channels.webhook ? "complete" : "pending"}">✓</div>
                <div class="step-label">Webhook notification</div>
                <div class="step-status">${escalation.channels.webhook ? "DELIVERED" : "NOT CONFIGURED"}</div>
              </div>
            </div>
          ` : `
            <p class="mu">No escalation has been initiated.</p>
          `}
        </div>
      </div>

      <div class="card">
        <h3>Location link</h3>
        ${pkg.mapLink ? `
          <a href="${pkg.mapLink}" target="_blank" rel="noopener" class="btn btn-secondary">
            OPEN MAP
          </a>
          <p class="mu text-small" style="margin-top:8px;">
            ${esc(pkg.mapLink)}
          </p>
        ` : '<p class="mu">No location link available.</p>'}
      </div>

      <div class="card">
        <h3>Delivery note</h3>
        <p class="text-small text-muted">
          "Sent" means the configured provider accepted the request.
          It does not guarantee a human response.
        </p>
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="copy-brief" data-id="${incident.id}">COPY BRIEF</button>
          <button class="btn btn-primary" data-action="navigate" data-to="brief" data-params='{"incidentId":"${incident.id}}">
            VIEW INCIDENT
          </button>
        </div>
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="verify-incident" data-id="${incident.id}">Mark as Verified</button>
          <button class="btn btn-secondary" data-action="resolve-incident" data-id="${incident.id}">Mark as Resolved</button>
        </div>
      </div>

      ${escalation?.channels?.sms?.error ? `
      <div class="card">
        <div class="warning-note">⚠ SMS delivery issue: ${esc(escalation.channels.sms.error)}</div>
        <button class="btn btn-secondary btn-sm" data-action="retry-sms" data-id="${incident.id}" style="margin-top:8px;">Retry SMS</button>
      </div>` : ""}
    </div>
  `;
}

export function setupDeliveryHandlers() {
  document.querySelector('[data-action="copy-brief"]')?.addEventListener("click", () => {
    const id = document.querySelector('[data-action="copy-brief"]').dataset.id;
    const incident = getState().incidents.find(i => i.id === id);
    if (incident) {
      const pkg = buildIncidentPackage(incident);
      navigator.clipboard.writeText(pkg.textMessage).then(() => {
        showToast("Brief copied to clipboard.");
      });
    }
  });
}

function showToast(msg) {
  const div = document.createElement("div");
  div.className = "toast toast-info";
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
