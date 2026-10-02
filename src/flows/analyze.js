// LIFELINE AI — Analysis flow (AI router + rules engine)
import { getState, store } from "../store.js";
import { localAnalysis, detectSafetyOverride } from "../analyzer.js";
import { createIncidentId, INCIDENT_STATUS_LABELS } from "../types.js";
import { showToast } from "../ui.js";

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const { routes, viewSetups, getCurrentView, parseHashParams, initSidebar, initMobileNav, setupMap } = window;
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
  }
  initSidebar();
  initMobileNav();
  setTimeout(() => {
    if (viewSetups[view]) viewSetups[view]();
    if (view === "map") setupMap();
    if (view === "coordination") setupMap("dashboard-map", { isDashboard: true });
  }, 50);
}

function finalizeIncident(analysis, finalUrgency, provider, model, hasImage, enhanced) {
  const state = getState();
  const safetyOverride = provider !== "rules" || enhanced;

  state.ui.analysisResult = { ...analysis, provider, model, urgency: finalUrgency, safetyOverride };
  state.ui.isAnalyzing = false;

  const incident = {
    id: createIncidentId(),
    type: analysis.type,
    typeLabel: analysis.typeLabel,
    urgency: finalUrgency,
    status: "reported",
    observations: (analysis.observations || []).map(o => typeof o === "string" ? o : o.label),
    missingInfo: analysis.missingInfo || [],
    summary: analysis.summary || "",
    location: state.ui.location || null,
    timestamp: Date.now(),
    provider,
    model,
    confidence: analysis.confidence || 0,
    aiClassification: analysis.summary || "",
    source: provider === "groq" ? "ai" : "local",
    safetyOverrideApplied: safetyOverride,
    hasImage,
    enhanced,
    synced: false,
    isDemo: state.demoMode,
  };

  store.addIncident(incident);
  store.setUI({
    isAnalyzing: false,
    analysisResult: { ...analysis, provider, model, urgency: finalUrgency },
    selectedIncident: incident,
    reportText: "",
    imagePreview: hasImage ? state.ui.imagePreview : null,
    voiceText: state.ui.voiceText,
  });
  state.ui.selectedIncident = incident;

  history.replaceState(null, "", "#escalation");
  setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 50);
  showToast(enhanced ? "AI analysis complete. Incident brief generated." : "Analysis complete. Incident brief generated.");
}

export async function startAnalysisFlow() {
  const state = getState();
  const reportText = state.ui.reportText || "";
  if (!reportText.trim()) {
    showToast("Please describe the situation before analyzing.");
    return;
  }

  state.ui.isAnalyzing = true;
  state.ui.analysisResult = null;
  store.setUI({ isAnalyzing: true, reportText });
  state.ui.params = {};
  history.replaceState(null, "", "#analysis");
  setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 100);

  try {
    const mode = state.settings.mode;

    // Always run local analysis first for instant feedback
    const local = localAnalysis(reportText);
    const safetyOverride = detectSafetyOverride(local.urgency, local.type, local.observations);
    const finalUrgency = safetyOverride !== local.urgency ? safetyOverride : local.urgency;

    // Check if AI is available from server (no user key needed)
    const useAI = (mode === "groq" || mode === "automatic") && navigator.onLine;

    // Show local result immediately if AI is not needed
    if (!useAI) {
      state.ui.analysisResult = { ...local, provider: "rules", model: null };
      finalizeIncident(local, finalUrgency, "rules", null, !!state.ui.imagePreview, false);
      return;
    }

    // AI mode: show local result first, then enhance via server-side endpoint
    state.ui.analysisResult = { ...local, provider: "rules", model: null, fallbackFrom: "ai" };
    store.setUI({ isAnalyzing: true, analysisResult: state.ui.analysisResult });
    setTimeout(render, 50);

    try {
      const { getAIAnalysis } = await import("../analyzer.js");
      const result = await getAIAnalysis(reportText, state.ui.imagePreview, {
        fetchImpl: fetch,
        signal: AbortSignal.timeout(15000),
        observations: local.observations,
        incidentType: local.type,
        urgency: local.urgency
      });
      if (result.provider === "groq") {
        const aiUrgency = result.analysis?.urgency || local.urgency;
        const aiOverride = detectSafetyOverride(aiUrgency, result.analysis?.type || local.type, result.analysis?.observations || []);
        const finalAIUrgency = aiOverride !== aiUrgency ? aiOverride : aiUrgency;
        finalizeIncident(result.analysis, finalAIUrgency, "groq", result.model || "llama-3.3-70b-versatile", !!state.ui.imagePreview, true);
      } else {
        finalizeIncident({ ...state.ui.analysisResult, provider: "rules", model: null }, finalUrgency, "rules", null, !!state.ui.imagePreview, false);
      }
    } catch (error) {
      console.warn("Groq analysis failed, using local result:", error.message);
      finalizeIncident({ ...state.ui.analysisResult, provider: "rules", model: null }, finalUrgency, "rules", null, !!state.ui.imagePreview, false);
    }
  } catch (error) {
    // Fallback to pure local on unexpected error
    const local = localAnalysis(reportText);
    const safetyOverride = detectSafetyOverride(local.urgency, local.type, local.observations || []);
    finalizeIncident(local, safetyOverride !== local.urgency ? safetyOverride : local.urgency, "rules", null, !!state.ui.imagePreview, false);
  }
}