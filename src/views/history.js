// LIFELINE AI - History screen
import { getState, store } from "../store.js";
import { formatTimeAgo, esc } from "../ui.js";
import { INCIDENT_TYPES, INCIDENT_STATUS_LABELS } from "../types.js";

export function initHistoryScreen() {
  const state = getState();
  const incidents = state.incidents;

  return `
    <div class="history-screen">
      <div class="card">
        <div class="flex-between">
          <h2>Incident history</h2>
          <span class="text-muted text-small">${incidents.length} total</span>
        </div>
      </div>

      ${incidents.length > 0 ? incidents.map(incident => {
        const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: incident.type, icon: "[LIST]" };
        const statusInfo = INCIDENT_STATUS_LABELS[incident.status] || { label: incident.status };
        return `
          <div class="incident-item">
            <span class="incident-type-icon">${typeInfo.icon}</span>
            <div class="incident-text">
              <div class="incident-title">${esc(typeInfo.label)}</div>
              <div class="incident-meta">${esc(incident.id)} . ${formatTimeAgo(incident.timestamp)}</div>
              ${incident.observations?.slice(0, 2).join(" . ")}
            </div>
            <span class="badge ${statusInfo.color}">${statusInfo.label}</span>
          </div>
        `;
      }).join('') : `
        <div class="card text-center" style="padding:40px 20px;">
          <div style="font-size:48px; margin-bottom:12px;">[HISTORY]</div>
          <h3>No incidents yet</h3>
          <p class="mu">Your reported incidents will appear here.</p>
        </div>
      `}
    </div>
  `;
}
