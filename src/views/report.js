// LIFELINE AI — Report screen
import { getState, store } from "../store.js";
import { MAX_REPORT_LENGTH } from "../types.js";
import { formatTimeAgo, esc } from "../ui.js";

export function initReportScreen() {
  const state = getState();
  return `
    <div class="report-screen">
      <div class="card">
        <h2 style="font-size:24px; margin-bottom:4px;">What's happening?</h2>
        <p class="mu">Describe the situation or upload what you are seeing. Your report helps coordinate a response.</p>
      </div>

      <div class="card">
        <div class="formgroup">
          <label for="report-text">Describe what you observed</label>
          <textarea id="report-text" name="text" class="form-textarea form-input" placeholder="Describe what you saw: smoke, injuries, road blockage, location, time..." maxlength="${MAX_REPORT_LENGTH}" rows="5">${esc(state.ui.savedReportText || "")}</textarea>
        </div>

        <div class="btn-row" style="margin: 12px 0;">
          <button type="button" class="btn btn-secondary" id="voice-btn" data-action="voice-input">
            🎙 Voice
          </button>
          <button type="button" class="btn btn-secondary" id="image-btn" data-action="image-input">
            📷 Image
          </button>
          <button type="button" class="btn btn-secondary" id="location-btn" data-action="capture-location">
            📍 Location
          </button>
        </div>

        ${state.ui.imagePreview ? `
        <div class="card" style="margin-top: 12px;">
          <p class="mu">Image evidence:</p>
          <img src="${state.ui.imagePreview}" alt="Captured image" style="max-width:100%; border-radius:8px; margin-top:8px;" />
          <div class="btn-row" style="margin-top:8px;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="remove-image">Remove image</button>
          </div>
        </div>` : ''}

        ${state.ui.locationText ? `
        <p class="mu" style="margin-top:8px;">📍 ${esc(state.ui.locationText)}</p>` : ''}

        ${state.ui.voiceText ? `
        <p class="mu" style="margin-top:8px;">🎙 ${esc(state.ui.voiceText)}</p>` : ''}

        <div class="divider"></div>

        <div class="btn-row full-width">
          <button type="button" class="btn btn-primary" id="analyze-btn" data-action="analyze-report" ${!(state.ui.reportText || "").trim() ? "disabled" : ""}>
            ANALYZE REPORT
          </button>
        </div>
      </div>

      ${state.incidents.length > 0 ? `
      <div class="card">
        <h3>Recent incidents</h3>
        ${state.incidents.slice(0, 3).map(incident => `
          <div class="incident-item">
            <span class="incident-type-icon">${getTypeIcon(incident.type)}</span>
            <div class="incident-text">
              <div class="incident-title">${esc(incident.typeLabel || incident.type)}</div>
              <div class="incident-meta">${formatTimeAgo(incident.timestamp)} · ${esc(incident.observations?.slice(0, 2).join(", ") || "")}</div>
            </div>
            <span class="badge ${getStatusBadge(incident.status)}">${getStatusLabel(incident.status)}</span>
          </div>
        `).join('')}
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;" data-action="navigate" data-to="history">
          View all incidents
        </button>
      </div>` : ''}
    </div>
  `;
  return html;
}

function getTypeIcon(type) {
  const icons = { fire_smoke: "🔥", medical: "🏥", flooding: "🌊", road_hazard: "🚧", power_hazard: "⚡", environmental: "🏗️", security: "⚠️", missing_person: "🔍", community_assistance: "🤝", unknown: "❓" };
  return icons[type] || "📋";
}

function getStatusBadge(status) {
  const map = { reported: "badge-monitor", active: "badge-urgent", verify: "badge-verify", verified: "badge-ready", resolved: "badge-resolved", false_alarm: "badge-gray" };
  return map[status] || "badge-gray";
}

function getStatusLabel(status) {
  const map = { reported: "Reported", active: "Active", verify: "Needs Verification", verified: "Verified", resolved: "Resolved", false_alarm: "False Alarm" };
  return map[status] || "Unknown";
}
