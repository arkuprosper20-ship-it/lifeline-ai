// LIFELINE AI — Coordination dashboard (admin view)
import { getState, store } from "../store.js";
import { getEnabledContacts, getRecommendedContact } from "../contacts.js";
import { createLocationLink } from "../location.js";
import { esc, formatTimeAgo } from "../ui.js";
import { INCIDENT_TYPES, INCIDENT_STATUS_LABELS, URGENCY_LABELS } from "../types.js";

export function initCoordinationScreen() {
  const incidents = getState().incidents;
  const activeCount = incidents.filter(i => i.status === "active" || i.status === "verify").length;
  const urgentCount = incidents.filter(i => i.urgency === "urgent" || i.urgency === "immediate").length;
  const needsVerify = incidents.filter(i => i.status === "verify").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved").length;

  const recentEscalations = incidents
    .filter(i => i.lastEscalation)
    .sort((a, b) => b.lastEscalation.at - a.lastEscalation.at)
    .slice(0, 5);

  return `
    <div class="coordination-dashboard">
      <div class="card">
        <div class="flex-between">
          <h2>Coordination Center</h2>
          <span class="badge badge-ready">ADMIN</span>
        </div>
        <p class="mu" style="margin-bottom:4px;">Community incident coordination dashboard.</p>
        <div class="text-small text-muted">
          ${getState().isOnline ? "● Online" : "○ Offline mode"}
        </div>
      </div>

      <div class="grid grid-cols-4">
        <div class="card text-center">
          <div class="text-large">${activeCount}</div>
          <div class="text-small text-muted">Active incidents</div>
        </div>
        <div class="card text-center">
          <div class="text-large" style="color:var(--status-urgent);">${urgentCount}</div>
          <div class="text-small text-muted">Urgent</div>
        </div>
        <div class="card text-center">
          <div class="text-large" style="color:var(--status-verify);">${needsVerify}</div>
          <div class="text-small text-muted">Needs verification</div>
        </div>
        <div class="card text-center">
          <div class="text-large" style="color:var(--status-ready);">${resolvedCount}</div>
          <div class="text-small text-muted">Resolved</div>
        </div>
      </div>

      <div class="card">
        <h3>Incident Map</h3>
        <div id="dashboard-map" style="height:300px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-primary);"></div>
        <p class="mu text-small" style="margin-top:8px;">Markers show incident locations. Click a marker for full details. Precise coordinates are visible to authorized coordinators only.</p>
      </div>

      <div class="card">
        <h3>Response contacts</h3>
        <div style="max-height:250px; overflow-y:auto;">
          ${getEnabledContacts().map(c => `
            <div class="incident-item">
              <div class="incident-text">
                <div class="incident-title">${esc(c.name)}</div>
                <div class="incident-meta">${esc(c.category)} · ${esc(c.phone || "no phone")}</div>
              </div>
              <span class="badge badge-ready">ENABLED</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h3>Recent escalations</h3>
        ${recentEscalations.length > 0 ? recentEscalations.map(incident => {
          const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: incident.type, icon: "📋" };
          return `
            <div class="incident-item">
              <span class="incident-type-icon">${typeInfo.icon}</span>
              <div class="incident-text">
                <div class="incident-title">${esc(incident.id)} — ${esc(typeInfo.label)}</div>
                <div class="incident-meta">
                  Escalation: ${esc(getStatusLabel(incident.status))} · ${formatTimeAgo(incident.lastEscalation.at)}
                </div>
              </div>
                 ${incident.lastEscalation && incident.lastEscalation.status === "SENT" ? `<span class="badge badge-ready">SMS sent</span>` : incident.lastEscalation && incident.lastEscalation.status === "COMPOSER_OPENED" ? `<span class="badge badge-warning">SMS composer opened</span>` : incident.lastEscalation ? `<span class="badge badge-monitor">${esc(incident.lastEscalation.status)}</span>` : ""}
            </div>
          `;
        }).join('') : '<p class="mu">No recent escalations.</p>'}
      </div>

      <div class="card">
        <h3>AI system health</h3>
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.8;">
          <div>Local rules engine: ● ONLINE</div>
          <div>Groq Cloud AI: ${getState().settings.mode === "local" || getState().settings.mode === "rules" ? "○ DISABLED" : getState().isOnline ? "● CHECKING…" : "○ UNAVAILABLE (offline)"}</div>
          <div>Offline sync queue: ${getState().syncQueue?.length || 0} pending</div>
        </div>
      </div>

      <div class="card">
        <h3>Quick actions</h3>
        <div class="btn-row">
          <button class="btn btn-secondary btn-sm" data-action="navigate" data-to="map">VIEW INCIDENT MAP</button>
          <button class="btn btn-secondary btn-sm" data-action="navigate" data-to="history">VIEW ALL INCIDENTS</button>
          <button class="btn btn-secondary btn-sm" data-action="navigate" data-to="contacts">MANAGE CONTACTS</button>
        </div>
      </div>
    </div>
  `;
}

function getStatusLabel(status) {
  return INCIDENT_STATUS_LABELS[status]?.label || status || "Unknown";
}
