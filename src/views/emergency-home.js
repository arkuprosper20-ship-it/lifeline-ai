// LIFELINE AI - Emergency Home Screen
import { getState, store } from "../store.js";
import { navigateTo } from "../navigation.js";
import { preCaptureLocation } from "../location.js";
import { localAnalysis } from "../analyzer.js";
import { showToast, esc } from "../ui.js";

const EMERGENCY_CATEGORIES = [
  { id: "medical", label: "MEDICAL", icon: "🚑", color: "#ec4899", description: "Injury, illness, unconscious" },
  { id: "fire", label: "FIRE", icon: "🔥", color: "#ef4444", description: "Fire, smoke, explosion" },
  { id: "danger", label: "DANGER", icon: "🚨", color: "#f97316", description: "Violence, threat, weapon" },
  { id: "accident", label: "ACCIDENT", icon: "🚗", color: "#a855f7", description: "Crash, collision, pileup" },
  { id: "flood", label: "FLOOD", icon: "🌊", color: "#3b82f6", description: "Flood, water, storm" },
  { id: "other", label: "OTHER", icon: "🆘", color: "#6b7280", description: "Any other emergency" },
];

const FOLLOWUP_QUESTIONS = {
  medical: [
    { key: "injured", label: "IS ANYONE INJURED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
    { key: "severity", label: "HOW SERIOUS?", options: [{ id: "critical", label: "CRITICAL" }, { id: "serious", label: "SERIOUS" }, { id: "unsure", label: "NOT SURE" }] },
  ],
  fire: [
    { key: "trapped", label: "ANYONE TRAPPED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
    { key: "spreading", label: "IS IT SPREADING?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
  ],
  danger: [
    { key: "weapon", label: "WEAPON INVOLVED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
    { key: "immediate", label: "IMMEDIATE THREAT?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
  ],
  accident: [
    { key: "injured", label: "ANYONE INJURED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
    { key: "blocking", label: "ROAD BLOCKED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
  ],
  flood: [
    { key: "trapped", label: "ANYONE TRAPPED?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
    { key: "rising", label: "WATER RISING?", options: [{ id: "yes", label: "YES" }, { id: "no", label: "NO" }, { id: "unsure", label: "NOT SURE" }] },
  ],
  other: [
    { key: "details", label: "WHAT HAPPENED?", options: [{ id: "medical", label: "MEDICAL" }, { id: "fire", label: "FIRE" }, { id: "danger", label: "DANGER" }, { id: "accident", label: "ACCIDENT" }, { id: "flood", label: "FLOOD" }] },
  ],
};

let currentCategory = null;
let currentQuestionIndex = 0;
let answers = {};

export function initEmergencyHome(params = {}) {
  if (params.category) {
    currentCategory = params.category;
    answers = { category: params.category };
    currentQuestionIndex = 0;
    return renderQuestionScreen();
  }
  return renderHomeScreen();
}

function renderHomeScreen() {
  return `
    <div class="emergency-home">
      <div class="emergency-header">
        <h1>LIFELINE</h1>
        <p class="subtitle">EMERGENCY RESPONSE SYSTEM</p>
      </div>
      
      <div class="emergency-grid" role="list">
        ${EMERGENCY_CATEGORIES.map(cat => `
          <button 
            class="emergency-btn" 
            data-category="${cat.id}"
            style="--cat-color: ${cat.color};"
            role="listitem"
            aria-label="${cat.label} emergency"
          >
            <span class="emergency-icon" aria-hidden="true">${cat.icon}</span>
            <span class="emergency-label">${cat.label}</span>
            <span class="emergency-desc">${cat.description}</span>
          </button>
        `).join('')}
      </div>
      
      <div class="emergency-footer">
        <button class="btn btn-secondary btn-sm" data-action="voice-emergency">
          🎙 VOICE EMERGENCY
        </button>
        <button class="btn btn-secondary btn-sm" data-action="photo-emergency">
          📷 PHOTO REPORT
        </button>
      </div>
      
      <div class="emergency-links">
        <a href="#community" class="community-link">COMMUNITY REPORTS</a>
        <a href="#history" class="community-link">HISTORY</a>
        <a href="#settings" class="community-link">SETTINGS</a>
      </div>
    </div>
  `;
}

function renderQuestionScreen() {
  const cat = EMERGENCY_CATEGORIES.find(c => c.id === currentCategory);
  const questions = FOLLOWUP_QUESTIONS[currentCategory] || [];
  
  if (currentQuestionIndex >= questions.length) {
    return renderConfirmScreen();
  }
  
  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;
  
  return `
    <div class="emergency-question">
      <div class="question-header">
        <div class="progress-bar" style="width: ${progress}%"></div>
        <div class="question-meta">
          <span class="category-badge" style="background: ${cat.color}">${cat.label}</span>
          <span class="step-counter">STEP ${currentQuestionIndex + 1} OF ${questions.length}</span>
        </div>
      </div>
      
      <div class="question-content">
        <h2 class="question-text">${q.label}</h2>
      </div>
      
      <div class="question-options" role="group" aria-label="${q.label}">
        ${q.options.map(opt => `
          <button 
            class="option-btn" 
            data-answer="${opt.id}"
            style="--cat-color: ${cat.color};"
            role="radio"
            aria-checked="false"
          >
            ${opt.label}
          </button>
        `).join('')}
      </div>
      
      <div class="question-footer">
        <button class="btn btn-secondary btn-back" data-action="prev-question">BACK</button>
      </div>
    </div>
  `;
}

function renderConfirmScreen() {
  const cat = EMERGENCY_CATEGORIES.find(c => c.id === currentCategory);
  
  return `
    <div class="emergency-confirm">
      <div class="confirm-header">
        <div class="status-indicator immediate">READY TO SEND</div>
      </div>
      
      <div class="confirm-summary">
        <div class="summary-row">
          <span class="summary-label">EMERGENCY</span>
          <span class="summary-value" style="color: ${cat.color}">${cat.label}</span>
        </div>
        ${answers.injured ? `<div class="summary-row"><span class="summary-label">INJURED</span><span class="summary-value">${answers.injured.toUpperCase()}</span></div>` : ''}
        ${answers.severity ? `<div class="summary-row"><span class="summary-label">SEVERITY</span><span class="summary-value">${answers.severity.toUpperCase()}</span></div>` : ''}
        ${answers.trapped ? `<div class="summary-row"><span class="summary-label">TRAPPED</span><span class="summary-value">${answers.trapped.toUpperCase()}</span></div>` : ''}
        ${answers.spreading ? `<div class="summary-row"><span class="summary-label">SPREADING</span><span class="summary-value">${answers.spreading.toUpperCase()}</span></div>` : ''}
        ${answers.weapon ? `<div class="summary-row"><span class="summary-label">WEAPON</span><span class="summary-value">${answers.weapon.toUpperCase()}</span></div>` : ''}
        ${answers.immediate ? `<div class="summary-row"><span class="summary-label">IMMEDIATE</span><span class="summary-value">${answers.immediate.toUpperCase()}</span></div>` : ''}
        ${answers.blocking ? `<div class="summary-row"><span class="summary-label">BLOCKING</span><span class="summary-value">${answers.blocking.toUpperCase()}</span></div>` : ''}
        ${answers.rising ? `<div class="summary-row"><span class="summary-label">RISING</span><span class="summary-value">${answers.rising.toUpperCase()}</span></div>` : ''}
        <div class="summary-row">
          <span class="summary-label">LOCATION</span>
          <span class="summary-value status-detected">DETECTED</span>
        </div>
      </div>
      
      <div class="confirm-actions">
        <button class="btn btn-emergency" data-action="send-help">
          <span class="btn-icon" aria-hidden="true">🚑</span>
          SEND HELP NOW
        </button>
        <button class="btn btn-secondary" data-action="cancel-emergency">CANCEL</button>
      </div>
      
      <div class="confirm-note">
        <span class="note-icon" aria-hidden="true">⚠</span>
        <span>This will contact emergency services with your location and incident details.</span>
      </div>
    </div>
  `;
}

function renderLocatingScreen() {
  return `
    <div class="emergency-locating">
      <div class="locating-spinner" aria-label="Locating you"></div>
      <h2>LOCATING YOU...</h2>
      <p class="locating-hint">Please wait while we detect your position</p>
      <div class="locating-steps">
        <div class="locating-step active">GPS</div>
        <div class="locating-step">ACCURACY</div>
        <div class="locating-step">CONFIRMED</div>
      </div>
    </div>
  `;
}

export async function setupEmergencyHomeHandlers() {
  const app = document.getElementById("app");
  if (!app) return;

  // Home screen category selection
  app.addEventListener("click", async (e) => {
    const categoryBtn = e.target.closest("[data-category]");
    if (categoryBtn) {
      const category = categoryBtn.dataset.category;
      currentCategory = category;
      answers = { category };
      currentQuestionIndex = 0;
      
      // Show locating screen immediately
      app.innerHTML = renderLocatingScreen();
      
      // Auto-capture location in background
      try {
        const { getCurrentLocation } = await import("../location.js");
        const location = await getCurrentLocation({ enableHighAccuracy: true, timeout: 10000 });
        store.setUI({ location });
        showToast("Location detected", "success");
      } catch (error) {
        console.warn("[LIFELINE] Auto-location failed:", error);
        showToast("Location unavailable - you can add manually", "warning");
      }
      
      // Move to first question
      setTimeout(() => {
        if (FOLLOWUP_QUESTIONS[category] && FOLLOWUP_QUESTIONS[category].length > 0) {
          app.innerHTML = renderQuestionScreen();
        } else {
          app.innerHTML = renderConfirmScreen();
        }
        setupQuestionHandlers();
      }, 800);
    }

    // Voice emergency
    if (e.target.closest("[data-action='voice-emergency']")) {
      startVoiceEmergency();
    }
    
    // Photo emergency
    if (e.target.closest("[data-action='photo-emergency']")) {
      startPhotoEmergency();
    }
    
    // Community link
    if (e.target.closest(".community-link")) {
      e.preventDefault();
      navigateTo(e.target.getAttribute("href").replace("#", ""));
    }
  });

  // Question screen handlers
  app.addEventListener("click", (e) => {
    const optionBtn = e.target.closest("[data-answer]");
    if (optionBtn) {
      const question = FOLLOWUP_QUESTIONS[currentCategory][currentQuestionIndex];
      answers[question.key] = optionBtn.dataset.answer;
      
      // Visual feedback
      document.querySelectorAll(".option-btn").forEach(btn => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });
      optionBtn.classList.add("selected");
      optionBtn.setAttribute("aria-checked", "true");
      
      // Auto-advance after short delay
      setTimeout(() => {
        currentQuestionIndex++;
        const app = document.getElementById("app");
        if (app) {
          if (currentQuestionIndex >= (FOLLOWUP_QUESTIONS[currentCategory] || []).length) {
            app.innerHTML = renderConfirmScreen();
          } else {
            app.innerHTML = renderQuestionScreen();
          }
          setupQuestionHandlers();
        }
      }, 300);
    }
    
    if (e.target.closest("[data-action='prev-question']")) {
      currentQuestionIndex = Math.max(0, currentQuestionIndex - 1);
      const app = document.getElementById("app");
      if (app) app.innerHTML = renderQuestionScreen();
      setupQuestionHandlers();
    }
  });

  // Confirm screen handlers
  app.addEventListener("click", async (e) => {
    if (e.target.closest("[data-action='send-help']")) {
      await sendHelp();
    }
    if (e.target.closest("[data-action='cancel-emergency']")) {
      resetEmergencyFlow();
      navigateTo("emergency");
    }
  });
}

function setupQuestionHandlers() {
  // Handlers are attached via event delegation in setupEmergencyHomeHandlers
}

async function sendHelp() {
  const app = document.getElementById("app");
  const state = getState();
  
  // Show sending state
  app.innerHTML = `
    <div class="emergency-sending">
      <div class="sending-spinner"></div>
      <h2>SENDING HELP REQUEST...</h2>
      <p class="sending-status">Contacting emergency services</p>
      <div class="sending-steps">
        <div class="sending-step complete">INCIDENT CREATED</div>
        <div class="sending-step complete">LOCATION ATTACHED</div>
        <div class="sending-step active">SENDING REQUEST</div>
        <div class="sending-step">CONFIRMED</div>
      </div>
    </div>
  `;
  
  try {
    // Create incident with all collected data
    const { createIncidentId } = await import("../types.js");
    const { buildIncidentPackage } = await import("../contacts.js");
    
    const incident = {
      id: createIncidentId(),
      type: currentCategory,
      typeLabel: EMERGENCY_CATEGORIES.find(c => c.id === currentCategory)?.label || currentCategory,
      urgency: determineUrgency(answers),
      status: "active",
      observations: buildObservations(answers),
      location: state.ui.location,
      timestamp: Date.now(),
      answers,
      source: "emergency",
    };
    
    store.addIncident(incident);
    state.ui.selectedIncident = incident;
    
    // Build notification package
    const pkg = buildIncidentPackage(incident);
    
    // Try to send via configured providers
    let sent = false;
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "call", contact: { id: "emergency" }, incident: pkg }),
      });
      if (response.ok) sent = true;
    } catch (e) {
      console.warn("[LIFELINE] Notify API unavailable:", e);
    }
    
    // Show active incident screen
    setTimeout(() => {
      navigateTo(`incident/${incident.id}`);
    }, 500);
    
  } catch (error) {
    console.error("[LIFELINE] Send help failed:", error);
    showToast("Failed to send help request", "error");
    setTimeout(() => { app.innerHTML = renderConfirmScreen(); }, 1000);
  }
}

function determineUrgency(answers) {
  if (answers.severity === "critical" || answers.immediate === "yes" || answers.trapped === "yes") return "immediate";
  if (answers.severity === "serious" || answers.injured === "yes" || answers.weapon === "yes" || answers.spreading === "yes") return "urgent";
  if (answers.injured === "unsure" || answers.trapped === "unsure") return "verify";
  return "urgent";
}

function buildObservations(answers) {
  const obs = [];
  if (answers.injured === "yes") obs.push("Injuries reported");
  if (answers.trapped === "yes") obs.push("People trapped");
  if (answers.spreading === "yes") obs.push("Situation spreading");
  if (answers.weapon === "yes") obs.push("Weapon involved");
  if (answers.blocking === "yes") obs.push("Road blocked");
  if (answers.rising === "yes") obs.push("Water rising");
  if (answers.immediate === "yes") obs.push("Immediate threat");
  return obs;
}

function resetEmergencyFlow() {
  currentCategory = null;
  currentQuestionIndex = 0;
  answers = {};
}

async function startVoiceEmergency() {
  const { startVoiceRecording } = await import("../voice.js");
  const result = await startVoiceRecording();
  if (result && result.transcript) {
    // Parse transcript for category
    const transcript = result.transcript.toLowerCase();
    let category = "other";
    if (transcript.includes("medical") || transcript.includes("hurt") || transcript.includes("injury")) category = "medical";
    else if (transcript.includes("fire") || transcript.includes("smoke")) category = "fire";
    else if (transcript.includes("accident") || transcript.includes("crash")) category = "accident";
    else if (transcript.includes("flood") || transcript.includes("water")) category = "flood";
    else if (transcript.includes("danger") || transcript.includes("threat") || transcript.includes("weapon")) category = "danger";
    
    currentCategory = category;
    answers = { category, voice: transcript };
    currentQuestionIndex = 0;
    
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = renderLocatingScreen();
      setTimeout(() => {
        if (FOLLOWUP_QUESTIONS[category] && FOLLOWUP_QUESTIONS[category].length > 0) {
          app.innerHTML = renderQuestionScreen();
        } else {
          app.innerHTML = renderConfirmScreen();
        }
        setupQuestionHandlers();
      }, 800);
    }
  }
}

async function startPhotoEmergency() {
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
    
    currentCategory = "other";
    answers = { category: "other", hasPhoto: true };
    currentQuestionIndex = 0;
    
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = renderLocatingScreen();
      setTimeout(() => {
        if (FOLLOWUP_QUESTIONS.other && FOLLOWUP_QUESTIONS.other.length > 0) {
          app.innerHTML = renderQuestionScreen();
        } else {
          app.innerHTML = renderConfirmScreen();
        }
        setupQuestionHandlers();
      }, 800);
    }
  };
  input.click();
}