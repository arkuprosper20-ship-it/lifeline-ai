const http = require("http");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      "http://localhost:8080" + path,
      {
        method,
        headers: payload
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
          : {},
      },
      (resp) => {
        let d = "";
        resp.on("data", (c) => (d += c));
        resp.on("end", () => resolve({ status: resp.statusCode, body: d }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const cfg = await request("GET", "/api/notify");
    console.log("GET /api/notify =>", cfg.status, cfg.body);

    const sms = await request("POST", "/api/notify", {
      type: "sms",
      contact: { id: "fire-response", name: "Fire Team", phone: "tel:+15550100", sms: true, call: true },
      incident: { incidentId: "LF-X", type: "fire_smoke", typeLabel: "Fire / Smoke", urgency: "urgent", smsMessage: "LIFELINE LF-X Fire", textMessage: "brief", webhookPayload: {} },
    });
    console.log("POST sms (no twilio) =>", sms.status, sms.body);

    const email = await request("POST", "/api/notify", {
      type: "email",
      contact: { id: "c", email: "a@b.com" },
      incident: {},
    });
    console.log("POST email (no email) =>", email.status, email.body);

    const call = await request("POST", "/api/notify", {
      type: "call",
      contact: { id: "c", phone: "tel:+15550100", call: true },
      incident: {},
    });
    console.log("POST call =>", call.status, call.body);

    const bad = await request("POST", "/api/notify", { type: "bogus", contact: {}, incident: {} });
    console.log("POST bogus =>", bad.status, bad.body);
  } catch (e) {
    console.error("ERR", e.message);
  }
})();
