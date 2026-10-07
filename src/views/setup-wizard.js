// LIFELINE AI - Setup wizard screen
import { getState, store } from "../store.js";
import { getContacts, saveContacts } from "../contacts.js";
import { getEmergencyContactsForCountry, discoverEmergencyContacts, getRecommendedEmergencyContact } from "../emergency-contacts.js";
import { esc } from "../ui.js";
import { INCIDENT_TYPES, RESPONSE_CATEGORIES } from "../types.js";

const SETUP_STEPS = [
  { id: "welcome", label: "Welcome", icon: "👋" },
  { id: "country", label: "Country", icon: "🌍" },
  { id: "emergency", label: "Emergency Contacts", icon: "🚓" },
  { id: "response", label: "Response Teams", icon: "[PHONE]" },
  { id: "done", label: "Complete", icon: "✅" },
];

export function initSetupWizard(params = {}) {
  const state = getState();
  const step = state.ui.setupStep || "welcome";

  const steps = SETUP_STEPS.map(s => `
    <div class="step-indicator ${s.id === step ? "complete" : s.id === "welcome" && step !== "welcome" ? "complete" : ""}" style="display:inline-block; width:32px; height:32px; border-radius:50%; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; margin-right:8px; font-size:14px;">
      ${step !== s.id && SETUP_STEPS.findIndex(ss => ss.id === step) > SETUP_STEPS.findIndex(ss => ss.id === s.id) ? "[OK]" : s.icon}
    </div>
  `).join("");

  return `
    <div class="setup-wizard">
      <div class="card">
        <h2>Setup Wizard</h2>
        <p class="mu">Let's configure LIFELINE for your community.</p>
        <div style="display:flex; gap:8px; margin-top:12px;">
          ${steps}
        </div>
      </div>
      ${renderStep(step, state)}
    </div>
  `;
}

function renderStep(step, state) {
  switch (step) {
    case "welcome":
      return `
        <div class="card">
          <h3>Welcome to LIFELINE AI</h3>
          <p class="mu">This wizard will help you configure emergency contacts and response teams for your region.</p>
          <p class="mu">You'll need about 2 minutes.</p>
          <div class="btn-row" style="margin-top:20px;">
            <button class="btn btn-primary" data-action="setup-step" data-step="country">Start Setup</button>
          </div>
        </div>
      `;

    case "country":
      return `
        <div class="card">
          <h3>Country / Region</h3>
          <label>Select your country to auto-configure emergency numbers
            <select id="setup-country" style="margin-top:6px; width:100%; padding:8px; border-radius:8px; background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary);">
              <option value="US" ${state.settings.countryCode === "US" ? "selected" : ""}>United States (911)</option>
              <option value="CA" ${state.settings.countryCode === "CA" ? "selected" : ""}>Canada (911)</option>
              <option value="GB" ${state.settings.countryCode === "GB" ? "selected" : ""}>United Kingdom (999)</option>
              <option value="DE" ${state.settings.countryCode === "DE" ? "selected" : ""}>Germany (112)</option>
              <option value="FR" ${state.settings.countryCode === "FR" ? "selected" : ""}>France (112)</option>
              <option value="IN" ${state.settings.countryCode === "IN" ? "selected" : ""}>India (112)</option>
              <option value="AU" ${state.settings.countryCode === "AU" ? "selected" : ""}>Australia (000)</option>
              <option value="OTHER" ${!["US","CA","GB","DE","FR","IN","AU"].includes(state.settings.countryCode) ? "selected" : ""}>Other / Not listed</option>
            </select>
          </label>
          ${state.settings.mode === "groq" || (state.settings.mode === "automatic" && state.settings.groqApiKey) ? `
            <p class="mu text-small" style="margin-top:8px;">
              <label>Or enter a country code for AI lookup (e.g., JP, BR, MX):
                <input type="text" id="setup-country-code" placeholder="ISO code" style="margin-top:6px; width:100%; padding:8px; border-radius:8px; background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary);" />
              </label>
            </p>` : ""}
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-secondary" data-action="setup-step" data-step="welcome">Back</button>
            <button class="btn btn-primary" id="setup-country-next" style="margin-left:8px;">Continue</button>
          </div>
        </div>
      `;

    case "emergency":
      const countryContacts = getEmergencyContactsForCountry(state.settings.countryCode);
      const contactRows = Object.entries(countryContacts).map(([key, contact]) => `
        <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);">
          <div style="font-weight:600; margin-bottom:4px;">${esc(contact.name)}</div>
          <div class="mu text-small">${esc(contact.description)}</div>
          <div class="mu text-small">Phone: <b>${esc(contact.phone)}</b></div>
          <div style="margin-top:4px;">
            <label style="display:inline-block; margin-right:12px;">
              <input type="checkbox" data-contact-key="${key}" data-field="call" ${contact.call ? "checked" : ""} /> Call
            </label>
            <label style="display:inline-block;">
              <input type="checkbox" data-contact-key="${key}" data-field="sms" ${contact.sms ? "checked" : ""} /> SMS
            </label>
          </div>
        </div>
      `).join("");

      return `
        <div class="card">
          <h3>Emergency Contacts (${state.settings.countryCode || "US"})</h3>
          <p class="mu">These are the emergency numbers for your selected country. Review and enable the channels you want available.</p>
          ${contactRows}
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-secondary" data-action="setup-step" data-step="country">Back</button>
            <button class="btn btn-primary" id="setup-emergency-next" style="margin-left:8px;">Continue</button>
          </div>
        </div>
      `;

    case "response":
      const contacts = getContacts();
      const enabledContacts = contacts.filter(c => c.enabled);
      const responseTeams = RESPONSE_CATEGORIES.map(cat => {
        const contact = contacts.find(c => c.category === cat);
        const incident = INCIDENT_TYPES.find(t => t.id === cat.replace("_response", "")) || { id: cat, label: cat, icon: "[LIST]" };
        return `
          <div style="padding:8px; border-bottom:1px solid var(--border);">
            <div style="font-weight:600;">${esc(incident.label || cat)}</div>
            <div class="mu text-small">Current: ${esc(contact?.name || "Not configured")}</div>
            <button class="btn btn-secondary btn-sm" data-action="setup-assign-contact" data-category="${cat}" data-incident="${incident.id}" style="margin-top:4px;">Assign Contact</button>
          </div>
        `;
      }).join("");

      return `
        <div class="card">
          <h3>Response Teams</h3>
          <p class="mu">Assign contacts for each incident type. Currently using ${enabledContacts.length} enabled contacts.</p>
          ${responseTeams}
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-secondary" data-action="setup-step" data-step="emergency">Back</button>
            <button class="btn btn-primary" id="setup-response-next" style="margin-left:8px;">Complete Setup</button>
          </div>
        </div>
      `;

    case "done":
      return `
        <div class="card">
          <h3>Setup Complete!</h3>
          <p class="mu">LIFELINE is now configured for your region.</p>
          <ul style="list-style:none; padding-left:0; margin-top:12px;">
            <li style="padding:4px 0;">[OK] Emergency contacts configured</li>
            <li style="padding:4px 0;">[OK] Response teams assigned</li>
            <li style="padding:4px 0;">[OK] Ready for incidents</li>
          </ul>
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-secondary" data-action="setup-step" data-step="response">Back</button>
            <button class="btn btn-primary" id="setup-done" style="margin-left:8px;">Start Using LIFELINE</button>
          </div>
        </div>
      `;

    default:
      return renderStep("welcome", state);
  }
}

export function setupWizardHandlers() {
  const state = getState();

  document.querySelectorAll('[data-action="setup-step"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const step = btn.dataset.step;
      store.setUI({ setupStep: step });
    });
  });

  const countrySelect = document.getElementById("setup-country");
  if (countrySelect) {
    countrySelect.addEventListener("change", (e) => {
      store.setSettings({ countryCode: e.target.value });
    });
  }

  const countryNext = document.getElementById("setup-country-next");
  if (countryNext) {
    countryNext.addEventListener("click", async () => {
      const customCode = document.getElementById("setup-country-code")?.value?.trim().toUpperCase();
      const countryCode = countrySelect?.value === "OTHER" && customCode ? customCode : countrySelect?.value;
      if (countryCode) {
        store.setSettings({ countryCode });
        // Try AI discovery if key available and country not in static DB
        const apiKey = state.settings.groqApiKey;
        if (apiKey && !getEmergencyContactsForCountry(countryCode)[countryCode !== "default" ? "police" : null]) {
          discoverEmergencyContacts(countryCode, apiKey).then(discovered => {
            if (discovered) {
              try { localStorage.setItem(`lifeline.emergency.${countryCode}`, JSON.stringify(discovered)); } catch {}
            }
          });
        }
        store.setUI({ setupStep: "emergency" });
      }
    });
  }

  const emergencyNext = document.getElementById("setup-emergency-next");
  if (emergencyNext) {
    emergencyNext.addEventListener("click", () => {
      // Save emergency contact preferences
      const checkboxes = document.querySelectorAll('[data-contact-key]');
      const prefs = {};
      checkboxes.forEach(cb => {
        const key = cb.dataset.contactKey;
        const field = cb.dataset.field;
        if (!prefs[key]) prefs[key] = {};
        prefs[key][field] = cb.checked;
      });
      try { localStorage.setItem("lifeline.setup.preferences", JSON.stringify(prefs)); } catch {}
      store.setUI({ setupStep: "response" });
    });
  }

  const doneBtn = document.getElementById("setup-done");
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      store.setUI({ setupStep: null });
      history.replaceState(null, "", "#report");
      setTimeout(() => { location.dispatchEvent(new HashChangeEvent("hashchange")); }, 50);
    });
  }
}

export function checkNeedsSetup() {
  const state = getState();
  const prefs = localStorage.getItem("lifeline.setup.preferences");
  return !prefs || !state.settings.countryCode || state.settings.countryCode === "US";
}