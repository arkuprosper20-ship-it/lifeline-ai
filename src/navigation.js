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
  
  if (!routes[view]) view = "report";
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("page-exit");
    app.classList.add("page-exit-active");
  }
  setTimeout(() => {
    const search = new URLSearchParams(params);
    history.replaceState(null, "", "#" + view + (search.toString() ? "?" + search.toString() : ""));
    getState().ui.currentView = view;
    getState().ui.params = params;
    store.save();
    // Render will be triggered by hashchange listener
  }, 150);
}

export function getHashRoute() {
  const hash = location.hash.replace(/^#!?/, "").trim() || "emergency";
  // Extract only the path part before query string
  const path = hash.split("?")[0];
  return path || "emergency";
}