// LIFELINE AI — Analysis flow (AI router + rules engine)
import { getState, store } from "../store.js";
import { localAnalysis } from "../analyzer.js";
import { createIncidentId, INCIDENT_STATUS_LABELS } from "../types.js";
import { showToast } from "../ui.js";

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
  const hash = location.hash;
  history.replaceState(null, "", "#analysis");
  setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 100);

  try {
    const analysis = await runAnalysis(reportText, state.ui.imagePreview);
    state.ui.analysisResult = analysis;
    state.ui.isAnalyzing = false;

    const incident = {
      id: createIncidentId(),
      type: analysis.type,
      typeLabel: analysis.typeLabel,
      urgency: analysis.urgency,
      status: "reported",
      observations: analysis.observations.map(o => o.label),
      missingInfo: analysis.missingInfo,
      summary: analysis.summary,
      location: state.ui.location || null,
      timestamp: Date.now(),
      provider: analysis.provider,
      model: analysis.model,
      confidence: analysis.confidence,
      aiClassification: analysis.summary,
      source: analysis.source,
      synced: false,
      isDemo: state.demoMode,
    };

    store.addIncident(incident);
    store.setUI({
      isAnalyzing: false,
      analysisResult: analysis,
      selectedIncident: incident,
      reportText: "",
      imagePreview: null,
      voiceText: null,
    });
    state.ui.selectedIncident = incident;
    state.ui.analysisResult = analysis;

    history.replaceState(null, "", "#brief");
    setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 100);
    showToast("Analysis complete. Incident brief generated.");
  } catch (error) {
    state.ui.isAnalyzing = false;
    store.setUI({ isAnalyzing: false });
    console.error("Analysis failed:", error);
    showToast("Analysis failed. Showing local analysis result.");
    const local = localAnalysis(reportText);
    const incident = {
      id: createIncidentId(),
      type: local.type,
      typeLabel: local.typeLabel,
      urgency: local.urgency,
      status: "reported",
      observations: local.observations,
      missingInfo: local.missingInfo,
      summary: local.summary,
      location: state.ui.location || null,
      timestamp: Date.now(),
      provider: "rules",
      model: null,
      confidence: local.confidence,
      aiClassification: local.summary,
      source: "local",
      synced: false,
    };
    store.addIncident(incident);
    state.ui.selectedIncident = incident;
    state.ui.analysisResult = { ...local, provider: "rules", model: null };
    history.replaceState(null, "", "#brief");
    setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 100);
  }
}

async function runAnalysis(text, imageDataUrl) {
  const state = getState();
  const mode = state.settings.mode;
  const apiKey = state.settings.groqApiKey;

  if (mode === "rules") {
    const local = localAnalysis(text);
    return { ...local, provider: "rules", model: null };
  }

  if (mode === "groq" || mode === "automatic") {
    if (apiKey && navigator.onLine) {
      try {
        const { getAIAnalysis } = await import("../analyzer.js");
        const result = await getAIAnalysis(text, imageDataUrl, { apiKey, fetchImpl: fetch, signal: AbortSignal.timeout(30000) });
        return result;
      } catch (error) {
        console.warn("Groq analysis failed, falling back to local:", error.message);
        const local = localAnalysis(text);
        return { ...local, provider: "rules", model: null, fallbackFrom: "groq" };
      }
    }
    const local = localAnalysis(text);
    return { ...local, provider: "rules", model: null };
  }

  const local = localAnalysis(text);
  return { ...local, provider: "rules", model: null };
}
