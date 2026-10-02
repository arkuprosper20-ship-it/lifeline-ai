// LIFELINE AI — Map helpers (pure, unit-testable, no DOM dependencies)
import {
  INCIDENT_TYPES,
  INCIDENT_STATUS_LABELS,
  URGENCY_LABELS,
  formatTimestamp,
  formatDate,
} from "./types.js";
import { createLocationLink, getAccuracyLabel } from "./location.js";

export const STATUS_MARKERS = {
  reported: { label: "REPORTED", icon: "\u{1F535}", color: "var(--status-monitor)", badge: "badge-monitor" },
  active: { label: "ACTIVE", icon: "\u{1F534}", color: "var(--status-urgent)", badge: "badge-urgent" },
  verify: { label: "NEEDS VERIFICATION", icon: "\u{1F7E1}", color: "var(--status-verify)", badge: "badge-verify" },
  verified: { label: "VERIFIED", icon: "\u{2705}", color: "var(--status-ready)", badge: "badge-ready" },
  resolved: { label: "RESOLVED", icon: "\u{2795}", color: "var(--status-resolved)", badge: "badge-resolved" },
  false_alarm: { label: "FALSE ALARM", icon: "\u{26AA}", color: "var(--text-tertiary)", badge: "badge-gray" },
};

export const URGENCY_COLORS = {
  immediate: "var(--status-immediate)",
  urgent: "var(--status-urgent)",
  verify: "var(--status-verify)",
  monitor: "var(--status-monitor)",
  information: "var(--status-ready)",
};

export function getIncidentType(incident) {
  return INCIDENT_TYPES.find((t) => t.id === incident.type) || {
    id: incident.type,
    label: incident.type || "Unknown",
    icon: "\u{1F4CB}",
  };
}

export function statusSpec(incident) {
  return STATUS_MARKERS[incident.status] || STATUS_MARKERS.reported;
}

export function urgencySpec(urgency) {
  return URGENCY_LABELS[urgency] || URGENCY_LABELS.information || { label: urgency || "Unknown", color: "badge-gray" };
}

export function hasCoords(incident) {
  const l = incident.location;
  if (!l) return false;
  const lat = Number(l.latitude);
  const lng = Number(l.longitude);
  return (
    typeof l.latitude === "number" &&
    typeof l.longitude === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function resolveLocation(incident, ctx = {}) {
  const l = incident.location || {};
  const plottable = hasCoords(incident);
  if (!plottable) {
    return { plottable: false, precise: false, lat: null, lng: null, accuracy: l.accuracy, timestamp: l.timestamp, source: l.source, sourceLabel: l.sourceLabel, privacy: l.privacy || "private", publicDisplay: false };
  }
  const isPrivate = l.privacy === "private";
  const isCoordinator = ctx.coordinator === true;
  const publicOk = l.privacy === "public" || l.privacy === "approximate" || l.privacy === undefined;
  return {
    plottable: publicOk || isCoordinator,
    precise: !isPrivate || isCoordinator,
    lat: l.latitude,
    lng: l.longitude,
    accuracy: l.accuracy,
    timestamp: l.timestamp,
    source: l.source,
    sourceLabel: l.sourceLabel || (l.source ? LOCATION_SOURCE_LABEL[l.source] : undefined),
    privacy: l.privacy || (publicOk ? "public" : "private"),
    publicDisplay: !isPrivate || isCoordinator,
  };
}

const LOCATION_SOURCE_LABEL = {
  gps: "EXACT GPS",
  manual: "MANUALLY ENTERED",
  map_pin: "MAP PIN",
  text: "TEXT-DESCRIBED",
  text_derived: "TEXT-DESCRIBED",
  unknown: "UNKNOWN",
};

export function isLocationPlottable(incident, ctx = {}) {
  return resolveLocation(incident, ctx).plottable;
}

export function plottableIncidents(incidents, ctx = {}) {
  return incidents.filter((i) => isLocationPlottable(i, ctx)).map((i) => ({ ...i, loc: resolveLocation(i, ctx) }));
}

export function applyFilters(incidents, filters = {}) {
  return incidents.filter((i) => {
    if (filters.category && filters.category !== "all" && i.type !== filters.category) return false;
    if (filters.urgency && filters.urgency !== "all" && i.urgency !== filters.urgency) return false;
    if (filters.status && filters.status !== "all" && i.status !== filters.status) return false;
    return true;
  });
}

export function searchIncidents(incidents, query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return incidents;
  return incidents.filter((i) => {
    const typeInfo = getIncidentType(i);
    const text = [
      i.id,
      typeInfo.label,
      i.summary,
      ...(i.observations || []),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  });
}

export function dashboardGroups(incidents) {
  return {
    active: incidents.filter((i) => i.status === "active" || i.urgency === "urgent" || i.urgency === "immediate"),
    verify: incidents.filter((i) => i.status === "verify"),
    verified: incidents.filter((i) => i.status === "verified"),
    resolved: incidents.filter((i) => i.status === "resolved"),
  };
}

export function getCategoryOptions() {
  return [
    { value: "all", label: "All" },
    ...INCIDENT_TYPES.map((t) => ({ value: t.id, label: t.label, icon: t.icon })),
  ];
}

export function getUrgencyOptions() {
  return [
    { value: "all", label: "All urgency" },
    { value: "immediate", label: "Immediate" },
    { value: "urgent", label: "Urgent" },
    { value: "verify", label: "Verify" },
    { value: "monitor", label: "Monitor" },
    { value: "information", label: "Information" },
  ];
}

export function getStatusOptions() {
  return [
    { value: "all", label: "All status" },
    { value: "reported", label: "Reported" },
    { value: "verify", label: "Needs verification" },
    { value: "verified", label: "Verified" },
    { value: "resolved", label: "Resolved" },
    { value: "false_alarm", label: "False alarm" },
  ];
}

export function getDemoIncidents(now = Date.now()) {
  return [
    {
      id: "LF-DEMO-001",
      type: "fire_smoke",
      typeLabel: "Fire / Smoke",
      urgency: "urgent",
      status: "verify",
      observations: ["Heavy smoke from a building", "Road partially blocked"],
      summary: "Smoke reported from a building near the market. Road obstruction reported alongside.",
      location: { latitude: 51.5085, longitude: -0.1257, accuracy: 14, timestamp: now - 3 * 60000, source: "gps", sourceLabel: "EXACT GPS", privacy: "public", description: "near the market" },
      timestamp: now - 3 * 60000,
      provider: "local",
      source: "local",
      confidence: 0.82,
      isDemo: true,
      synced: true,
    },
    {
      id: "LF-DEMO-002",
      type: "flooding",
      typeLabel: "Flooding",
      urgency: "monitor",
      status: "reported",
      observations: ["Water accumulating on road", "Minor flooding"],
      summary: "Water accumulation on the main road after heavy rain.",
      location: { latitude: 51.512, longitude: -0.118, accuracy: 42, timestamp: now - 50 * 60000, source: "gps", sourceLabel: "EXACT GPS", privacy: "public", description: "near the bridge" },
      timestamp: now - 50 * 60000,
      provider: "local",
      source: "local",
      confidence: 0.65,
      isDemo: true,
      synced: true,
    },
    {
      id: "LF-DEMO-003",
      type: "power_hazard",
      typeLabel: "Power / Electrical",
      urgency: "immediate",
      status: "verify",
      observations: ["Downed power line", "Sparking"],
      summary: "Downed power line sparking near a community center. Hazard to residents.",
      location: { latitude: 51.503, longitude: -0.133, accuracy: 9, timestamp: now - 12 * 60000, source: "gps", sourceLabel: "EXACT GPS", privacy: "public", description: "near community center" },
      timestamp: now - 12 * 60000,
      provider: "local",
      source: "local",
      confidence: 0.9,
      isDemo: true,
      synced: true,
    },
  ];
}

export function computeBounds(incidents) {
  const items = plottableIncidents(incidents);
  if (!items.length) return null;
  const lats = items.map((i) => i.loc.lat);
  const lngs = items.map((i) => i.loc.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function incidentDetailFields(incident) {
  const l = incident.location || {};
  const coordsOk = hasCoords(incident);
  const mapLink = coordsOk ? createLocationLink(l.latitude, l.longitude) : null;
  const typeInfo = getIncidentType(incident);
  const urgencyInfo = urgencySpec(incident.urgency);
  const statusInfo = statusSpec(incident);
  return [
    { label: "INCIDENT ID", value: incident.id },
    { label: "WHAT HAPPENED", value: incident.summary || (incident.observations || []).join(", ") || "—" },
    { label: "CATEGORY", value: typeInfo.label, icon: typeInfo.icon },
    { label: "URGENCY", value: urgencyInfo.label },
    { label: "STATUS", value: statusInfo.label },
    { label: "REPORTED", value: incident.timestamp ? `${formatDate(incident.timestamp)} ${formatTimestamp(incident.timestamp)}` : "—" },
    { label: "LOCATION", value: l.description || (coordsOk ? `${Number(l.latitude).toFixed(6)}, ${Number(l.longitude).toFixed(6)}` : "Not provided") },
    { label: "ACCURACY", value: l.accuracy ? `±${Math.round(l.accuracy)}m — ${getAccuracyLabel(l.accuracy)}` : "Unknown" },
    { label: "SOURCE", value: l.sourceLabel || LOCATION_SOURCE_LABEL[l.source] || l.source || "Unknown" },
    { label: "AI/FALLBACK ANALYSIS", value: incident.provider ? `${incident.provider}${incident.fallbackFrom ? " (fallback)" : ""}` : "—" },
    { label: "RECOMMENDED RESPONSE", value: incident.recoContact?.name || incident.responseLabel || "—" },
    { label: "LOCATION LINK", value: mapLink || "No coordinates", type: "link", link: !!mapLink },
    { label: "ATTACHMENTS", value: incident.imagePreview || (incident.images && incident.images.length) ? "Image attached" : "None" },
    { label: "AUDIT HISTORY", value: Array.isArray(incident.auditLog) && incident.auditLog.length ? incident.auditLog : "No audit entries", type: "list" },
  ];
}

export function filterStats(incidents, ctx = {}) {
  return {
    total: incidents.length,
    withLocation: incidents.filter((i) => isLocationPlottable(i, ctx)).length,
    private: incidents.filter((i) => i.location && i.location.privacy === "private").length,
  };
}
