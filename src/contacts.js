// LIFELINE AI - Contact directory and escalation logic
import { createLocationLink } from "./location.js";
import { INCIDENT_TYPES } from "./types.js";

const DEFAULT_CONTACTS = [
  { id: "fire-response", name: "Fire Response Team", category: "fire_response", phone: "tel:+1-555-0100", email: "", webhook: "", sms: true, call: true, enabled: true, priority: 1, coverage: "All zones", description: "Handles fire, smoke, and flame-related incidents." },
  { id: "medical-response", name: "Medical Response Team", category: "medical_response", phone: "tel:+1-555-0200", email: "", webhook: "", sms: true, call: true, enabled: true, priority: 2, coverage: "All zones", description: "Handles medical emergencies and injuries." },
  { id: "flooding-response", name: "Flood Management", category: "flooding_response", phone: "tel:+1-555-0300", email: "", webhook: "", sms: true, call: true, enabled: true, priority: 3, coverage: "Low-lying areas", description: "Handles flooding and water-related incidents." },
  { id: "road-response", name: "Road Maintenance", category: "road_hazard_response", phone: "tel:+1-555-0400", email: "", webhook: "", sms: true, call: true, enabled: true, priority: 4, coverage: "All streets", description: "Handles road obstructions and hazards." },
  { id: "power-response", name: "Utility Response", category: "power_response", phone: "tel:+1-555-0500", email: "", webhook: "", sms: true, call: true, enabled: true, priority: 5, coverage: "All zones", description: "Handles power outages and electrical hazards." },
  { id: "environmental-response", name: "Environmental Safety", category: "environmental_response", phone: "tel:+1-555-0600", email: "", webhook: "", sms: false, call: true, enabled: true, priority: 6, coverage: "All zones", description: "Handles building damage, environmental hazards." },
  { id: "security-response", name: "Security Team", category: "security_response", phone: "tel:+1-555-0700", email: "", webhook: "", sms: false, call: true, enabled: true, priority: 7, coverage: "All zones", description: "Handles security concerns." },
  { id: "community-coordinator", name: "Community Coordinator", category: "community_coordinator", phone: "tel:+1-555-0800", email: "", webhook: "", sms: true, call: false, enabled: true, priority: 8, coverage: "All zones", description: "General community coordination and assistance." },
  { id: "general", name: "General Contact", category: "general", phone: "tel:+1-555-0900", email: "", webhook: "", sms: false, call: true, enabled: true, priority: 99, coverage: "All zones", description: "General inquiries and other reports." },
];

export function getContacts() {
  try {
    const saved = localStorage.getItem("lifeline.contacts.v1");
    if (saved) return JSON.parse(saved);
  } catch { }
  return DEFAULT_CONTACTS;
}

export function saveContacts(contacts) {
  try { localStorage.setItem("lifeline.contacts.v1", JSON.stringify(contacts)); } catch { }
  return contacts;
}

export function resetToDefaultContacts() {
  return saveContacts(DEFAULT_CONTACTS);
}

export function getContactById(id) {
  return getContacts().find(c => c.id === id);
}

export function getContactByCategory(category) {
  const contacts = getContacts();
  const enabledContacts = contacts.filter(c => c.enabled);
  const match = enabledContacts.find(c => c.category === category);
  if (match) return match;
  const general = enabledContacts.find(c => c.category === "general");
  if (general) return general;
  return contacts.find(c => c.category === category) || contacts.find(c => c.category === "general") || null;
}

export function getEnabledContacts() {
  return getContacts().filter(c => c.enabled);
}

export function getRecommendedContact(incidentType) {
  const categoryMap = {
    fire_smoke: "fire_response",
    medical: "medical_response",
    flooding: "flooding_response",
    road_hazard: "road_hazard_response",
    power_hazard: "power_response",
    environmental: "environmental_response",
    security: "security_response",
    missing_person: "community_coordinator",
    community_assistance: "community_coordinator",
    unknown: "general",
  };
  const category = categoryMap[incidentType] || "general";
  return getContactByCategory(category);
}

export function getAvailableChannels(contact) {
  const channels = [];
  if (contact.call && contact.phone) channels.push({ type: "call", label: "CALL", icon: "[PHONE]", available: true });
  if (contact.sms && contact.phone) channels.push({ type: "sms", label: "SMS", icon: "[SMS]", available: true });
  if (contact.email) channels.push({ type: "email", label: "EMAIL", icon: "[EMAIL]", available: typeof contact.email === "string" && contact.email !== "" });
  if (contact.webhook) channels.push({ type: "webhook", label: "WEBHOOK", icon: "[WEBHOOK]", available: typeof contact.webhook === "string" && contact.webhook !== "" });
  return channels;
}

export function buildIncidentPackage(incident) {
  const location = incident.location;
  let locationSection = "NOT CAPTURED";
  let mapLink = null;
  let locationType = "unknown";

  if (location && location.latitude !== undefined && location.longitude !== undefined) {
    mapLink = createLocationLink(location.latitude, location.longitude);
    locationType = location.source || "gps";
    locationSection = `Lat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}\nAccuracy: ${location.accuracy ? `+/-${Math.round(location.accuracy)}m` : "Unknown"}\nType: ${location.sourceLabel || locationType}`;
  } else if (location && location.description) {
    locationSection = location.description;
    locationType = "text";
  }

  const typeLabel = INCIDENT_TYPES.find(t => t.id === incident.type)?.label || incident.type || "Unknown";
  const obsLines = (incident.observations || []).map(o => `- ${o}`).join("\n");
  const missingLines = (incident.missingInfo || []).map(m => `- ${m}`).join("\n");

  return {
    incidentId: incident.id,
    type: incident.type,
    typeLabel,
    urgency: incident.urgency,
    status: incident.status,
    time: new Date(incident.timestamp).toISOString(),
    observations: incident.observations || [],
    missingInfo: incident.missingInfo || [],
    location,
    locationType,
    locationSection,
    mapLink,
    summary: incident.summary || "",
    textMessage: buildTextMessage(incident, typeLabel, obsLines, missingLines, locationSection, mapLink),
    smsMessage: buildSMSMessage(incident, typeLabel, obsLines, mapLink),
    emailSubject: buildEmailSubject(incident, typeLabel),
    emailBody: buildEmailBody(incident, typeLabel, obsLines, missingLines, locationSection, mapLink),
    webhookPayload: buildWebhookPayload(incident, typeLabel, locationSection, mapLink),
  };
}

function buildTextMessage(incident, typeLabel, obsLines, missingLines, locationSection, mapLink) {
  let msg = `LIFELINE INCIDENT ${incident.id}\n\n${typeLabel}\n\nTime: ${new Date(incident.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}\n\nOBSERVATIONS\n${obsLines || "- None reported"}\n\n`;
  if (missingLines) msg += `MISSING\n${missingLines}\n\n`;
  msg += `LOCATION\n${locationSection}`;
  if (mapLink) msg += `\n\nMAP: ${mapLink}`;
  msg += "\n\nStatus: Needs verification\n\nThis information was generated from a community report and has not been independently verified. If this is an emergency, contact your local emergency services immediately.";
  return msg;
}

function buildSMSMessage(incident, typeLabel, obsLines, mapLink) {
  let msg = `LIFELINE ${incident.id} — ${typeLabel}`;
  if (mapLink) msg += `\nLocation: ${mapLink}`;
  if (obsLines) msg += `\n\n${obsLines.split("\n").slice(0, 3).join("\n")}`;
  msg += "\n\nNeeds verification.";
  if (msg.length > 1500) msg = msg.slice(0, 1497) + "...";
  return msg;
}

function buildEmailSubject(incident, typeLabel) {
  return `LIFELINE ${incident.id} — ${typeLabel}${incident.urgency === "urgent" || incident.urgency === "immediate" ? " — URGENT" : ""}`;
}

function buildEmailBody(incident, typeLabel, obsLines, missingLines, locationSection, mapLink) {
  return `
LIFELINE INCIDENT

${typeLabel.toUpperCase()}
Urgency: ${incident.urgency?.toUpperCase() || "N/A"}
ID: ${incident.id}

REPORT TIME: ${new Date(incident.timestamp).toLocaleString()}

OBSERVATIONS
${obsLines || "No observations recorded."}

${missingLines ? "MISSING INFORMATION\n" + missingLines + "\n\n" : ""}LOCATION
${locationSection}

${mapLink ? "MAP LINK\n" + mapLink + "\n\n" : ""}STATUS
Needs verification

IMPORTANT:
This information was generated from a community-submitted
report and has not been independently verified. If this
is an emergency, contact your local emergency services
immediately.

— LIFELINE AI
`;
}

function buildWebhookPayload(incident, typeLabel, locationSection, mapLink) {
  return {
    incidentId: incident.id,
    type: incident.type,
    typeLabel: typeLabel,
    urgency: incident.urgency,
    status: incident.status,
    reportedAt: new Date(incident.timestamp).toISOString(),
    observations: incident.observations || [],
    missingInfo: incident.missingInfo || [],
    location: incident.location || null,
    locationUrl: mapLink || null,
    summary: incident.summary || "",
    source: "community-report",
  };
}

export function determineSafetyOverride(urgency, type, observations) {
  if (type === "fire_smoke" && observations.some(o => o.includes("smoke") || o.includes("fire"))) return "immediate";
  if (type === "medical" && observations.some(o => o.includes("injured") || o.includes("unconscious") || o.includes("bleeding"))) return "immediate";
  if (type === "power_hazard" && observations.some(o => o.includes("spark") || o.includes("down"))) return "urgent";
  return urgency;
}

export { DEFAULT_CONTACTS as getDefaultContacts };
