// LIFELINE AI - Analysis screen (AI processing view)
import { getState, store } from "../store.js";
import { esc } from "../ui.js";

export function initAnalysisScreen(params = {}) {
  const state = getState();
  const reportText = state.ui.reportText || params.text || "";
  const isAnalyzing = state.ui.isAnalyzing || false;
  const analysisResult = state.ui.analysisResult;

  return `
    <div class="analysis-screen">
      <div class="card">
        <h2>Analyzing report</h2>
        <p class="mu" style="margin-bottom:16px;">${esc(reportText.slice(0, 100))}${reportText.length > 100 ? "..." : ""}</p>

        <div class="progress-steps">
          ${getProgressSteps(isAnalyzing, analysisResult)}
        </div>
      </div>

      <div class="card">
        <h3>AI Provider</h3>
        <p class="mu">
          <span class="badge ${analysisResult?.provider === "groq" ? "badge-ready" : "badge-verify"}">
            ${analysisResult?.provider === "groq" ? "GROQ CLOUD AI" : "LOCAL FALLBACK"}
          </span>
          ${analysisResult?.model ? `<span class="tag tag-gray">${esc(analysisResult.model)}</span>` : ""}
        </p>
        <p class="mu text-small">The rules engine is always active. AI fills in gaps when available.</p>
      </div>

      ${isAnalyzing ? `
      <div class="card">
        <div class="flex-center" style="gap:8px; padding:20px;">
          <div class="step-indicator active"></div>
          <span class="text-muted">Processing your report...</span>
        </div>
      </div>` : ""}

      ${!analysisResult && !isAnalyzing ? `
      <div class="card text-center" style="padding:32px 20px;">
        <div style="font-size:48px; margin-bottom:12px;"></div>
        <h3>Ready to analyze</h3>
        <p class="mu">Press analyze to classify this incident and generate an incident brief.</p>
        <button type="button" class="btn btn-primary" data-action="analyze-report" style="margin-top:12px;">
          ANALYZE REPORT
        </button>
      </div>` : ""}
    </div>
  `;
}

function getProgressSteps(isAnalyzing, analysisResult) {
  const steps = [
    { label: "Extracting observations", complete: !!analysisResult || isAnalyzing },
    { label: "Identifying incident type", complete: !!analysisResult || isAnalyzing },
    { label: "Assessing urgency", complete: !!analysisResult || isAnalyzing },
    { label: "Checking missing information", complete: !!analysisResult || isAnalyzing },
    { label: "Processing location", complete: !!analysisResult || isAnalyzing },
    { label: "Determining response category", complete: !!analysisResult || isAnalyzing },
    { label: "Building incident brief", complete: !!analysisResult || isAnalyzing },
  ];

  if (isAnalyzing) {
    return steps.map((step, i) => `
      <div class="progress-step">
        <div class="step-indicator ${step.complete ? "complete" : "active"}">${step.complete ? "[OK]" : "[*]"}</div>
        <div class="step-label">${step.label}</div>
        <div class="step-status">
          ${i === steps.findIndex(s => !s.complete) ? 'RUNNING' : step.complete ? 'COMPLETE' : 'WAITING'}
        </div>
      </div>
    `).join("");
  }

  return steps.map((step) => `
    <div class="progress-step">
      <div class="step-indicator ${step.complete ? "complete" : "pending"}">${step.complete ? "[OK]" : "[o]"}</div>
      <div class="step-label">${step.label}</div>
      <div class="step-status">${step.complete ? "COMPLETE" : "PENDING"}</div>
    </div>
  `).join("");
}
