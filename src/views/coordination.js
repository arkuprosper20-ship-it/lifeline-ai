// LIFELINE AI - Coordination dashboard
import { getState, store } from "../store.js";
import { getEnabledContacts, getRecommendedContact } from "../contacts.js";
import { createLocationLink } from "../location.js";
import { esc, formatTimeAgo, showToast } from "../ui.js";
import { INCIDENT_TYPES, INCIDENT_STATUS_LABELS, URGENCY_LABELS } from "../types.js";
import { checkAllIncidentsSLA, getSLAStats, getSLAColor } from "../sla.js";

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
          ${getState().isOnline ? "● Online" : "[o] Offline mode"}
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
        <div class="flex-between">
          <h3>SLA Tracking</h3>
          <span class="badge ${getSLAColor({ urgency: "immediate" })}" style="font-size:11px;">RESPONSE TIMES</span>
        </div>
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.8;">
          ${(() => {
            const stats = getSLAStats(getState().incidents);
            const slaIncidents = checkAllIncidentsSLA(getState().incidents);
            if (!slaIncidents.length) {
              return "No active incidents requiring SLA tracking.";
            }
            return `
              <div style="margin-bottom:8px;">
                Total tracked: ${stats.total} . Breached: ${stats.breached} . Warning: ${stats.warning}
              </div>
              ${slaIncidents.slice(0, 5).map((s) => `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border);">
                  <span>${esc(s.incidentId)}</span>
                  <span style="color:${s.level === "critical" ? "var(--status-immediate)" : s.level === "warning" ? "var(--status-urgent)" : s.level === "caution" ? "var(--status-verify)" : "var(--status-ready)"}">
                    ${s.status.toUpperCase()} — ${s.elapsed} elapsed
                  </span>
                </div>
              `).join("")}
            `;
          })()}
        </div>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn btn-secondary btn-sm" id="generate-sla-report">Generate SLA Report</button>
          <button class="btn btn-secondary btn-sm" id="generate-incident-report">Generate Incident Report</button>
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
                <div class="incident-meta">${esc(c.category)} . ${esc(c.phone || "no phone")}</div>
              </div>
              <span class="badge badge-ready">ENABLED</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h3>Recent escalations</h3>
        ${recentEscalations.length > 0 ? recentEscalations.map(incident => {
          const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: incident.type, icon: "[LIST]" };
          return `
            <div class="incident-item">
              <span class="incident-type-icon">${typeInfo.icon}</span>
              <div class="incident-text">
                <div class="incident-title">${esc(incident.id)} — ${esc(typeInfo.label)}</div>
                <div class="incident-meta">
                  Escalation: ${esc(getStatusLabel(incident.status))} . ${formatTimeAgo(incident.lastEscalation.at)}
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
          <div>Groq Cloud AI: ${getState().settings.mode === "local" || getState().settings.mode === "rules" ? "[o] DISABLED" : getState().isOnline ? "● CHECKING..." : "[o] UNAVAILABLE (offline)"}</div>
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

export function setupCoordinationHandlers() {
  document.getElementById("generate-sla-report")?.addEventListener("click", () => {
    const { generateBatchReport, downloadReport } = window.LIFELINE_REPORTS || {};
    if (!generateBatchReport || !downloadReport) {
      showToast("Report module not available");
      return;
    }
    const activeIncidents = getState().incidents.filter(
      (i) => i.status === "reported" || i.status === "active" || i.status === "verify"
    );
    const report = generateBatchReport(activeIncidents, { format: "json" });
    downloadReport(JSON.stringify(report, null, 2), "sla-batch-report.json", "application/json");
    showToast("SLA report generated");
  });

  document.getElementById("generate-incident-report")?.addEventListener("click", () => {
    const { generateAfterActionReport, downloadReport } = window.LIFELINE_REPORTS || {};
    if (!generateAfterActionReport || !downloadReport) {
      showToast("Report module not available");
      return;
    }
    const incident = getState().incidents[0];
    if (!incident) {
      showToast("No incidents to report on");
      return;
    }
    const report = generateAfterActionReport(incident, { format: "markdown" });
    downloadReport(report, `incident-${incident.id}-report.md`, "text/markdown");
    showToast("Incident report generated");
  });
}

function getStatusLabel(status) {
  return INCIDENT_STATUS_LABELS[status]?.label || status || "Unknown";
}
