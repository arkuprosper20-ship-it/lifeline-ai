// LIFELINE AI — Settings screen
import { getState, store } from "../store.js";
import { saveContacts } from "../contacts.js";
import { getEnabledContacts, resetToDefaultContacts } from "../contacts.js";
import { esc } from "../ui.js";
import { fetchProviderConfig } from "../notification-providers.js";

export function initSettingsScreen() {
  const state = getState();
  const contacts = getEnabledContacts();
  const enabledCount = contacts.length;

  return `
    <div class="settings-screen">
      <div class="card">
        <h2>Settings</h2>
        <p class="mu" style="margin-bottom:4px;">Configure LIFELINE for your community.</p>
        <div class="text-small text-muted">Provider: ${state.settings.mode === "automatic" ? "Automatic (Groq → Local)" : state.settings.mode}</div>
      </div>

      <div class="card">
        <h3>AI Provider</h3>
        <label>Analysis mode
          <select id="ai-mode" style="margin-top:6px; width:100%; padding:8px; border-radius:8px; background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary);">
            <option value="automatic" ${state.settings.mode === "automatic" ? "selected" : ""}>Automatic (Groq with local fallback)</option>
            <option value="groq" ${state.settings.mode === "groq" ? "selected" : ""}>Groq Cloud only</option>
            <option value="local" ${state.settings.mode === "local" ? "selected" : ""}>Local rules only</option>
            <option value="rules" ${state.settings.mode === "rules" ? "selected" : ""}>Rules only</option>
          </select>
        </label>

        <label style="margin-top:12px; display:block; font-size:13px;">
          Groq API Key
          <input type="password" id="groq-api-key" placeholder="sk-..." value="${state.settings.groqApiKey ? '••••••••' : ''}" style="margin-top:6px; width:100%; padding:8px; border-radius:8px; background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary);" autocomplete="off" />
        </label>
        <p class="mu text-small" style="margin-top:4px;">Your key is stored locally in your browser only. Leave blank to use local rules engine.</p>

        <label style="margin-top:12px; display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="allow-groq-fallback" ${state.settings.allowGroqFallback ? "checked" : ""} />
          Allow Groq as automatic fallback
        </label>

        <div class="mu text-small" style="margin-top:8px;">
          ${state.isOnline ? '● ONLINE — AI enhancement available' : '○ OFFLINE — using local rules'}
        </div>
      </div>

      <div class="card">
        <h3>Location</h3>
        <label>Default location behavior
          <select id="location-mode" style="margin-top:6px; width:100%; padding:8px; border-radius:8px; background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary);">
            <option value="ask" ${state.settings.locationDefault === "ask" ? "selected" : ""}>Always ask before capturing</option>
            <option value="auto" ${state.settings.locationDefault === "auto" ? "selected" : ""}>Auto-capture (with consent)</option>
            <option value="manual" ${state.settings.locationDefault === "manual" ? "selected" : ""}>Manual only</option>
          </select>
        </label>
      </div>

      <div class="card">
        <h3>Contact directory</h3>
        <p class="mu">${enabledCount} contact${enabledCount !== 1 ? "s" : ""} configured and enabled.</p>
        <button type="button" class="btn btn-secondary btn-sm" data-action="navigate" data-to="contacts">
          Manage contacts →
        </button>
      </div>

      <div class="card">
        <h3>Notifications</h3>
        <p class="mu" style="margin-bottom:8px;">
          ${state.notificationConfig ? (state.notificationConfig.twilioConfigured ? "SMS provider: Twilio (configured)" : "SMS provider: Device SMS fallback (Twilio not configured)") : "Checking notification configuration…"}
        </p>
        <p class="mu text-small" style="margin-bottom:8px;">
          Twilio is <b>optional</b>. Without it, LIFELINE opens your device SMS composer or dialer
          instead of sending through an API. No SMS API credentials are required to use LIFELINE.
        </p>
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <input type="checkbox" id="demo-mode-toggle" ${state.settings.demoMode ? "checked" : ""} />
          Demo Mode (simulated notifications, no real sends)
        </label>
        <button type="button" class="btn btn-secondary btn-sm" id="refresh-notifications" style="margin-top:8px;">Refresh provider status</button>
        <p class="mu text-small" style="margin-top:8px;">
          <a href="#/help" data-action="navigate" data-to="help" style="color:var(--accent);">Configure Twilio →</a>
        </p>
      </div>

      <div class="card">
        <h3>Offline storage</h3>
        <p class="mu">
          ${state.syncQueue?.length || 0} report(s) waiting to sync.
          ${state.isOnline ? '● Ready to sync' : '○ Offline'}
        </p>
        <button type="button" class="btn btn-secondary btn-sm" id="clear-storage">
          Clear local data
        </button>
      </div>

      <div class="card">
        <h3>About</h3>
        <div class="mu text-small">
          LIFELINE AI v1.0.0<br />
          AI-powered community incident intelligence and response routing.<br />
          <a href="#/about" class="text-muted" style="color:var(--accent);">About →</a>
          <a href="#/privacy" class="text-muted" style="color:var(--accent); margin-left:8px;">Privacy →</a>
        </div>
      </div>
    </div>
  `;
}

export function setupSettingsHandlers() {
  document.getElementById("ai-mode")?.addEventListener("change", (e) => {
    store.setSettings({ mode: e.target.value });
  });
  document.getElementById("allow-groq-fallback")?.addEventListener("change", (e) => {
    store.setSettings({ allowGroqFallback: e.target.checked });
  });
  document.getElementById("groq-api-key")?.addEventListener("change", (e) => {
    store.setSettings({ groqApiKey: e.target.value.trim() || null });
  });
  document.getElementById("location-mode")?.addEventListener("change", (e) => {
    store.setSettings({ locationDefault: e.target.value });
  });

  const refreshConfig = async () => {
    const config = await fetchProviderConfig();
    store.setNotificationConfig(config);
    initSettingsScreen();
  };
  document.getElementById("refresh-notifications")?.addEventListener("click", refreshConfig);

  document.getElementById("demo-mode-toggle")?.addEventListener("change", (e) => {
    store.setSettings({ demoMode: e.target.checked });
  });
  document.getElementById("clear-storage")?.addEventListener("click", () => {
    if (confirm("Clear all local data? This cannot be undone.")) {
      localStorage.clear();
      location.reload();
    }
  });
}
