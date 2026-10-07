// LIFELINE AI - Escalation screen
import { getState, store } from "../store.js";
import { getRecommendedContact, getAvailableChannels, buildIncidentPackage } from "../contacts.js";
import { getRecommendedEmergencyContact } from "../emergency-contacts.js";
import { esc, showToast } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";

export function initEscalationScreen(params = {}) {
  const state = getState();
  const incident = params.incidentId ? state.incidents.find(i => i.id === params.incidentId) : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: "Unknown", icon: "[?]" };
  const countryCode = state.settings.countryCode || "US";
  const emergencyContact = getRecommendedEmergencyContact(incident.type, countryCode);
  const responseContact = getRecommendedContact(incident.type);

  return `
    <div class="escalation-screen">
      <div class="card">
        <h2>Smart Escalation</h2>
        <p class="mu">Based on the incident classification, LIFELINE recommends contacting the appropriate response team.</p>
      </div>

      <div class="card">
        <div class="flex-between">
          <div>
            <span class="badge badge-urgent">${esc(incident.urgency?.toUpperCase() || "URGENT")}</span>
            <span style="font-size:18px; font-weight:600; margin-left:8px;">
              ${typeInfo.icon} ${esc(typeInfo.label)}
            </span>
          </div>
        </div>

        <div class="divider"></div>

        <h3>Recommended response contact</h3>
        <div style="margin-bottom:12px;">
          <b>${esc(emergencyContact?.name || "No contact available")}</b>
          <div class="mu">${esc(emergencyContact?.description || "Emergency services for this incident type")}</div>
          <span class="tag tag-gray">${esc(emergencyContact?.category || "emergency")}</span>
          ${emergencyContact?.phone ? `<span class="tag tag-gray">Phone: ${esc(emergencyContact.phone)}</span>` : ""}
        </div>

        <div class="btn-row">
          ${emergencyContact?.call ? `<button class="btn btn-primary btn-sm" data-action="call-emergency" data-phone="${esc(emergencyContact.phone?.replace('tel:', '') || '')}">[PHONE] CALL NOW</button>` : ""}
          ${emergencyContact?.sms ? `<button class="btn btn-secondary btn-sm" data-action="sms-emergency" data-phone="${esc(emergencyContact.phone?.replace('tel:', '') || '')}">[SMS] SMS</button>` : ""}
        </div>

        <div class="warning-note" style="margin-top:12px; font-size:12px;">
          [WARN] For immediate life-threatening emergencies, call your local emergency number (e.g., 911, 112, 999).
          LIFELINE is not a replacement for emergency services.
        </div>
      </div>

      <div class="card">
        <h3>Information to share</h3>
        <ul style="list-style:none; padding-left:0;">
          <li style="padding:4px 0;">[OK] Incident type and urgency</li>
          <li style="padding:4px 0;">[OK] Observations</li>
          <li style="padding:4px 0;">[OK] Report timestamp</li>
          <li style="padding:4px 0;">[OK] Your approved location</li>
          <li style="padding:4px 0;">[OK] Map link</li>
          <li style="padding:4px 0;">[OK] Response category</li>
        </ul>

        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-secondary" data-action="navigate" data-to="brief">← Edit report</button>
          <button class="btn btn-primary" data-action="confirm-escalation" data-contact="${responseContact?.id || emergencyContact?.category || ''}">
            REVIEW & CONFIRM
          </button>
        </div>
      </div>
    </div>
  `;
}

export async function setupEscalationHandlers() {
  const confirmBtn = document.querySelector('[data-action="confirm-escalation"]');
  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      const contactId = e.target.dataset.contact;
      const state = getState();
      const incident = state.ui.selectedIncident || state.incidents[0];
      if (incident) {
        store.setUI({ selectedIncident: incident, selectedContact: contactId });
        state.ui.selectedContact = contactId;
        const url = new URL(window.location);
        url.hash = "#confirm";
        url.searchParams.set("incident", incident.id);
        window.location.href = url.toString();
      }
    });
  }

  // Emergency call button
  const callBtn = document.querySelector('[data-action="call-emergency"]');
  if (callBtn) {
    callBtn.addEventListener("click", () => {
      const phone = callBtn.dataset.phone;
      if (phone) {
        showToast("Opening phone dialer...");
        window.location.href = `tel:${phone}`;
      }
    });
  }

  // Emergency SMS button
  const smsBtn = document.querySelector('[data-action="sms-emergency"]');
  if (smsBtn) {
    smsBtn.addEventListener("click", () => {
      const phone = smsBtn.dataset.phone;
      const state = getState();
      const incident = state.ui.selectedIncident || state.incidents[0];
      if (phone && incident) {
        const pkg = buildIncidentPackage(incident);
        const body = encodeURIComponent(pkg.smsMessage || `LIFELINE ${incident.id} — ${incident.urgency?.toUpperCase() || ""}`);
        showToast("Opening SMS composer...");
        window.location.href = `sms:${phone}?body=${body}`;
      }
    });
  }
}
