// LIFELINE AI - About screen
import { getState } from "../store.js";

export function initAboutScreen() {
  const state = getState();
  return `
    <div class="about-screen">
      <div class="card text-center" style="padding:32px 20px;">
        <div style="font-size:56px; margin-bottom:12px;"></div>
        <h1 style="font-size:28px;">LIFELINE AI</h1>
        <p class="mu" style="margin-bottom:4px; font-size:14px;">Turn chaos into coordinated action.</p>
        <p class="text-small text-muted">v1.0.0 - Community Incident Intelligence</p>
      </div>

      <div class="card">
        <h3>What is LIFELINE AI?</h3>
        <p>
          LIFELINE AI is an AI-powered, multimodal, offline-first community incident
          intelligence platform. It transforms text, voice, and image reports into
          structured incident briefs, identifies potential response needs, clusters
          related community reports, and - after explicit user confirmation - routes
          information and the user's approved current location to the appropriate
          configured response contact through phone, SMS, email, or organizational integrations.
        </p>
      </div>

      <div class="card">
        <h3>Key Features</h3>
        <ul style="list-style:none; padding-left:0; line-height:1.8;">
          <li>[OK] Multimodal reporting (text, voice, image)</li>
          <li>[OK] Current location capture with consent</li>
          <li>[OK] AI-powered incident classification</li>
          <li>[OK] Urgency assessment with safety rules</li>
          <li>[OK] Smart escalation routing</li>
          <li>[OK] Contact directory configuration</li>
          <li>[OK] Community incident map</li>
          <li>[OK] Incident clustering</li>
          <li>[OK] Offline-first architecture</li>
          <li>[OK] Progressive Web App</li>
        </ul>
      </div>

      <div class="card">
        <h3>Safety Design</h3>
        <p>
          LIFELINE does NOT replace emergency services. For immediate life-threatening
          danger, always contact your local emergency number (911, 999, 112, etc.).
          All escalations require explicit user confirmation. The system clearly
          labels uncertain or unverified information.
        </p>
      </div>

      <div class="card">
        <h3>Technology</h3>
        <div class="text-small text-muted" style="line-height:1.8;">
          <div>Frontend: Vanilla JavaScript (ES modules), HTML, CSS</div>
          <div>Map: Leaflet + OpenStreetMap</div>
          <div>Location: Browser Geolocation API</div>
          <div>Voice: Web Speech API, MediaRecorder API</div>
          <div>Storage: IndexedDB + localStorage (offline-first)</div>
          <div>AI: Groq Cloud (with local rules fallback)</div>
          <div>PWA: Manifest, Service Worker</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <a href="#/privacy" class="btn btn-secondary">Privacy Policy</a>
          <a href="#/help" class="btn btn-secondary">Help & Support</a>
          <button class="btn btn-secondary" id="check-for-updates">Check for updates</button>
        </div>
      </div>

      <div class="card text-center text-muted text-small">
        LIFELINE AI is open-source software for community incident intelligence.
        <br />Not a medical device or emergency service.
      </div>
    </div>
  `;
}
