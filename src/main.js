// LIFELINE AI - Main entry point and router
import { store, getState, subscribe } from "./store.js";
import { initEmergencyHome, setupEmergencyHomeHandlers } from "./views/emergency-home.js";
import { initMapScreen, setupMap } from "./views/map.js";
import { renderComponent, showToast, installErrorBoundary } from "./ui.js";
import { buildIncidentPackage } from "./contacts.js";
import { fetchProviderConfig } from "./notification-providers.js";
import { readNotifications } from "./sync.js";
import { logout, getAuthState, AUTH_STATES } from "./auth.js";
import { initLanguage, getLanguage, setLanguage, getAvailableLanguages } from "./i18n.js";
import { checkAllIncidentsSLA, createSLATimer } from "./sla.js";
import { generateAfterActionReport, generateBatchReport, generateCsvReport, downloadReport } from "./reports.js";
import { connectWebSocket, subscribe as subscribeWS, getWebSocketStatus } from "./ws.js";
import { preCaptureLocation } from "./location.js";
import { navigateTo, getHashRoute } from "./navigation.js";

const routes = {
  emergency: initEmergencyHome,
  map: initMapScreen,
};

const mobileNavViews = ["emergency", "map"];
const viewSetups = {
  emergency: setupEmergencyHomeHandlers,
};

function getCurrentView() {
  const route = getHashRoute();
  return routes[route] ? route : "emergency";
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggle = document.getElementById("sidebar-toggle");
  const closeBtn = document.getElementById("sidebar-close");
  const userSection = document.getElementById("sidebar-user-section");
  const userNameEl = document.getElementById("sidebar-user-name");

  function updateAuthState() {
    const state = getAuthState();
    const user = getState().currentUser;
    if (state === AUTH_STATES.AUTHENTICATED && user) {
      if (userNameEl) userNameEl.textContent = user.name || user.email || "User";
      if (userSection) userSection.style.display = "block";
    } else {
      if (userSection) userSection.style.display = "none";
    }
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    updateAuthState();
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar() {
    if (sidebar && sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  if (toggle) toggle.addEventListener("click", toggleSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".sidebar-nav-item[data-view]").forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      if (view) navigateTo(view);
      if (window.innerWidth < 768) closeSidebar();
    });
    item.classList.toggle("active", item.dataset.view === getCurrentView());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  updateAuthState();
}

function initMobileNav() {
  const existing = document.getElementById("mobile-nav");
  if (existing) existing.remove();
  const nav = document.createElement("nav");
  nav.id = "mobile-nav";
  nav.className = "bottom-nav";
  const current = getCurrentView();
  nav.innerHTML = `
    <div class="nav-item ${mobileNavViews.includes(current) && current === "emergency" ? "active" : ""}" data-view="emergency">[EMERGENCY]<br>Emergency</div>
    <div class="nav-item ${mobileNavViews.includes(current) && current === "map" ? "active" : ""}" data-view="map">[MAP]<br>Map</div>
  `;
  document.body.appendChild(nav);
  nav.addEventListener("click", (e) => {
    const item = e.target.closest("[data-view]");
    if (!item) return;
    navigateTo(item.dataset.view);
  });
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const view = getCurrentView();
  const hashParams = parseHashParams();
  const params = { ...getState().ui.params, ...hashParams };
  const component = routes[view];
  if (!component) {
    app.innerHTML = "<div class='card'><p>View not found.</p></div>";
    return;
  }
  const html = component(params);
  app.classList.remove("page-exit-active");
  app.classList.add("page-enter");
  if (typeof html === "string") {
    app.innerHTML = html;
  } else if (typeof html === "function") {
    renderComponent(app, html);
  }
  initSidebar();
  initMobileNav();
  if (viewSetups[view]) {
    setTimeout(() => viewSetups[view](), 50);
  }
  if (view === "map") {
    setTimeout(() => setupMap("incident-map", { isDashboard: false, incidentId: params.incident }), 100);
  }
  app.addEventListener("click", (e) => {
    const navLink = e.target.closest("[data-nav]");
    if (navLink) {
      e.preventDefault();
      navigateTo(navLink.dataset.nav);
    }
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      handleAction(actionBtn.dataset.action, actionBtn.dataset);
    }
  });
  requestAnimationFrame(() => {
    app.classList.add("page-enter-active");
    setTimeout(() => app.classList.remove("page-enter", "page-enter-active"), 300);
  });
}

function parseHashParams() {
  const hash = location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex < 0) return {};
  const query = hash.slice(qIndex + 1);
  const params = {};
  query.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");
  });
  return params;
}

function handleAction(action, dataset) {
  const params = getState().ui.params || {};
  switch (action) {
    case "navigate":
      navigateTo(dataset.to, { ...params, ...JSON.parse(dataset.params || "{}") });
      break;
    case "analyze-report":
      startAnalysisFlow();
      break;
    case "voice-input":
      startVoiceRecording();
      break;
    case "image-input":
      openImagePicker();
      break;
    case "capture-location":
      navigateTo("location");
      break;
    case "remove-image":
      store.setUI({ imagePreview: null, imageFile: null });
      break;
    case "verify-incident":
      store.updateIncident(dataset.id, { status: "verified" });
      break;
    case "resolve-incident":
      store.updateIncident(dataset.id, { status: "resolved" });
      break;
    case "false-alarm":
      store.updateIncident(dataset.id, { status: "false_alarm" });
      break;
    case "copy-brief":
      copyBrief(dataset.id);
      break;
    case "retry-channel":
      retryNotification(dataset.id, dataset.channel);
      break;
    case "go-back":
      history.back();
      break;
    case "logout":
      logout();
      showToast("Logged out successfully.");
      setTimeout(() => { window.location.href = "#/auth"; location.reload(); }, 500);
      break;
  }
}

async function retryNotification(incidentId, channel) {
  const state = getState();
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) return;
  showToast("Retrying notification...");
  try {
    await dispatchRetry(incident, channel);
    showToast("Notification retried successfully.");
  } catch (error) {
    console.error("[LIFELINE] Retry failed:", error);
    showToast("Retry failed: " + (error.message || "unknown error"));
  }
}

async function dispatchRetry(incident, channel) {
  if (!state.notificationConfig) {
    state.notificationConfig = await fetchProviderConfig();
    store.setNotificationConfig(state.notificationConfig);
  }
  const config = state.notificationConfig;
  const provider = selectProvider(config, incident.lastEscalation, false);
  const pkg = buildIncidentPackage(incident);
  const contact = state.contacts.find((c) => c.id === incident.lastEscalation?.contact) || getRecommendedContact(incident.type);
  if (!contact) {
    showToast("No response contact configured.");
    return;
  }
  const result = await callNotifyApi(channel === "twilio" ? "sms" : channel, contact, pkg);
  store.updateIncident(incident.id, {
    lastEscalation: {
      ...incident.lastEscalation,
      status: result.success ? "SENT" : "FAILED",
      delivered: result.success ? true : false,
      note: result.success ? "Notification retried." : (result.error || "Retry failed"),
      error: result.success ? null : (result.error || null),
    },
  });
  setTimeout(render, 50);
}

async function callNotifyApi(type, contact, pkg) {
  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, contact, incident: pkg }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || `Request failed (${response.status})` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function startVoiceRecording() {
  const { startRecording, stopRecording, useBrowserSpeechRecognition } = await import("./voice.js");
  try {
    const recognition = useBrowserSpeechRecognition(
      (transcript) => {
        const state = getState();
        state.ui.voiceText = transcript;
        state.ui.reportText = transcript;
        store.setUI({ voiceText: transcript, reportText: transcript });
      },
      (error) => {
        console.warn("Speech recognition error:", error.message);
      }
    );
    if (!recognition) {
      alert("Voice input is not available. Please use text input.");
      return;
    }
    recognition.start();
  } catch (error) {
    console.warn("Voice recording not available:", error.message);
    alert("Voice input is not available. Please use text input.");
  }
}

function openImagePicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const state = getState();
      state.ui.imagePreview = reader.result;
      state.ui.imageFile = file;
      store.setUI({ imagePreview: reader.result });
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function copyBrief(incidentId) {
  const incident = getState().incidents.find((i) => i.id === incidentId);
  if (!incident) return;
  import("./contacts.js").then(({ buildIncidentPackage }) => {
    const pkg = buildIncidentPackage(incident);
    navigator.clipboard.writeText(pkg.textMessage).then(() => {
      showToast("Brief copied to clipboard.");
    });
  });
}

subscribe(() => {
  const s = getState();
  const currentView = getCurrentView();
  if (s.ui.currentView !== currentView) {
    s.ui.currentView = currentView;
  }
  const navItems = document.querySelectorAll("#mobile-nav .nav-item");
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === currentView);
  });

  if (s.ui.needsRender) {
    s.ui.needsRender = false;
// On fresh load (no navigation yet), clear incident-specific hash to show emergency home
// If user has navigated (sessionStorage flag), keep the current hash
const hasNavigated = sessionStorage.getItem("lifeline-navigated") === "true";
if (!hasNavigated) {
  const hash = location.hash;
  if (hash.startsWith("#map?incident=")) {
    history.replaceState(null, "", "#emergency");
  }
}

// Clear navigation flag on page unload so next load resets
window.addEventListener("beforeunload", () => {
  sessionStorage.removeItem("lifeline-navigated");
});

render();
  }
});

installErrorBoundary();

window.addEventListener("hashchange", () => {
  setTimeout(render, 50);
});

window.navigateTo = navigateTo;
window.getState = getState;

// Fetch notification provider config once at startup so views know whether
// Twilio (or other server-side providers) are configured. Secret-free.
async function initNotificationConfig() {
  if (getState().notificationConfig) return;
  const config = await fetchProviderConfig();
  getState().notificationConfig = config;
  store.setNotificationConfig(config);
}

initNotificationConfig();

// When connectivity returns, retry notifications queued while offline.
window.addEventListener("online", () => {
  setTimeout(flushQueuedNotifications, 1000);
  registerBackgroundSync();
});

function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.sync.register("lifeline-notification-sync").catch((err) => {
        console.warn("[LIFELINE] Background sync registration failed:", err);
      });
    });
  }
}

async function flushQueuedNotifications() {
  const queue = readNotifications();
  if (!queue.length) return;
  let processed = 0;
  const failed = [];
  for (const item of queue) {
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type === "twilio" ? "sms" : item.type, contact: { id: item.contactId }, incident: item.pkg }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Request failed (" + response.status + ")");
      }
      processed++;
      const inc = getState().incidents.find((i) => i.id === item.incidentId);
      if (inc && inc.lastEscalation) {
        store.updateIncident(item.incidentId, {
          lastEscalation: { ...inc.lastEscalation, status: "SYNCED", note: "Notification sent after reconnection.", delivered: true },
          status: "active",
        });
      }
    } catch (error) {
      item.lastError = error.message || String(error);
      failed.push(item);
    }
  }
  try {
    localStorage.setItem("lifeline.notifications.v1", JSON.stringify(failed));
  } catch {}
  if (processed > 0) showToast(processed + " offline notification(s) synced.");
  if (failed.length > 0) showToast(failed.length + " notification(s) still pending.");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SYNC_NOTIFICATIONS") {
      flushQueuedNotifications();
    }
  });
}

// Initialize language support
initLanguage();

// Initialize SLA timers for active incidents
function initSLATimers() {
  const activeIncidents = getState().incidents.filter(
    (i) => i.status === "reported" || i.status === "active" || i.status === "verify"
  );
  activeIncidents.forEach((incident) => {
    createSLATimer(incident, {
      onWarning: (sla) => {
        console.log("[LIFELINE] SLA warning for", incident.id, sla.status);
      },
      onEscalation: (sla) => {
        showToast(`Escalation: ${incident.id} approaching SLA limit`);
      },
      onBreach: (sla) => {
        showToast(`SLA exceeded for ${incident.id}`, "error");
      },
    });
  });
}

// Pre-capture location in background (non-blocking)
preCaptureLocation().then(result => {
  if (result.captured) {
    console.log("[LIFELINE] Location pre-captured:", result.coords.latitude.toFixed(4), result.coords.longitude.toFixed(4));
  }
}).catch(() => {});

// Initialize WebSocket real-time sync for coordination dashboard
function initWebSocket() {
  const token = getState().settings.wsToken || getState().currentUser?.token;
  const ws = connectWebSocket(token);
  
  subscribeWS((message) => {
    if (message.type === "incident_update") {
      const incident = message.incident;
      const existing = getState().incidents.find((i) => i.id === incident.id);
      if (existing) {
        store.updateIncident(incident.id, incident);
      } else {
        store.addIncident(incident);
      }
    }
    if (message.type === "incident_created") {
      store.addIncident(message.incident);
    }
    if (message.type === "sync_response") {
      console.log("[LIFELINE] Sync response received", message.data);
    }
    if (message.type === "ws_status") {
      console.log("[LIFELINE] WebSocket status:", message.status);
    }
  });

  return ws;
}

if (getState().isOnline && getState().settings.wsEnabled !== false) {
  try {
    initWebSocket();
  } catch (e) {
    console.warn("[LIFELINE] WebSocket init failed:", e);
  }
}

// Periodically check SLA status for all active incidents
setInterval(() => {
  const slaResults = checkAllIncidentsSLA(getState().incidents);
  if (slaResults.some((s) => s.status === "breached")) {
    const breached = slaResults.filter((s) => s.status === "breached");
    if (breached.length > 0) {
      showToast(`${breached.length} incident(s) exceeded SLA`, "warning");
    }
  }
}, 60000);

// Expose report generation utilities
window.LIFELINE_REPORTS = {
  generateAfterActionReport,
  generateBatchReport,
  generateCsvReport,
  downloadReport,
  getAvailableLanguages,
  setLanguage,
  getLanguage,
};

// On fresh load (no navigation yet), clear incident-specific hash to show emergency home
// If user has navigated (sessionStorage flag), keep the current hash
const hasNavigated = sessionStorage.getItem("lifeline-navigated") === "true";
if (!hasNavigated) {
  const hash = location.hash;
  if (hash.startsWith("#map?incident=")) {
    history.replaceState(null, "", "#emergency");
  }
}

render();
