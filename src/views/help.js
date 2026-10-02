// LIFELINE AI — Help & support view
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
        <h3>Emergency notice</h3>
        <p style="color:var(--status-immediate);">
          ⚠ If someone is in immediate danger, call your local emergency number immediately.
          LIFELINE is not a replacement for emergency services.
        </p>
      </div>
    </div>
  `;
}
