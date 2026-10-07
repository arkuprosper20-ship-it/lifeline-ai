// LIFELINE AI - Core types and constants

export const INCIDENT_TYPES = [
  { id: "fire_smoke", label: "Fire / Smoke", icon: "[FIRE]", color: "type-fire" },
  { id: "medical", label: "Medical concern", icon: "[HOSPITAL]", color: "type-medical" },
  { id: "flooding", label: "Flooding", icon: "[FLOOD]", color: "type-flooding" },
  { id: "road_hazard", label: "Road obstruction", icon: "[ROAD]", color: "type-road" },
  { id: "power_hazard", label: "Power/Electrical", icon: "[POWER]", color: "type-power" },
  { id: "environmental", label: "Building/Environmental", icon: "[BUILD]", color: "type-environmental" },
  { id: "security", label: "Security concern", icon: "[WARN]️", color: "type-security" },
  { id: "missing_person", label: "Missing person/pet", icon: "[SEARCH]", color: "type-missing" },
  { id: "community_assistance", label: "Community assistance", icon: "[HELP]", color: "type-community" },
  { id: "unknown", label: "Other/unknown", icon: "[?]", color: "type-other" },
];

export const URGENCY_LEVELS = ["information", "monitor", "verify", "urgent", "immediate"];

export const URGENCY_LABELS = {
  information: { label: "No escalation", color: "badge-ready", description: "No escalation recommended." },
  monitor: { label: "Monitor", color: "badge-monitor", description: "Situation may need observation." },
  verify: { label: "Verify", color: "badge-verify", description: "Additional information or human verification required." },
  urgent: { label: "Urgent", color: "badge-urgent", description: "Prompt contact with appropriate response may be appropriate." },
  immediate: { label: "Immediate", color: "badge-immediate", description: "Report may indicate an immediate threat." },
};

export const INCIDENT_STATUS = ["reported", "active", "verify", "verified", "resolved", "false_alarm"];

export const INCIDENT_STATUS_LABELS = {
  reported: { label: "Reported", color: "badge-monitor" },
  active: { label: "Active", color: "badge-urgent" },
  verify: { label: "Needs Verification", color: "badge-verify" },
  verified: { label: "Verified", color: "badge-ready" },
  resolved: { label: "Resolved", color: "badge-resolved" },
  false_alarm: { label: "False Alarm", color: "badge-gray" },
};

export const RESPONSE_CATEGORIES = [
  "fire_response", "medical_response", "flooding_response", "road_hazard_response",
  "power_response", "environmental_response", "security_response",
  "missing_person_response", "community_coordinator", "general"
];

export const LOCATION_SOURCES = {
  gps: { label: "EXACT GPS", type: "gps" },
  manual: { label: "MANUALLY ENTERED", type: "manual" },
  map_pin: { label: "MAP PIN", type: "map_pin" },
  text_derived: { label: "TEXT-DESCRIBED", type: "text" },
  unknown: { label: "UNKNOWN", type: "unknown" },
};

export const STORAGE_KEYS = {
  incidents: "lifeline.incidents.v1",
  contacts: "lifeline.contacts.v1",
  settings: "lifeline.settings.v1",
  syncQueue: "lifeline.syncqueue.v1",
  ui: "lifeline.ui.v1",
  auth: "lifeline.auth.v1",
  notifications: "lifeline.notifications.v1",
};

export const MAX_REPORT_LENGTH = 2000;

export function createIncidentId() {
  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LF-${now.toString(36).toUpperCase()}-${suffix}`;
}

export function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString([], { dateStyle: "medium" });
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
