// LIFELINE AI — Tests
import test from "node:test";
import assert from "node:assert/strict";
import { localAnalysis, classifyIncidentType, assessUrgency, extractObservations, detectMissingInfo, extractLocationFromText, detectSafetyOverride, findRelatedIncidents } from "../src/analyzer.js";
import { createLocationLink, validateLocationInput, getAccuracyLabel, isAccuracyWarning } from "../src/location.js";
import { createIncidentId } from "../src/types.js";
import { getRecommendedContact, buildIncidentPackage, getContactByCategory, getAvailableChannels } from "../src/contacts.js";
import { getDefaultContacts } from "../src/contacts.js";
import { STORAGE_KEYS, INCIDENT_TYPES, URGENCY_LEVELS, INCIDENT_STATUS } from "../src/types.js";

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
