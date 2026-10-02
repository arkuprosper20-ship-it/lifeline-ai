// LIFELINE AI — Audit log view
import { getState } from "../store.js";
import { esc, formatTimeAgo } from "../ui.js";

export function initAuditScreen() {
  const incidents = getState().incidents;
  const events = [];
  for (const incident of incidents) {
    events.push({ ts: incident.timestamp, type: "incident_created", message: `Incident ${incident.id} created`, incidentId: incident.id });
    if (incident.location) {
      events.push({ ts: incident.location.timestamp, type: "location_captured", message: `Location captured`, incidentId: incident.id });
    }
    if (incident.lastEscalation) {
      events.push({ ts: incident.lastEscalation.at, type: "escalation", message: `Escalated to ${incident.lastEscalation.contact}`, incidentId: incident.id });
    }
    if (incident.status === "verified") {
      events.push({ ts: incident.timestamp + 60000, type: "verified", message: "Incident marked verified", incidentId: incident.id });
    }
    if (incident.status === "resolved") {
      events.push({ ts: incident.timestamp + 120000, type: "resolved", message: "Incident marked resolved", incidentId: incident.id });
    }
  }
  events.sort((a, b) => b.ts - a.ts);

  return `
    <div class="audit-screen">
      <div class="card">
        <div class="flex-between">
          <h2>Audit log</h2>
          <span class="badge badge-monitor">${events.length} events</span>
        </div>
        <p class="mu">Chronological record of all system events.</p>
      </div>

      <div style="max-height:600px; overflow-y:auto;">
        ${events.length > 0 ? events.map(event => `
          <div class="incident-item">
            <div class="incident-text">
              <div class="incident-title">${esc(event.message)}</div>
              <div class="incident-meta">
                ${formatTimeAgo(event.ts)} · ${esc(event.type)}
                ${event.incidentId ? `· ${esc(event.incidentId)}` : ""}
              </div>
            </div>
          </div>
        `).join('') : `
          <div class="card text-center" style="padding:40px 20px;">
            <div style="font-size:48px; margin-bottom:12px;">📋</div>
            <h3>No audit events</h3>
            <p class="mu">Events will appear here as incidents are created and managed.</p>
          </div>
        `}
      </div>
    </div>
  `;
}
