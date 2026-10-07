// LIFELINE AI - Local-only analysis flow (fast, reliable, offline-first)
import { getState, store } from "../store.js";
import { localAnalysis, detectSafetyOverride } from "../analyzer.js";
import { createIncidentId, INCIDENT_STATUS_LABELS } from "../types.js";
import { showToast } from "../ui.js";

function navigateTo(hash) {
  history.replaceState(null, "", hash);
  setTimeout(() => { window.dispatchEvent(new HashChangeEvent("hashchange")); }, 0);
}

function finalizeIncident(analysis, finalUrgency, provider, hasImage) {
  const state = getState();

  state.ui.analysisResult = { ...analysis, provider, model: null, urgency: finalUrgency, safetyOverride: true };
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
    model: null,
    confidence: analysis.confidence || 0,
    aiClassification: analysis.summary || "",
    source: "local",
    safetyOverrideApplied: true,
    hasImage,
    enhanced: false,
    synced: false,
    isDemo: state.demoMode,
  };

  store.addIncident(incident);
  store.setUI({
    isAnalyzing: false,
    analysisResult: { ...analysis, provider, model: null, urgency: finalUrgency },
    selectedIncident: incident,
    reportText: "",
    imagePreview: hasImage ? state.ui.imagePreview : null,
    voiceText: state.ui.voiceText,
  });
  state.ui.selectedIncident = incident;

  navigateTo("#escalation");
  showToast("Analysis complete. Incident brief generated.");
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
  navigateTo("#analysis");

  try {
    // Instant local analysis (no network, no server calls)
    const local = localAnalysis(reportText);
    const safetyOverride = detectSafetyOverride(local.urgency, local.type, local.observations);
    const finalUrgency = safetyOverride !== local.urgency ? safetyOverride : local.urgency;

    // Immediate local result - no server calls, no waiting
    state.ui.analysisResult = { ...local, provider: "local", model: null, urgency: finalUrgency };
    store.setUI({ isAnalyzing: false, analysisResult: state.ui.analysisResult });

    finalizeIncident(local, finalUrgency, "local", !!state.ui.imagePreview);
  } catch (error) {
    console.error("Analysis failed:", error);
    showToast("Analysis error. Please try again.");
    state.ui.isAnalyzing = false;
    store.setUI({ isAnalyzing: false });
  }
}