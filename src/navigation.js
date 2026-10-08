// LIFELINE AI - Navigation utilities
import { getState, store } from "./store.js";

export function navigateTo(view, params = {}) {
  const routes = {
    emergency: true,
    report: true,
    analysis: true,
    brief: true,
    location: true,
    escalation: true,
    confirm: true,
    delivery: true,
    map: true,
    history: true,
    settings: true,
    contacts: true,
    coordination: true,
    audit: true,
    about: true,
    privacy: true,
    help: true,
    auth: true,
    setup: true,
  };
  
  if (!routes[view]) view = "emergency";
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("page-exit");
    app.classList.add("page-exit-active");
  }
  setTimeout(() => {
    const search = new URLSearchParams(params);
    const newHash = "#" + view + (search.toString() ? "?" + search.toString() : "");
    // Mark that user has navigated (not a fresh load)
    sessionStorage.setItem("lifeline-navigated", "true");
    // Use location.hash to trigger hashchange event
    location.hash = newHash;
    getState().ui.currentView = view;
    getState().ui.params = params;
    store.save();
  }, 150);
}

export function getHashRoute() {
  const hash = location.hash.replace(/^#!?/, "").trim() || "emergency";
  // Extract only the path part before query string
  const path = hash.split("?")[0];
  return path || "emergency";
}