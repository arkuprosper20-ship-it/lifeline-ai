// LIFELINE AI - Help screen
export function initHelpScreen() {
  return `
    <div class="help-screen">
      <div class="card">
        <h2>Help &amp; Support</h2>
        <p class="mu">Need help using LIFELINE AI?</p>
      </div>

      <div class="card">
        <h3>How to report an incident</h3>
        <ol style="padding-left:20px; line-height:1.8;">
          <li>Open LIFELINE AI from your home screen or browser.</li>
          <li>Type, speak, or upload an image describing the situation.</li>
          <li>Capture your current location (requires permission).</li>
          <li>Review the AI analysis and incident brief.</li>
          <li>Confirm escalation to the recommended response contact.</li>
          <li>Track delivery status and verify on the coordination map.</li>
        </ol>
      </div>

      <div class="card">
        <h3>Voice reporting</h3>
        <p>Press the microphone button and speak clearly. Your browser will transcribe speech to text.
           If voice isn't available, you can type your report manually.</p>
      </div>

      <div class="card">
        <h3>Image reporting</h3>
        <p>Upload or take a photo of the incident. If Groq Vision is configured, the system will
           analyze visible elements in the image. Otherwise, you can describe what you see in text.</p>
      </div>

      <div class="card">
        <h3>Location</h3>
        <p>LIFELINE asks for your location permission before capturing GPS coordinates.
           You can choose your current location, enter coordinates manually, or describe the location.</p>
      </div>

      <div class="card">
        <h3>Offline usage</h3>
        <p>LIFELINE works offline. You can create and save reports without internet.
           When you reconnect, pending reports will sync automatically.</p>
      </div>

      <div class="card">
        <h3>Notifications &amp; SMS</h3>
        <p>
          LIFELINE supports multiple notification providers and chooses the best
          available one automatically (Twilio &rarr; Device SMS &rarr; Phone link).
        </p>
        <p>Twilio is <b>optional</b>. You can use and demonstrate LIFELINE without
          any SMS API account. When Twilio is not configured, LIFELINE opens your
          device SMS composer or phone dialer with a pre-filled message. A real
          emergency contact is still required to receive reports.</p>
        <p>To enable real, server-side SMS delivery, set these environment variables
          (only on the server - credentials are never sent to the browser):</p>
        <pre style="font-size:12px; padding:8px; border:1px solid var(--border); border-radius:6px; margin:8px 0;">SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=your_twilio_sid
SMS_AUTH_TOKEN=your_twilio_token
SMS_FROM=+1234567890</pre>
        <p class="mu text-small">Demo Mode (toggle in Settings) simulates a notification
          with a SIMULATED status and never sends a real message.</p>
      </div>

      <div class="card">
        <h3>Emergency notice</h3>
        <p style="color:var(--status-immediate);">
          [WARN] If someone is in immediate danger, call your local emergency number immediately.
          LIFELINE is not a replacement for emergency services.
        </p>
      </div>
    </div>
  `;
}
