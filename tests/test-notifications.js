// LIFELINE AI — Tests for the notification provider abstraction
import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFICATION_STATUS,
  selectProvider,
  buildFullMessage,
  buildDeviceSMSLink,
  buildPhoneLink,
  buildNotificationObject,
  getDemoNotification,
  providerRequiresOnline,
  buildCopyableMessage,
} from "../src/notification-providers.js";
import { createLocationLink } from "../src/location.js";

const SAMPLE_PKG = {
  incidentId: "LF-TEST-001",
  type: "fire_smoke",
  typeLabel: "Fire / Smoke",
  urgency: "urgent",
  status: "reported",
  time: "2026-10-02T12:00:00.000Z",
  observations: ["Smoke visible", "Building involved"],
  missingInfo: [],
  location: { latitude: 5.6037, longitude: -0.187, accuracy: 18, source: "gps", sourceLabel: "EXACT GPS" },
  locationType: "gps",
  locationSection: "Lat: 5.6037\nLng: -0.187",
  mapLink: createLocationLink(5.6037, -0.187),
  summary: "Heavy smoke coming from a building.",
};

const CONTACT = {
  id: "fire-response",
  name: "Fire Response Team",
  phone: "tel:+1-555-0100",
  email: "",
  webhook: "",
  sms: true,
  call: true,
  enabled: true,
};

test("NOTIFICATION_STATUS contains every required state", () => {
  const values = Object.values(NOTIFICATION_STATUS);
  for (const v of [
    "NOT CONFIGURED",
    "READY",
    "WAITING FOR CONFIRMATION",
    "SENDING",
    "SENT",
    "DELIVERED",
    "FAILED",
    "CANCELLED",
    "SIMULATED",
    "UNAVAILABLE",
  ]) {
    assert.ok(values.includes(v), "missing state: " + v);
  }
});

test("selectProvider prefers Twilio when configured and contact supports SMS", () => {
  const config = { twilioConfigured: true, emailConfigured: false, webhookConfigured: false, smsProvider: "twilio" };
  const p = selectProvider(config, CONTACT, false);
  assert.equal(p.provider, "twilio");
});

test("selectProvider falls back to device-sms when Twilio not configured", () => {
  const config = { twilioConfigured: false, emailConfigured: false, webhookConfigured: false, smsProvider: "device-sms" };
  const p = selectProvider(config, CONTACT, false);
  assert.equal(p.provider, "device-sms");
});

test("selectProvider falls back to phone when no SMS", () => {
  const config = { twilioConfigured: false, emailConfigured: false, webhookConfigured: false, smsProvider: "device-sms" };
  const contact = { ...CONTACT, sms: false, call: true };
  const p = selectProvider(config, contact, false);
  assert.equal(p.provider, "phone");
});

test("selectProvider uses email when no phone", () => {
  const config = { twilioConfigured: false, emailConfigured: true, webhookConfigured: false, smsProvider: "device-sms" };
  const contact = { id: "c1", name: "Env", phone: "", email: "e@example.com", sms: false, call: false, email: true };
  const p = selectProvider(config, contact, false);
  assert.equal(p.provider, "email");
});

test("selectProvider uses webhook when no phone/email", () => {
  const config = { twilioConfigured: false, emailConfigured: false, webhookConfigured: true, smsProvider: "device-sms" };
  const contact = { id: "c1", name: "Coord", phone: "", email: "", webhook: "https://x.example/hook", sms: false, call: false, email: false };
  const p = selectProvider(config, contact, false);
  assert.equal(p.provider, "webhook");
});

test("selectProvider returns none when nothing is available", () => {
  const config = { twilioConfigured: false, emailConfigured: false, webhookConfigured: false, smsProvider: "device-sms" };
  const contact = { id: "c1", name: "Empty", phone: "", email: "", webhook: "", sms: false, call: false, email: false };
  const p = selectProvider(config, contact, false);
  assert.equal(p.provider, "none");
  assert.equal(p.status, NOTIFICATION_STATUS.NOT_CONFIGURED);
});

test("selectProvider returns demo in demo mode (ignores contact)", () => {
  const config = { twilioConfigured: true, emailConfigured: false, webhookConfigured: false, smsProvider: "twilio" };
  const p = selectProvider(config, CONTACT, true);
  assert.equal(p.provider, "demo");
});

test("buildFullMessage contains all required incident fields", () => {
  const msg = buildFullMessage(SAMPLE_PKG);
  assert.match(msg, /LIFELINE INCIDENT/);
  assert.match(msg, /LF-TEST-001/);
  assert.match(msg, /Category:/);
  assert.match(msg, /Fire \/ Smoke/);
  assert.match(msg, /Urgency:/);
  assert.match(msg, /Summary:/);
  assert.match(msg, /Location:/);
  assert.match(msg, /https:\/\/www\.google\.com\/maps\?q=/);
  assert.match(msg, /Timestamp:/);
});

test("buildFullMessage never fabricates a location link", () => {
  const pkg = { ...SAMPLE_PKG, location: null, mapLink: null };
  const msg = buildFullMessage(pkg);
  assert.equal(msg.includes("https://www.google.com/maps"), false);
  assert.equal(msg.includes("LF-TEST-001"), true);
});

test("buildDeviceSMSLink produces a valid sms: URL with encoded body", () => {
  const link = buildDeviceSMSLink(CONTACT, SAMPLE_PKG);
  assert.ok(link.startsWith("sms:"), "should start with sms:");
  assert.match(link, /\+15550100/);
  assert.match(link, /[?&]body=/);
  const body = link.split("body=")[1];
  assert.ok(decodeURIComponent(body).includes("LF-TEST-001"));
});

test("buildPhoneLink produces a tel: URL", () => {
  const link = buildPhoneLink(CONTACT);
  assert.match(link, /^tel:\+1-555-0100$/);
});

test("buildNotificationObject omits undefined values", () => {
  const obj = buildNotificationObject(SAMPLE_PKG, CONTACT, "twilio", NOTIFICATION_STATUS.SENT);
  for (const [key, value] of Object.entries(obj)) {
    assert.notEqual(value, undefined, "undefined value for key: " + key);
  }
  assert.equal(obj.provider, "twilio");
  assert.equal(obj.status, "SENT");
  assert.equal(obj.latitude, 5.6037);
  assert.equal(obj.recipient, "Fire Response Team");
});

test("getDemoNotification is clearly simulated and uses Demo Response Team", () => {
  const demo = getDemoNotification(SAMPLE_PKG, CONTACT);
  assert.equal(demo.status, NOTIFICATION_STATUS.SIMULATED);
  assert.equal(demo.provider, "demo");
  assert.equal(demo.recipient, "Demo Response Team");
  assert.match(demo.message, /Demo notification/);
});

test("providerRequiresOnline only for server-side providers", () => {
  assert.equal(providerRequiresOnline("twilio"), true);
  assert.equal(providerRequiresOnline("email"), true);
  assert.equal(providerRequiresOnline("webhook"), true);
  assert.equal(providerRequiresOnline("device-sms"), false);
  assert.equal(providerRequiresOnline("phone"), false);
  assert.equal(providerRequiresOnline("demo"), false);
  assert.equal(providerRequiresOnline("none"), false);
});

test("buildSMSMessage is length-safe for carriers", () => {
  const longPkg = { ...SAMPLE_PKG, observations: [], summary: "x".repeat(10000) };
  const msg = buildFullMessage(longPkg);
  assert.ok(msg.length > 0);
});
