// Validates api/notify.js behaves correctly with/without Twilio configured.
const http = require("http");
const path = require("path");
const { EventEmitter } = require("events");

function makeReq(method, bodyObj) {
  const body = bodyObj ? JSON.stringify(bodyObj) : null;
  const req = new EventEmitter();
  req.method = method;
  req.headers = { origin: "http://localhost:8080", host: "localhost:8080" };
  req._body = body;
  req.on = (ev, fn) => {
    if (ev === "data") {
      if (body) setImmediate(() => fn(Buffer.from(body)));
    } else if (ev === "end") {
      setImmediate(() => fn());
    } else {
      EventEmitter.prototype.on.call(req, ev, fn);
    }
    return req;
  };
  // support .on already used above; also provide on for error
  return req;
}

function makeRes() {
  const res = new EventEmitter();
  res.statusCode = null;
  res.headers = {};
  res.payload = null;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = (data) => { res.payload = data; };
  return res;
}

async function run() {
  const handler = require(path.join(__dirname, "..", "api", "notify.js"));

  // 1) No Twilio configured (default .env empty)
  delete process.env.SMS_PROVIDER;
  delete process.env.SMS_ACCOUNT_SID;
  delete process.env.SMS_AUTH_TOKEN;
  delete process.env.SMS_FROM;
  let req, res;

  req = makeReq("GET");
  res = makeRes();
  await handler(req, res);
  const cfg = JSON.parse(res.payload);
  console.log("[1] GET (no twilio) ->", res.statusCode, cfg.smsProvider, "twilioConfigured=", cfg.twilioConfigured);
  if (cfg.twilioConfigured === true) throw new Error("Twilio should NOT be configured");
  if (cfg.smsProvider !== "device-sms") throw new Error("smsProvider should be device-sms");

  req = makeReq("POST", { type: "sms", contact: { phone: "tel:+15550100", sms: true }, incident: { smsMessage: "hi" } });
  res = makeRes();
  await handler(req, res);
  const sms = JSON.parse(res.payload);
  console.log("[2] POST sms (no twilio) ->", res.statusCode, sms.result.provider, sms.result.status);
  if (sms.result.provider !== "device-sms") throw new Error("should fall back to device-sms");
  if (sms.result.status === "SENT") throw new Error("must not claim SENT without a real provider");

  // 2) Twilio "configured" with fake creds but SDK not installed -> graceful fallback, NO crash
  process.env.SMS_PROVIDER = "twilio";
  process.env.SMS_ACCOUNT_SID = "ACfake";
  process.env.SMS_AUTH_TOKEN = "faketoken";
  process.env.SMS_FROM = "+15550000";
  req = makeReq("POST", { type: "sms", contact: { phone: "tel:+15550100", sms: true }, incident: { smsMessage: "hi", webhookPayload: {} } });
  res = makeRes();
  await handler(req, res);
  const sms2 = JSON.parse(res.payload);
  console.log("[3] POST sms (twilio configured, SDK missing) ->", res.statusCode, sms2.result.provider, sms2.result.status, sms2.result.note);
  if (res.statusCode !== 200) throw new Error("must not crash/5xx when Twilio SDK missing");

  // cleanup env
  delete process.env.SMS_PROVIDER;
  delete process.env.SMS_ACCOUNT_SID;
  delete process.env.SMS_AUTH_TOKEN;
  delete process.env.SMS_FROM;

  console.log("ALL BACKEND CHECKS PASSED");
}

run().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
