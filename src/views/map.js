// LIFELINE AI — Map screen
import { getState } from "../store.js";
import { createLocationLink } from "../location.js";
import { esc, createLeafletMap } from "../ui.js";
import { INCIDENT_TYPES, INCIDENT_STATUS_LABELS } from "../types.js";
import { findRelatedIncidents } from "../analyzer.js";

export function initMapScreen() {
  const state = getState();
  const hasIncidents = state.incidents.length > 0;
  const firstIncident = state.incidents[0];
  const centerLat = firstIncident?.location?.latitude || 0;
  const centerLng = firstIncident?.location?.longitude || 0;

  return `
    <div class="map-screen">
      <div class="card">
        <h2>Incident map</h2>
        <p class="mu">${state.incidents.length} incidents ${state.isOnline ? "· ● SYNCED" : "· ○ OFFLINE"}</p>
      </div>

      <div id="incident-map" style="height:500px; margin-bottom:16px;">
        ${hasIncidents ? `<div style="padding:20px; color:var(--text-secondary);">Loading map…</div>` : `
          <div class="card text-center" style="padding:40px 20px;">
            <div style="font-size:48px; margin-bottom:12px;">🗺️</div>
            <h3>No incidents to display</h3>
            <p class="mu">Incidents with locations will appear on the map when available.</p>
          </div>`}
      </div>

      ${hasIncidents ? `
      <div class="card">
        <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">LEGEND</h3>
        <div class="flex-center" style="flex-wrap:wrap; gap:16px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:12px; height:12px; border-radius:50%; background:var(--status-urgent);"></span>
            <span class="text-small">Urgent</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:12px; height:12px; border-radius:50%; background:var(--status-verify);"></span>
            <span class="text-small">Needs verification</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:12px; height:12px; border-radius:50%; background:var(--status-resolved);"></span>
            <span class="text-small">Resolved</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:12px; height:12px; border-radius:50%; background:var(--status-monitor);"></span>
            <span class="text-small">Reported</span>
          </div>
        </div>
      </div>

       <div class="card">
        <div style="max-height:300px; overflow-y:auto;">
          ${state.incidents.slice(0, 10).map(incident => {
            const typeInfo = INCIDENT_TYPES.find(t => t.id === incident.type) || { label: incident.type, icon: "📋" };
            const statusInfo = INCIDENT_STATUS_LABELS[incident.status] || { label: incident.status };
            const mapLink = incident.location && incident.location.latitude !== undefined
              ? createLocationLink(incident.location.latitude, incident.location.longitude)
              : null;
            return `
              <div class="incident-item">
                <span class="incident-type-icon">${typeInfo.icon}</span>
                <div class="incident-text">
                  <div class="incident-title">${esc(typeInfo.label)}</div>
                  <div class="incident-meta">${esc(incident.id)} · ${esc(statusInfo.label)}</div>
                </div>
                ${mapLink ? `<a href="${mapLink}" target="_blank" rel="noopener" class="text-small" style="color:var(--accent);">OPEN</a>` : ""}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${(() => {
        const related = findRelatedIncidents(state.incidents);
        if (related.length === 0) return "";
        return `
      <div class="card">
        <h3>Possibly related incidents</h3>
        <p class="mu text-small">These reports may describe the same event. Clustering is probabilistic.</p>
        ${related.slice(0, 3).map(group => {
          const confidence = Math.round(group.confidence * 100);
          return `
          <div style="margin-bottom:12px;">
            <div class="mu text-small" style="font-size:12px; margin-bottom:4px;">
              Confidence: ${confidence}%
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${group.incidents.map(inc => `<span class="badge badge-verify" style="font-size:11px;">${esc(inc.id)}</span>`).join('')}
            </div>
            <div class="text-small text-muted" style="margin-top:4px;">${esc(group.reason)}</div>
          </div>
          `;
        }).join('')}
      </div>`;
      })()}` : ""}
    </div>
  `;
}

export function setupMap() {
  const mapContainer = document.getElementById("incident-map");
  if (!mapContainer || typeof L === "undefined") {
    loadLeafletAndInit();
    return;
  }
  initMap();
}

function loadLeafletAndInit() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.5/dist/leaflet.css";
  link.onload = () => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.5/dist/leaflet.js";
    script.onload = () => initMap();
    document.head.appendChild(script);
  };
  document.head.appendChild(link);
}

function initMap() {
  const state = getState();
  if (!state.incidents.length) return;

  const firstWithLocation = state.incidents.find(i => i.location?.latitude !== undefined);
  const center = firstWithLocation
    ? [firstWithLocation.location.latitude, firstWithLocation.location.longitude]
    : [0, 0];

  const map = L.map("incident-map").setView(center, firstWithLocation ? 12 : 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  state.incidents.forEach(incident => {
    if (!incident.location?.latitude) return;
    const color = getMarkerColor(incident.urgency);
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px; height:24px; border-radius:50%; background:${color}; border:2px solid #fff; box-shadow:0 0 6px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:12px;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
    const popupContent = `
      <div style="font-size:13px;">
        <h4 style="margin:0 0 4px; font-weight:600;">${esc(incident.id)}</h4>
        <p style="margin:2px 0; font-size:12px;">${esc(INCIDENT_TYPES.find(t => t.id === incident.type)?.label || incident.type)}</p>
        <p style="margin:2px 0; font-size:12px; color:#888;">${esc(incident.urgency || "")}</p>
        <a href="${createLocationLink(incident.location.latitude, incident.location.longitude)}" target="_blank" rel="noopener" style="font-size:11px; color:#3b82f6;">OPEN MAP →</a>
      </div>
    `;
    L.marker([incident.location.latitude, incident.location.longitude], { icon })
      .addTo(map)
      .bindPopup(popupContent);
  });
}

function getMarkerColor(urgency) {
  const map = { immediate: "#ef4444", urgent: "#f97316", verify: "#f59e0b", monitor: "#3b82f6", information: "#22c55e" };
  return map[urgency] || "#6b7280";
}
