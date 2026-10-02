// LIFELINE AI — Main entry point and router
import { store, getState, subscribe } from "./store.js";
import { initReportScreen } from "./views/report.js";
import { initAnalysisScreen } from "./views/analysis.js";
import { initIncidentBrief } from "./views/incident-brief.js";
import { initLocationScreen, setupLocationHandlers } from "./views/location-screen.js";
import { initEscalationScreen, setupEscalationHandlers } from "./views/escalation.js";
import { initConfirmScreen, setupConfirmHandlers } from "./views/confirm.js";
import { initDeliveryStatus, setupDeliveryHandlers } from "./views/delivery-status.js";
import { initMapScreen, setupMap } from "./views/map.js";
import { initHistoryScreen } from "./views/history.js";
import { initSettingsScreen, setupSettingsHandlers } from "./views/settings.js";
import { initContactsAdmin, setupContactsHandlers } from "./views/contacts-admin.js";
import { initCoordinationScreen } from "./views/coordination.js";
import { initAuditScreen } from "./views/audit.js";
import { initAboutScreen } from "./views/about.js";
import { initPrivacyScreen } from "./views/privacy.js";
import { initHelpScreen } from "./views/help.js";
import { initAuthScreen, setupAuthHandlers } from "./views/auth.js";
import { startAnalysisFlow } from "./flows/analyze.js";
import { setupGlobalListeners } from "./handlers.js";
import { renderComponent } from "./ui.js";

const routes = {
  report: initReportScreen,
  analysis: initAnalysisScreen,
  brief: initIncidentBrief,
  location: initLocationScreen,
  escalation: initEscalationScreen,
  confirm: initConfirmScreen,
  delivery: initDeliveryStatus,
  map: initMapScreen,
  history: initHistoryScreen,
  settings: initSettingsScreen,
  contacts: initContactsAdmin,
  coordination: initCoordinationScreen,
  audit: initAuditScreen,
  about: initAboutScreen,
  privacy: initPrivacyScreen,
  help: initHelpScreen,
  auth: initAuthScreen,
};

const mobileNavViews = ["report", "map", "history", "settings"];
const viewSetups = {
  location: setupLocationHandlers,
  escalation: setupEscalationHandlers,
  confirm: setupConfirmHandlers,
  delivery: setupDeliveryHandlers,
  settings: setupSettingsHandlers,
  contacts: setupContactsHandlers,
  auth: setupAuthHandlers,
};

function getHashRoute() {
  const hash = location.hash.replace(/^#!?/, "").trim() || "report";
  return hash;
}

function getCurrentView() {
  const route = getHashRoute();
  return routes[route] ? route : "report";
}

function initMobileNav() {
  const existing = document.getElementById("mobile-nav");
  if (existing) existing.remove();
  const nav = document.createElement("nav");
  nav.id = "mobile-nav";
  nav.className = "bottom-nav";
  const current = getCurrentView();
  nav.innerHTML = `
    <div class="nav-item ${mobileNavViews.includes(current) && current === "report" ? "active" : ""}" data-view="report">📝<br>Report</div>
    <div class="nav-item ${mobileNavViews.includes(current) && current === "map" ? "active" : ""}" data-view="map">🗺<br>Map</div>
    <div class="nav-item ${mobileNavViews.includes(current) && current === "history" ? "active" : ""}" data-view="history">📜<br>History</div>
    <div class="nav-item ${mobileNavViews.includes(current) && current === "settings" ? "active" : ""}" data-view="settings">⚙<br>Settings</div>
  `;
  document.body.appendChild(nav);
  nav.addEventListener("click", (e) => {
    const item = e.target.closest("[data-view]");
    if (!item) return;
    navigateTo(item.dataset.view);
  });
}

function navigateTo(view, params = {}) {
  if (!routes[view]) view = "report";
  const search = new URLSearchParams(params);
  history.replaceState(null, "", "#" + view + (search.toString() ? "?" + search.toString() : ""));
  getState().ui.currentView = view;
  getState().ui.params = params;
  store.save();
  render();
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
  app.innerHTML = "";
  if (typeof html === "string") {
    app.innerHTML = html;
  } else if (typeof html === "function") {
    renderComponent(app, html);
  }
  initMobileNav();
  if (viewSetups[view]) {
    setTimeout(() => viewSetups[view](), 50);
  }
  if (view === "map") {
    setTimeout(() => setupMap(), 100);
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
}

function parseHashParams() {
  const hash = location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex < 0) return {};
  const query = hash.slice(qIndex + 1);
  const params = {};
  query.split("&").forEach(pair => {
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
    case "go-back":
      history.back();
      break;
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
  const incident = getState().incidents.find(i => i.id === incidentId);
  if (!incident) return;
  import("./contacts.js").then(({ buildIncidentPackage }) => {
    const pkg = buildIncidentPackage(incident);
    navigator.clipboard.writeText(pkg.textMessage).then(() => {
      showToast("Brief copied to clipboard.");
    });
  });
}

function showToast(msg) {
  const div = document.createElement("div");
  div.className = "toast toast-info";
  div.textContent = msg;
  div.style.cssText = "position:fixed;bottom:24px;right:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 18px;font-size:13px;z-index:300;animation:slideIn .2s ease;";
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

subscribe(() => {
  const s = getState();
  const currentView = getCurrentView();
  if (s.ui.currentView !== currentView) {
    s.ui.currentView = currentView;
  }
  const navItems = document.querySelectorAll("#mobile-nav .nav-item");
  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.view === currentView);
  });

  if (s.ui.needsRender) {
    s.ui.needsRender = false;
    render();
  }
});

setupGlobalListeners();

window.addEventListener("hashchange", () => {
  setTimeout(render, 50);
});

window.navigateTo = navigateTo;
window.getState = getState;

render();
