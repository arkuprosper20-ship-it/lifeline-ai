// LIFELINE AI — Smart escalation screen
import { getState, store } from "../store.js";
import { getRecommendedContact, getAvailableChannels } from "../contacts.js";
import { esc } from "../ui.js";
import { INCIDENT_TYPES } from "../types.js";

export function initEscalationScreen(params = {}) {
  const state = getState();
  const incident = params.incidentId ? state.incidents.find(i => i.id === params.incidentId) : state.ui.selectedIncident || state.incidents[0];
  if (!incident) return '<div class="card"><p>No incident found.</p></div>';

  const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: "Unknown", icon: "❓" };
  const contact = getRecommendedContact(incident.type);
  const channels = contact ? getAvailableChannels(contact).filter(c => c.available) : [];

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

        ${contact ? `
          <div style="margin-bottom:12px;">
            <b>${esc(contact.name)}</b>
            <div class="mu">${esc(contact.description || "")}</div>
            <span class="tag tag-gray">${esc(contact.category)}</span>
            ${contact.coverage ? `<span class="tag tag-gray">Coverage: ${esc(contact.coverage)}</span>` : ""}
            ${contact.enabled === false ? `<div class="warning-note">This contact is not yet configured. Configure it in Settings → Contact Directory.</div>` : ""}
          </div>

          <h4>Available channels</h4>
          <div class="btn-row">
            ${channels.length > 0 ? channels.map(ch => `
              <button class="btn btn-secondary btn-sm" data-contact="${contact.id}" data-channel="${ch.type}">
                ${ch.icon} ${ch.label}
              </button>
            `).join("") : `<p class="mu">No channels available for this contact.</p>`}
          </div>

          <div class="warning-note" style="margin-top:12px; font-size:12px;">
            ⚠ For immediate life-threatening emergencies, call your local emergency number (e.g., 911, 112, 999).
            LIFELINE is not a replacement for emergency services.
          </div>
        ` : `
          <div class="warning-note">
            No response contact is configured for this incident type.
            <button class="btn btn-secondary btn-sm" style="margin-top:8px;" data-action="navigate" data-to="settings">
              Configure contacts
            </button>
          </div>
        `}
      </div>

      <div class="card">
        <h3>Information to share</h3>
        <ul style="list-style:none; padding-left:0;">
          <li style="padding:4px 0;">✓ Incident type and urgency</li>
          <li style="padding:4px 0;">✓ Observations</li>
          <li style="padding:4px 0;">✓ Report timestamp</li>
          <li style="padding:4px 0;">✓ Your approved location</li>
          <li style="padding:4px 0;">✓ Map link</li>
          <li style="padding:4px 0;">✓ Response category</li>
        </ul>

        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-secondary" data-action="navigate" data-to="brief">← Edit report</button>
          <button class="btn btn-primary" data-action="confirm-escalation" data-contact="${contact?.id || ''}">
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
  const channelButtons = document.querySelectorAll('[data-channel]');
  channelButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const channelType = btn.dataset.channel;
      alert(`Channel ${channelType} — configure in Settings.`);
    });
  });
}
