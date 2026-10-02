// LIFELINE AI — Global event handlers and UI wiring
import { getState, store } from "./store.js";
import { startAnalysisFlow } from "./flows/analyze.js";

export function setupGlobalListeners() {
  const app = document.getElementById("app");
  if (!app) return;

  app.addEventListener("input", (e) => {
    const textarea = e.target.closest("textarea[name='text']");
    if (textarea) {
      const state = getState();
      state.ui.reportText = textarea.value;
      store.setUI({ reportText: textarea.value });
    }
  });

  app.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-analysis-trigger]");
    if (btn) {
      btn.disabled = true;
      startAnalysisFlow();
    }
  });
}
