// LIFELINE AI - Global event handlers
import { getState, store } from "./store.js";
import { startAnalysisFlow } from "./flows/analyze.js";

const QUICK_TEMPLATES = {
  fire_smoke: "Fire/smoke reported. Describe what you see: flames, smoke color, building type, any injuries.",
  medical: "Medical emergency. Describe: number of injured, type of injuries, consciousness, breathing.",
  flooding: "Flooding/water emergency. Describe: water depth, rising/falling, road/homes affected, any trapped.",
  road_hazard: "Road hazard. Describe: blocked road, crash, debris, pothole, downed tree, traffic impact.",
  power_hazard: "Power/electrical hazard. Describe: downed wires, arcing, outage area, sparking, any injuries.",
  security: "Security incident. Describe: threat, weapons, suspicious activity, violence, suspect description.",
  missing_person: "Missing person. Describe: name, age, appearance, last seen location/time, clothing.",
  environmental: "Structural/environmental hazard. Describe: collapse, gas leak, hazmat, tree down, building damage.",
  community_assistance: "Community assistance needed. Describe: supplies, shelter, transport, volunteers needed.",
};

function setupGlobalListeners() {
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
    const quickBtn = e.target.closest("[data-quick]");
    if (quickBtn) {
      const type = quickBtn.dataset.quick;
      const template = QUICK_TEMPLATES[type] || "";
      const textarea = document.getElementById("report-text");
      if (textarea) {
        const existing = textarea.value.trim();
        const newText = existing ? `${existing}\n\n${template}` : template;
        textarea.value = newText;
        store.setUI({ reportText: newText });
        // Auto-advance to analysis
        const analyzeBtn = document.getElementById("analyze-btn");
        if (analyzeBtn) {
          analyzeBtn.disabled = false;
          startAnalysisFlow();
        }
      }
    }

    const btn = e.target.closest("[data-analysis-trigger]");
    if (btn) {
      btn.disabled = true;
      startAnalysisFlow();
    }
  });
}

export { setupGlobalListeners };
