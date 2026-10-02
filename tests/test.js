// LIFELINE AI — Tests
import test from "node:test";
import assert from "node:assert/strict";
import { localAnalysis, classifyIncidentType, assessUrgency, extractObservations, detectMissingInfo, extractLocationFromText } from "../src/analyzer.js";
import { createLocationLink, validateLocationInput, getAccuracyLabel, isAccuracyWarning } from "../src/location.js";
import { createIncidentId } from "../src/types.js";

test("classifyIncidentType detects fire/smoke", () => {
  assert.equal(classifyIncidentType("Heavy smoke coming from a building"), "fire_smoke");
  assert.equal(classifyIncidentType("There is a fire"), "fire_smoke");
  assert.equal(classifyIncidentType("I see flames"), "fire_smoke");
});

test("classifyIncidentType detects flooding", () => {
  assert.equal(classifyIncidentType("Water is flooding the street"), "flooding");
  assert.equal(classifyIncidentType("The road is underwater"), "flooding");
});

test("classifyIncidentType detects road hazard", () => {
  assert.equal(classifyIncidentType("The road is blocked by debris"), "road_hazard");
  assert.equal(classifyIncidentType("There is a pothole"), "road_hazard");
});

test("classifyIncidentType detects medical", () => {
  assert.equal(classifyIncidentType("Someone is injured and bleeding"), "medical");
  assert.equal(classifyIncidentType("A person is unconscious"), "medical");
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
  assert.ok(result.observations.some(o => o.label.includes("smoke") || o.label.includes("Smoke")));
  assert.ok(result.observations.some(o => o.label.includes("building") || o.label.includes("Building")));
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
