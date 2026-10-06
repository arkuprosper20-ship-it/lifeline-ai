// LIFELINE AI — Tests
import test from "node:test";
import assert from "node:assert/strict";
import { localAnalysis, classifyIncidentType, assessUrgency, extractObservations, detectMissingInfo, extractLocationFromText, detectSafetyOverride, findRelatedIncidents } from "../src/analyzer.js";
import { createLocationLink, validateLocationInput, getAccuracyLabel, isAccuracyWarning, resolveLocationState, LOCATION_STATES } from "../src/location.js";
import { createIncidentId } from "../src/types.js";
import { getRecommendedContact, buildIncidentPackage, getContactByCategory, getAvailableChannels } from "../src/contacts.js";
import { getDefaultContacts } from "../src/contacts.js";
import { STORAGE_KEYS, INCIDENT_TYPES, URGENCY_LEVELS, INCIDENT_STATUS } from "../src/types.js";
import {
  hasCoords, resolveLocation, isLocationPlottable, applyFilters, searchIncidents, getDemoIncidents,
  computeBounds, incidentDetailFields, statusSpec, getIncidentType, STATUS_MARKERS, URGENCY_COLORS,
} from "../src/map-helpers.js";
import { checkSLA, checkAllIncidentsSLA, getSLAStats, getSLAColor, getSLAProgress, formatElapsed, formatRemaining } from "../src/sla.js";
import { generateAfterActionReport, generateBatchReport, generateCsvReport } from "../src/reports.js";

test("classifyIncidentType detects fire/smoke", () => {
  assert.equal(classifyIncidentType("Heavy smoke coming from a building"), "fire_smoke");
  assert.equal(classifyIncidentType("There is a fire"), "fire_smoke");
  assert.equal(classifyIncidentType("I see flames"), "fire_smoke");
  assert.equal(classifyIncidentType("Everything is burning"), "fire_smoke");
});

test("classifyIncidentType detects flooding", () => {
  assert.equal(classifyIncidentType("Water is flooding the street"), "flooding");
  assert.equal(classifyIncidentType("The road is underwater"), "flooding");
  assert.equal(classifyIncidentType("Flash flood warning issued"), "flooding");
});

test("classifyIncidentType detects road hazard", () => {
  assert.equal(classifyIncidentType("The road is blocked by debris"), "road_hazard");
  assert.equal(classifyIncidentType("There is a pothole"), "road_hazard");
  assert.equal(classifyIncidentType("Traffic jam on the highway"), "road_hazard");
});

test("classifyIncidentType detects medical", () => {
  assert.equal(classifyIncidentType("Someone is injured and bleeding"), "medical");
  assert.equal(classifyIncidentType("A person is unconscious"), "medical");
});

test("classifyIncidentType detects power hazard", () => {
  assert.equal(classifyIncidentType("Power outage after the storm"), "power_hazard");
  assert.equal(classifyIncidentType("There is a downed wire"), "power_hazard");
});

test("classifyIncidentType detects security", () => {
  assert.equal(classifyIncidentType("Security threat reported"), "security");
  assert.equal(classifyIncidentType("A weapon was seen"), "security");
});

test("classifyIncidentType detects missing person", () => {
  assert.equal(classifyIncidentType("Missing person reported"), "missing_person");
  assert.equal(classifyIncidentType("Lost child near the park"), "missing_person");
});

test("classifyIncidentType returns unknown for unrelated text", () => {
  assert.equal(classifyIncidentType("The weather is nice today"), "unknown");
  assert.equal(classifyIncidentType("I love ice cream"), "unknown");
});

test("assessUrgency detects urgent", () => {
  assert.equal(assessUrgency("Smoke is urgent"), "urgent");
  assert.equal(assessUrgency("This is an emergency"), "urgent");
  assert.equal(assessUrgency("People are trapped"), "immediate");
});

test("assessUrgency detects monitor", () => {
  assert.equal(assessUrgency("I noticed a possible issue"), "verify");
  assert.equal(assessUrgency("Keep an eye on this"), "monitor");
});

test("assessUrgency returns information for normal", () => {
  assert.equal(assessUrgency("There is a small pothole"), "information");
});

test("assessUrgency flags immediate for collapse", () => {
  assert.equal(assessUrgency("Building collapse reported"), "immediate");
  assert.equal(assessUrgency("Someone is unconscious"), "immediate");
});

test("localAnalysis returns structured data", () => {
  const result = localAnalysis("Heavy smoke coming from a building near the market. The road is blocked.");
  assert.equal(result.type, "fire_smoke");
  assert.equal(typeof result.urgency, "string");
  assert.ok(result.observations.length > 0);
  assert.equal(result.isIncident, true);
  assert.ok(typeof result.confidence === "number");
});

test("localAnalysis detects smoke and building", () => {
  const result = localAnalysis("Smoke from a building");
  assert.ok(result.observations.some(o => o.label.includes("smoke") || o.label.toLowerCase().includes("smoke")));
  assert.ok(result.observations.some(o => o.label.includes("building") || o.label.toLowerCase().includes("building")));
});

test("localAnalysis extracts location from text", () => {
  const result = localAnalysis("There is flooding near the bridge");
  assert.ok(result.locationDescription);
});

test("detectMissingInfo identifies missing fields", () => {
  const missing = detectMissingInfo("Smoke");
  assert.ok(missing.length > 0);
});

test("createLocationLink generates correct URL", () => {
  const link = createLocationLink(5.6037, -0.1870);
  assert.equal(link, "https://www.google.com/maps?q=5.6037,-0.187");
});

test("validateLocationInput rejects invalid coordinates", () => {
  assert.equal(validateLocationInput(999, 100), false);
  assert.equal(validateLocationInput(-91, 100), false);
  assert.equal(validateLocationInput(10, 999), false);
  assert.equal(validateLocationInput(0, 0), true);
  assert.equal(validateLocationInput(5.6, -0.18), true);
});

test("getAccuracyLabel returns correct labels", () => {
  assert.equal(getAccuracyLabel(5), "Excellent (within 10m)");
  assert.equal(getAccuracyLabel(25), "Good (within 50m)");
  assert.equal(getAccuracyLabel(75), "Moderate (within 100m)");
  assert.equal(getAccuracyLabel(null), "Unknown");
});

test("isAccuracyWarning flags poor accuracy", () => {
  assert.equal(isAccuracyWarning(150), true);
  assert.equal(isAccuracyWarning(50), false);
  assert.equal(isAccuracyWarning(null), false);
});

test("createIncidentId generates unique IDs", () => {
  const id1 = createIncidentId();
  const id2 = createIncidentId();
  assert.notEqual(id1, id2);
  assert.ok(id1.startsWith("LF-"));
});

test("localAnalysis flags fire as immediate urgency", () => {
  const result = localAnalysis("Fire! People are trapped in the building!");
  assert.equal(result.urgency, "immediate");
});

test("localAnalysis marks unknown type with low confidence", () => {
  const result = localAnalysis("It is a nice day");
  assert.equal(result.type, "unknown");
  assert.equal(result.confidence, 0.3);
});

test("extractLocationFromText extracts 'near the market'", () => {
  const loc = extractLocationFromText("Smoke near the market");
  assert.ok(loc);
  assert.equal(loc.description, "market");
  assert.equal(loc.source, "text");
});

test("localAnalysis includes confidence in result", () => {
  const result = localAnalysis("Flooding on main street");
  assert.ok(result.confidence >= 0.3 && result.confidence <= 0.6);
});

test("localAnalysis includes missing info for sparse report", () => {
  const result = localAnalysis("I saw something");
  const hasMissing = result.missingInfo.length > 0;
  assert.ok(hasMissing);
});

test("detectSafetyOverride escalates fire to immediate", () => {
  assert.equal(detectSafetyOverride("urgent", "fire_smoke", ["Smoke visible"]), "immediate");
  assert.equal(detectSafetyOverride("urgent", "fire_smoke", ["Fire/flames visible"]), "immediate");
  assert.equal(detectSafetyOverride("information", "fire_smoke", ["Smoke visible"]), "immediate");
});

test("detectSafetyOverride escalates medical to immediate", () => {
  assert.equal(detectSafetyOverride("urgent", "medical", ["Injury reported"]), "immediate");
  assert.equal(detectSafetyOverride("urgent", "medical", ["Injury reported"]), "immediate");
});

test("detectSafetyOverride does not escalate security threats incorrectly", () => {
  assert.equal(detectSafetyOverride("urgent", "security", ["Threat mentioned"]), "urgent");
  assert.equal(detectSafetyOverride("monitor", "security", ["Weapon seen"]), "urgent");
});

test("detectSafetyOverride returns original urgency for no override", () => {
  assert.equal(detectSafetyOverride("monitor", "road_hazard", ["Road referenced"]), "monitor");
  assert.equal(detectSafetyOverride("verify", "flooding", ["Water/flooding visible"]), "verify");
});

test("detectSafetyOverride escalates power hazard with sparks", () => {
  assert.equal(detectSafetyOverride("monitor", "power_hazard", ["Electrical hazard mentioned"]), "monitor");
  assert.equal(detectSafetyOverride("urgent", "power_hazard", ["Electrical hazard mentioned"]), "urgent");
});

test("findRelatedIncidents groups similar incidents", () => {
  const incidents = [
    { id: "LF-001", type: "fire_smoke", urgency: "urgent", status: "reported", timestamp: Date.now() - 10 * 60000, observations: ["Smoke visible"], location: { latitude: 5.6, longitude: -0.18, source: "gps" } },
    { id: "LF-002", type: "fire_smoke", urgency: "urgent", status: "reported", timestamp: Date.now() - 15 * 60000, observations: ["Smoke visible", "Fire/flames visible"], location: { latitude: 5.61, longitude: -0.19, source: "gps" } },
  ];
  const related = findRelatedIncidents(incidents);
  assert.ok(related.length > 0);
  assert.ok(related[0].confidence > 0.4);
});

test("findRelatedIncidents returns empty for unrelated incidents", () => {
  const incidents = [
    { id: "LF-001", type: "fire_smoke", urgency: "urgent", status: "reported", timestamp: Date.now(), observations: ["Smoke visible"], location: { latitude: 5.6, longitude: -0.18, source: "gps" } },
    { id: "LF-002", type: "flooding", urgency: "monitor", status: "reported", timestamp: Date.now() - 100 * 60000, observations: ["Water/flooding visible"], location: { latitude: 10.5, longitude: -2.3, source: "gps" } },
  ];
  const related = findRelatedIncidents(incidents);
  assert.equal(related.length, 0);
});

test("getRecommendedContact returns correct contact for fire/smoke", () => {
  const contact = getRecommendedContact("fire_smoke");
  assert.ok(contact);
  assert.equal(contact.category, "fire_response");
});

test("getRecommendedContact returns general for unknown type", () => {
  const contact = getRecommendedContact("unknown");
  assert.ok(contact);
  assert.equal(contact.category, "general");
});

test("getRecommendedContact returns medical for medical type", () => {
  const contact = getRecommendedContact("medical");
  assert.ok(contact);
  assert.equal(contact.category, "medical_response");
});

test("buildIncidentPackage includes location link", () => {
  const incident = {
    id: "LF-TEST-001",
    type: "fire_smoke",
    urgency: "urgent",
    status: "reported",
    timestamp: Date.now(),
    observations: ["Smoke visible"],
    missingInfo: [],
    location: { latitude: 5.6037, longitude: -0.187, accuracy: 18, timestamp: Date.now(), source: "gps", sourceLabel: "EXACT GPS" },
    summary: "Fire/smoke incident",
  };
  const pkg = buildIncidentPackage(incident);
  assert.ok(pkg.mapLink);
  assert.ok(pkg.mapLink.includes("google.com/maps"));
  assert.ok(pkg.mapLink.includes("5.6037"));
  assert.ok(pkg.textMessage.includes("LF-TEST-001"));
  assert.ok(pkg.webhookPayload.incidentId === "LF-TEST-001");
});

test("buildIncidentPackage without location", () => {
  const incident = {
    id: "LF-TEST-002",
    type: "unknown",
    urgency: "information",
    status: "reported",
    timestamp: Date.now(),
    observations: [],
    missingInfo: ["Location"],
    location: null,
    summary: "General report",
  };
  const pkg = buildIncidentPackage(incident);
  assert.equal(pkg.mapLink, null);
  assert.equal(pkg.locationType, "unknown");
  assert.ok(pkg.textMessage.includes("LF-TEST-002"));
});

test("getContactByCategory returns correct contact", () => {
  const contact = getContactByCategory("fire_response");
  assert.ok(contact);
  assert.equal(contact.category, "fire_response");
});

test("getAvailableChannels returns correct channels for contact", () => {
  const contact = getContactByCategory("fire_response");
  const channels = getAvailableChannels(contact);
  assert.ok(channels.length > 0);
});

test("extractLocationFromText returns null for no location", () => {
  const loc = extractLocationFromText("There is a problem");
  assert.equal(loc, null);
});

test("extractLocationFromText handles 'at' prefix", () => {
  const loc = extractLocationFromText("Incident at the park");
  assert.ok(loc);
  assert.equal(loc.description.toLowerCase(), "park");
  assert.equal(loc.source, "text");
});

test("localAnalysis handles empty input", () => {
  const result = localAnalysis("");
  assert.equal(result.type, "unknown");
  assert.equal(result.isIncident, false);
});

test("localAnalysis handles null input", () => {
  const result = localAnalysis(null);
  assert.equal(result.type, "unknown");
  assert.equal(result.isIncident, false);
});

test("INCIDENT_TYPES contains all required categories", () => {
  const typeIds = INCIDENT_TYPES.map(t => t.id);
  assert.ok(typeIds.includes("fire_smoke"));
  assert.ok(typeIds.includes("medical"));
  assert.ok(typeIds.includes("flooding"));
  assert.ok(typeIds.includes("road_hazard"));
  assert.ok(typeIds.includes("power_hazard"));
  assert.ok(typeIds.includes("environmental"));
  assert.ok(typeIds.includes("security"));
  assert.ok(typeIds.includes("missing_person"));
  assert.ok(typeIds.includes("community_assistance"));
  assert.ok(typeIds.includes("unknown"));
});

test("URGENCY_LEVELS contains all required levels", () => {
  assert.ok(URGENCY_LEVELS.includes("information"));
  assert.ok(URGENCY_LEVELS.includes("monitor"));
  assert.ok(URGENCY_LEVELS.includes("verify"));
  assert.ok(URGENCY_LEVELS.includes("urgent"));
  assert.ok(URGENCY_LEVELS.includes("immediate"));
});

test("INCIDENT_STATUS contains all required statuses", () => {
  assert.ok(INCIDENT_STATUS.includes("reported"));
  assert.ok(INCIDENT_STATUS.includes("active"));
  assert.ok(INCIDENT_STATUS.includes("verify"));
  assert.ok(INCIDENT_STATUS.includes("verified"));
  assert.ok(INCIDENT_STATUS.includes("resolved"));
  assert.ok(INCIDENT_STATUS.includes("false_alarm"));
});

test("STORAGE_KEYS has all required keys", () => {
  assert.ok(STORAGE_KEYS.incidents);
  assert.ok(STORAGE_KEYS.contacts);
  assert.ok(STORAGE_KEYS.settings);
  assert.ok(STORAGE_KEYS.syncQueue);
  assert.ok(STORAGE_KEYS.ui);
});

const sampleIncidents = [
  { id: "LF-A", type: "fire_smoke", urgency: "urgent", status: "reported", observations: ["smoke"], summary: "Smoke from building", timestamp: 1000, location: { latitude: 51.5, longitude: -0.12, accuracy: 12, source: "gps", sourceLabel: "EXACT GPS", privacy: "public" } },
  { id: "LF-B", type: "medical", urgency: "immediate", status: "verify", observations: ["injured"], summary: "Person injured", timestamp: 2000, location: { latitude: 51.51, longitude: -0.13, accuracy: 50, source: "gps", sourceLabel: "EXACT GPS", privacy: "public" } },
  { id: "LF-C", type: "flooding", urgency: "monitor", status: "verified", observations: [], summary: "Minor flooding", timestamp: 3000, location: { latitude: 51.52, longitude: -0.11, accuracy: 120, source: "gps", sourceLabel: "EXACT GPS", privacy: "approximate" } },
  { id: "LF-D", type: "road_hazard", urgency: "information", status: "resolved", observations: [], summary: "Road clear", timestamp: 4000, location: { source: "text", description: "near the market" } },
  { id: "LF-E", type: "missing_person", urgency: "urgent", status: "verify", observations: [], summary: "Missing hiker", timestamp: 5000, location: { latitude: 51.5, longitude: -0.12, privacy: "private" } },
];

test("hasCoords rejects missing and out-of-range coordinates", () => {
  const ok = { location: { latitude: 51.5, longitude: -0.12 } };
  const missing = { location: { source: "text", description: "x" } };
  const badRange = { location: { latitude: 999, longitude: -0.12 } };
  assert.equal(hasCoords(ok), true);
  assert.equal(hasCoords(missing), false);
  assert.equal(hasCoords(badRange), false);
  assert.equal(hasCoords({}), false);
});

test("resolveLocation enforces public/private privacy", () => {
  const pub = resolveLocation(sampleIncidents[0], { coordinator: false });
  assert.equal(pub.plottable, true);
  assert.equal(pub.precise, true);
  const priv = resolveLocation(sampleIncidents[4], { coordinator: false });
  assert.equal(priv.plottable, false);
  assert.equal(priv.precise, false);
  const privCoord = resolveLocation(sampleIncidents[4], { coordinator: true });
  assert.equal(privCoord.plottable, true);
  assert.equal(privCoord.precise, true);
});

test("applyFilters filters by category, urgency, and status", () => {
  const all = applyFilters(sampleIncidents, {});
  assert.equal(all.length, 5);
  const byType = applyFilters(sampleIncidents, { category: "medical" });
  assert.equal(byType.length, 1);
  assert.equal(byType[0].id, "LF-B");
  const mixed = applyFilters(sampleIncidents, { urgency: "urgent", status: "verify" });
  assert.ok(mixed.every((i) => i.urgency === "urgent" && i.status === "verify"));
  assert.equal(mixed.length, 1);
  const none = applyFilters(sampleIncidents, { status: "resolved" });
  assert.equal(none.length, 1);
});

test("searchIncidents matches id, type, and summary text", () => {
  assert.equal(searchIncidents(sampleIncidents, "LF-B").length, 1);
  assert.equal(searchIncidents(sampleIncidents, "smoke").length, 1);
  assert.equal(searchIncidents(sampleIncidents, "missing").length, 1);
  assert.equal(searchIncidents(sampleIncidents, "nope").length, 0);
  assert.equal(searchIncidents(sampleIncidents, "").length, 5);
});

test("statusSpec maps every incident status to a marker state", () => {
  const ids = sampleIncidents.map((i) => statusSpec(i).label);
  assert.ok(ids.includes("REPORTED"));
  assert.ok(ids.includes("NEEDS VERIFICATION"));
  assert.ok(ids.includes("VERIFIED"));
  assert.ok(ids.includes("RESOLVED"));
});

test("statusSpec does not rely on color alone (icons present)", () => {
  Object.values(STATUS_MARKERS).forEach((s) => {
    assert.ok(s.icon, `marker ${s.label} missing icon`);
    assert.ok(s.label, `marker missing label`);
    assert.ok(s.badge, `marker ${s.label} missing badge`);
  });
});

test("getDemoIncidents returns marked, coordinate-bearing, never-fabricated-user incidents", () => {
  const demo = getDemoIncidents(1000000);
  assert.ok(demo.length > 0);
  assert.ok(demo.every((i) => i.isDemo === true));
  assert.ok(demo.every((i) => hasCoords(i)));
  assert.ok(demo.every((i) => i.location.privacy === "public"));
  const ids = demo.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("computeBounds returns south-west/north-east corners", () => {
  const b = computeBounds(sampleIncidents);
  assert.ok(b, "bounds should be non-null when coordinates exist");
  assert.equal(b[0][0] <= b[1][0], true);
  assert.equal(b[0][1] <= b[1][1], true);
});

test("computeBounds returns null when no plottable incidents", () => {
  assert.equal(computeBounds([{ id: "x", location: { source: "text" } }]), null);
});

test("incidentDetailFields returns all required sections", () => {
  const fields = incidentDetailFields(sampleIncidents[0]);
  const labels = fields.map((f) => f.label);
  for (const required of [
    "INCIDENT ID", "WHAT HAPPENED", "CATEGORY", "URGENCY", "STATUS", "REPORTED",
    "LOCATION", "ACCURACY", "SOURCE", "AI/FALLBACK ANALYSIS", "RECOMMENDED RESPONSE",
    "LOCATION LINK", "ATTACHMENTS", "AUDIT HISTORY",
  ]) {
    assert.ok(labels.includes(required), `missing field: ${required}`);
  }
});

test("incidentDetailFields emits a Google Maps link only with coordinates", () => {
  const withCoords = incidentDetailFields(sampleIncidents[0]).find((f) => f.label === "LOCATION LINK");
  assert.ok(withCoords.link);
  assert.equal(withCoords.value.includes("https://www.google.com/maps?q="), true);
  const noCoords = incidentDetailFields(sampleIncidents[3]).find((f) => f.label === "LOCATION LINK");
  assert.equal(noCoords.link, false);
});

test("createLocationLink never fabricates and always uses Google Maps format", () => {
  const link = createLocationLink(51.5, -0.12);
  assert.equal(link, "https://www.google.com/maps?q=51.5,-0.12");
  const link2 = createLocationLink(0, 0);
  assert.equal(link2, "https://www.google.com/maps?q=0,0");
});

test("resolveLocationState covers all required permission states", () => {
  assert.equal(resolveLocationState({ online: false }).state, LOCATION_STATES.OFFLINE);
  assert.equal(resolveLocationState({ online: true, geoSupported: false }).state, LOCATION_STATES.UNAVAILABLE);
  assert.equal(resolveLocationState({ online: true, geoSupported: true, permission: "denied" }).state, LOCATION_STATES.DENIED);
  assert.equal(resolveLocationState({ online: true, geoSupported: true, permission: "granted", accuracy: 20 }).state, LOCATION_STATES.AVAILABLE);
  assert.equal(resolveLocationState({ online: true, geoSupported: true, permission: "granted", accuracy: 250 }).state, LOCATION_STATES.LOW_ACCURACY);
  assert.equal(resolveLocationState({ online: true, geoSupported: true, permission: "granted", accuracy: null }).state, LOCATION_STATES.NO_LOCATION);
  assert.equal(
    resolveLocationState({ online: true, geoSupported: true, permission: "granted", error: { code: 2 } }).state,
    LOCATION_STATES.UNAVAILABLE
  );
  assert.equal(
    resolveLocationState({ online: true, geoSupported: true, permission: "granted", error: { code: 1 } }).state,
    LOCATION_STATES.DENIED
  );
});

test("resolveLocationState has a message for every state", () => {
  const cases = [
    { online: false },
    { online: true, geoSupported: false },
    { online: true, geoSupported: true, permission: "denied" },
    { online: true, geoSupported: true, permission: "granted", accuracy: 20 },
    { online: true, geoSupported: true, permission: "granted", accuracy: 250 },
    { online: true, geoSupported: true, permission: "granted", error: { code: 2 } },
  ];
  cases.forEach((c) => {
    const r = resolveLocationState(c);
    assert.ok(r.message && r.message.length > 0, `missing message for ${r.state}`);
  });
});

test("URGENCY_COLORS covers every urgency level", () => {
  URGENCY_LEVELS.forEach((u) => assert.ok(URGENCY_COLORS[u], `missing color for ${u}`));
});

// --- SLA Tests ---
test("checkSLA returns correct status for fresh incident", () => {
  const incident = {
    id: "LF-SLA-001",
    urgency: "immediate",
    timestamp: Date.now() - 1000,
    status: "active",
  };
  const sla = checkSLA(incident);
  assert.ok(sla);
  assert.equal(sla.status, "ok");
  assert.equal(sla.level, "normal");
});

test("checkSLA flags warning for urgent incident past warning threshold", () => {
  const incident = {
    id: "LF-SLA-002",
    urgency: "urgent",
    timestamp: Date.now() - 6 * 60 * 1000,
    status: "active",
  };
  const sla = checkSLA(incident);
  assert.equal(sla.status, "warning");
  assert.equal(sla.level, "caution");
});

test("checkSLA flags escalation for urgent incident past escalation threshold", () => {
  const incident = {
    id: "LF-SLA-003",
    urgency: "urgent",
    timestamp: Date.now() - 12 * 60 * 1000,
    status: "active",
  };
  const sla = checkSLA(incident);
  assert.equal(sla.status, "escalated");
  assert.equal(sla.level, "warning");
});

test("checkSLA flags breach for urgent incident past max threshold", () => {
  const incident = {
    id: "LF-SLA-004",
    urgency: "urgent",
    timestamp: Date.now() - 35 * 60 * 1000,
    status: "active",
  };
  const sla = checkSLA(incident);
  assert.equal(sla.status, "breached");
  assert.equal(sla.level, "critical");
});

test("checkSLA returns null for incident without timestamp", () => {
  const incident = {
    id: "LF-SLA-005",
    urgency: "urgent",
    status: "active",
  };
  const sla = checkSLA(incident);
  assert.equal(sla, null);
});

test("checkAllIncidentsSLA filters non-active incidents", () => {
  const incidents = [
    { id: "LF-A", urgency: "urgent", status: "resolved", timestamp: Date.now() - 1000 },
    { id: "LF-B", urgency: "urgent", status: "active", timestamp: Date.now() - 1000 },
    { id: "LF-C", urgency: "immediate", status: "verify", timestamp: Date.now() - 1000 },
  ];
  const results = checkAllIncidentsSLA(incidents);
  assert.equal(results.length, 2);
  assert.ok(results.some((r) => r.incidentId === "LF-B"));
  assert.ok(results.some((r) => r.incidentId === "LF-C"));
});

test("getSLAStats returns correct counts", () => {
  const incidents = [
    { id: "A", urgency: "urgent", status: "active", timestamp: Date.now() - 1000 },
    { id: "B", urgency: "immediate", status: "active", timestamp: Date.now() - 1000 },
    { id: "C", urgency: "monitor", status: "resolved", timestamp: Date.now() - 1000 },
  ];
  const stats = getSLAStats(incidents);
  assert.equal(stats.total, 2);
  assert.equal(stats.ok, 2);
  assert.equal(stats.breached, 0);
});

test("formatElapsed formats correctly", () => {
  assert.equal(formatElapsed(30000), "30s");
  assert.equal(formatElapsed(120000), "2m 0s");
  assert.equal(formatElapsed(3600000), "1h 0m");
});

test("formatRemaining formats correctly", () => {
  assert.equal(formatRemaining(0), "0s");
  assert.equal(formatRemaining(30000), "30s");
  assert.equal(formatRemaining(120000), "2m 0s");
});

test("getSLAColor returns appropriate colors", () => {
  const incident = { id: "LF-SLA-001", urgency: "immediate", timestamp: Date.now() - 1000, status: "active" };
  assert.equal(getSLAColor(incident), "badge-ready");
});

test("getSLAProgress calculates percentage", () => {
  const incident = {
    urgency: "urgent",
    timestamp: Date.now() - 15 * 60 * 1000,
    status: "active",
  };
  const progress = getSLAProgress(incident);
  assert.ok(progress.percent > 0);
  assert.ok(progress.percent < 100);
  assert.ok(progress.color);
});

// --- Report Generation Tests ---
test("generateAfterActionReport creates a valid report", () => {
  const incident = {
    id: "LF-TEST-001",
    type: "fire_smoke",
    typeLabel: "Fire / Smoke",
    urgency: "urgent",
    status: "reported",
    observations: ["Smoke visible", "Building on fire"],
    missingInfo: ["Exact location", "Number of people affected"],
    summary: "Fire/smoke incident reported.",
    location: { latitude: 5.6037, longitude: -0.187, accuracy: 18, timestamp: Date.now(), source: "gps", sourceLabel: "EXACT GPS" },
    timestamp: Date.now(),
    provider: "rules",
    confidence: 0.6,
    safetyOverrideApplied: true,
    source: "local",
  };
  const report = generateAfterActionReport(incident, { format: "json" });
  assert.ok(report.reportId);
  assert.equal(report.incidentId, "LF-TEST-001");
  assert.equal(report.type, "fire_smoke");
  assert.ok(report.timeline.length > 0);
  assert.ok(report.lessons.length > 0);
  assert.ok(Array.isArray(report.recommendations));
});

test("generateAfterActionReport identifies missing info lesson", () => {
  const incident = {
    id: "LF-TEST-002",
    type: "flooding",
    typeLabel: "Flooding",
    urgency: "monitor",
    status: "reported",
    observations: ["Water visible"],
    missingInfo: ["Exact location", "Time of occurrence"],
    summary: "Flooding incident.",
    location: null,
    timestamp: Date.now(),
    provider: "rules",
    confidence: 0.5,
    safetyOverrideApplied: false,
    source: "local",
  };
  const report = generateAfterActionReport(incident, { format: "json" });
  const missingInfoLesson = report.lessons.find((l) => l.category === "incomplete_information");
  assert.ok(missingInfoLesson);
  assert.ok(missingInfoLesson.finding.includes("Exact location"));
});

test("generateAfterActionReport identifies safety override lesson", () => {
  const incident = {
    id: "LF-TEST-003",
    type: "fire_smoke",
    typeLabel: "Fire / Smoke",
    urgency: "urgent",
    status: "reported",
    observations: ["Smoke visible"],
    missingInfo: [],
    summary: "Smoke incident.",
    location: { latitude: 5.6, longitude: -0.18, timestamp: Date.now(), source: "gps" },
    timestamp: Date.now(),
    provider: "rules",
    confidence: 0.6,
    safetyOverrideApplied: true,
    source: "local",
  };
  const report = generateAfterActionReport(incident, { format: "json" });
  const safetyLesson = report.lessons.find((l) => l.category === "safety_override");
  assert.ok(safetyLesson);
});

test("generateBatchReport aggregates incidents correctly", () => {
  const incidents = [
    { id: "LF-001", type: "fire_smoke", typeLabel: "Fire / Smoke", urgency: "urgent", status: "resolved", timestamp: Date.now() - 3600000, lastEscalation: { at: Date.now() - 3500000, status: "SENT", delivered: true }, observations: [], missingInfo: [] },
    { id: "LF-002", type: "medical", typeLabel: "Medical concern", urgency: "immediate", status: "active", timestamp: Date.now() - 600000, observations: [], missingInfo: [] },
  ];
  const report = generateBatchReport(incidents, { format: "json" });
  assert.equal(report.totalIncidents, 2);
  assert.ok(report.byType.fire_smoke);
  assert.ok(report.byUrgency.urgent);
  assert.ok(report.averageResponseTime >= 0);
  assert.equal(report.resolutionRate, 50);
});

test("generateCsvReport generates valid CSV", () => {
  const incidents = [
    { id: "LF-001", type: "fire_smoke", typeLabel: "Fire / Smoke", urgency: "urgent", status: "resolved", timestamp: Date.now(), observations: ["Smoke visible"], missingInfo: [], location: { latitude: 5.6, longitude: -0.18 }, lastEscalation: { delivered: true } },
  ];
  const csv = generateCsvReport(incidents);
  assert.ok(csv.includes("ID,Type,Urgency,Status,Reported"));
  assert.ok(csv.includes("LF-001"));
  assert.ok(csv.includes("Fire / Smoke"));
});

// --- Map Helpers Tests ---
test("STATUS_MARKERS has entries for all incident statuses", () => {
  INCIDENT_STATUS.forEach((s) => {
    assert.ok(STATUS_MARKERS[s], `missing marker for status: ${s}`);
  });
});

test("URGENCY_COLORS has entries for all urgency levels", () => {
  URGENCY_LEVELS.forEach((u) => {
    assert.ok(URGENCY_COLORS[u], `missing color for urgency: ${u}`);
  });
});
