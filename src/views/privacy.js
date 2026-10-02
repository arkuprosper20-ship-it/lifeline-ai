// LIFELINE AI — Privacy policy view
export function initPrivacyScreen() {
  return `
    <div class="privacy-screen">
      <div class="card">
        <h2>Privacy Policy</h2>
        <p class="mu">Last updated: October 2024</p>
      </div>

      <div class="card">
        <h3>Introduction</h3>
        <p>
          LIFELINE AI is designed to help communities turn fragmented incident reports into
          structured, actionable information. This privacy policy explains what data we collect,
          how we process it, and your rights.
        </p>
      </div>

      <div class="card">
        <h3>Data You Provide</h3>
        <p>Your incident reports (text, voice, images) are stored locally on your device by default.
           This data is never uploaded unless you explicitly confirm escalation to a configured contact.</p>
      </div>

      <div class="card">
        <h3>Location Data</h4>
        <p>Location is never accessed without your explicit consent. When you approve sharing your
           location, it is included in the incident report package sent to the configured contact.
           Location data is not sold or shared for advertising.</p>
      </div>

      <div class="card">
        <h3>AI Processing</h4>
        <p>When Groq Cloud AI is configured, report text may be sent to Groq for analysis.
           Image analysis (if enabled) may also be processed by AI providers. Voice audio is
           transcribed by your device's browser when possible. If Groq is unavailable or not
           configured, all analysis runs locally with no data leaving your device.</p>
      </div>

      <div class="card">
        <h3>Local Storage</h4>
        <p>All reports, contacts, and settings are stored in your browser using IndexedDB and localStorage.
           Clearing your browser data will remove all local LIFELINE data.</p>
      </div>

      <div class="card">
        <h3>Contact Sharing</h4>
        <p>When you confirm an escalation, only the incident package (summary, your approved location,
           and map link) is shared with the configured contact. Contact details are stored locally
           and managed by your administrator.</p>
      </div>

      <div class="card">
        <h3>Data Deletion</h4>
        <p>You can delete all local data at any time through Settings → Offline storage → Clear data.
           Contact your administrator for server-side data retention policies.</p>
      </div>

      <div class="card">
        <h3>Questions</h4>
        <p>If you have questions about this privacy policy, contact your community administrator.</p>
      </div>
    </div>
  `;
}
