async function run(page) {
  const errors = [];
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); else if (m.type() === "warning") logs.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const results = {};

  // 1) Load app
  await page.goto("http://localhost:8080/index.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#app", { state: "visible" });
  const firstHeading = await page.$eval("#app", (el) => el.querySelector("h2, h3")?.textContent || "");
  results.appLoaded = await page.$eval("#app", (el) => el.textContent.length > 0);
  results.firstHeading = firstHeading;

  // 2) Type a report
  await page.waitForSelector('textarea', { state: "visible" });
  const textarea = await page.$('textarea');
  await textarea.fill("Heavy smoke and flames coming from the roof of a building at 123 Main Street near the community center. People are evacuating. This is urgent and dangerous.");
  await page.waitForTimeout(200);

  // ANALYZE button should enable
  const analyzeBtn = await page.$('button:has-text("ANALYZE REPORT")');
  results.analyzeEnabled = analyzeBtn ? !(await analyzeBtn.getAttribute("disabled")) : false;

  // 3) Click ANALYZE and wait for analysis result
  await analyzeBtn.click();
  await page.waitForFunction(() => {
    const t = document.querySelector("#app");
    return t && (t.textContent.includes("Analysis") || t.textContent.includes("Brief") || t.textContent.includes("Category") || t.textContent.includes("Continue to location"));
  }, { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(800);
  const appHtml = await page.$eval("#app", (el) => el.textContent);
  results.analysisDone = appHtml.includes("Analysis") || appHtml.includes("Brief") || appHtml.includes("Category") || appHtml.includes("Incident");

  // 4) Directly verify the notification provider logic in the browser (no Twilio config)
  const provCheck = await page.evaluate(async () => {
    const mod = await import("/src/notification-providers.js");
    const config = { smsProvider: "device-sms", twilioConfigured: false, emailConfigured: false, webhookConfigured: false, configured: false };
    const contact = { id: "fire", name: "Fire Response Team", phone: "tel:+233240000000", sms: true, call: true, email: "", webhook: "", enabled: true };
    const demoContact = { id: "demo", name: "Demo Response Team", phone: "", sms: true };
    const pkg = { incidentId: "LF-X", type: "fire_smoke", typeLabel: "Fire / Smoke", urgency: "urgent", time: new Date().toISOString(), summary: "Smoke from building roof", observations: ["Smoke visible", "Building involved"], location: { latitude: 5.6037, longitude: -0.187, accuracy: 18, source: "gps", sourceLabel: "EXACT GPS" }, mapLink: "https://www.google.com/maps?q=5.6037,-0.187" };

    const sel = mod.selectProvider(config, contact, false);
    const demo = mod.selectProvider(config, demoContact, true);
    const none = mod.selectProvider(config, { id: "x", name: "None", phone: "", sms: false, call: false, email: "", webhook: "" }, false);
    const link = mod.buildDeviceSMSLink(contact, pkg);
    const tel = mod.buildPhoneLink(contact);
    const full = mod.buildFullMessage(pkg);
    const demoNotif = mod.getDemoNotification(pkg, demoContact);
    const notification = mod.buildNotificationObject(pkg, contact, "device-sms", mod.NOTIFICATION_STATUS.READY);

    return {
      selectedProvider: sel.provider,
      selectedStatus: sel.status,
      demoProvider: demo.provider,
      demoStatus: demo.status,
      noneProvider: none.provider,
      smsLinkStartsWithSms: link.startsWith("sms:"),
      smsLinkHasBody: link.includes("body="),
      smsLinkContent: decodeURIComponent(link.split("body=")[1]).includes("LIFELINE INCIDENT"),
      phoneLink: tel,
      fullMessageHasId: full.includes("LF-X"),
      fullMessageHasCategory: full.includes("Category:"),
      fullMessageHasLocation: full.includes("https://www.google.com/maps?q="),
      fullMessageHasTimestamp: full.includes("Timestamp:"),
      demoMessageLabel: demoNotif.message,
      demoRecipient: demoNotif.recipient,
      notificationHasNoUndefined: Object.values(notification).every((v) => v !== undefined),
      notificationLatitudeNotNull: notification.latitude === 5.6037,
    };
  });
  results.providerLogic = provCheck;

  // 5) Verify GET config endpoint returns device-sms (no twilio)
  const cfgRes = await page.evaluate(async () => {
    const r = await fetch("/api/notify", { cache: "no-store" });
    return { status: r.status, json: await r.json() };
  });
  results.configEndpoint = cfgRes;

  // 6) Verify POST sms returns device-sms (NOT sent)
  const postRes = await page.evaluate(async () => {
    const r = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sms", contact: { phone: "tel:+233240000000", sms: true }, incident: { smsMessage: "hi", textMessage: "hi", webhookPayload: {} } }) });
    return { status: r.status, json: await r.json() };
  });
  results.postSms = postRes;

  return { errors, warnings: logs.slice(0, 10), results, configEndpointStatus: cfgRes.status, postResultProvider: postRes.json && postRes.json.result && postRes.json.result.provider, postResultStatus: postRes.json && postRes.json.result && postRes.json.result.status };
}
return run(page);
