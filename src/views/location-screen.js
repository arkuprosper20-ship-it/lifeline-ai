// LIFELINE AI — Location screen
import { getState, store } from "../store.js";
import { getCurrentLocation, checkLocationPermission, createLocationLink, getAccuracyLabel, isAccuracyWarning } from "../location.js";
import { esc } from "../ui.js";

export function initLocationScreen() {
  const state = getState();
  return `
    <div class="location-screen">
      <div class="card">
        <h2>Location</h2>
        <p class="mu">LIFELINE can use your device's current location to help responders understand where the incident is.</p>
      </div>

      <div class="card">
        ${state.ui.location ? `
          <div class="flex-center" style="gap:12px; flex-direction:column; padding:24px 0;">
            <div style="font-size:40px;">📍</div>
            <h3>Location captured</h3>
            <div style="text-align:center; font-size:13px; color:var(--text-secondary); line-height:1.8;">
              <div><b>Latitude:</b> ${state.ui.location.latitude.toFixed(6)}</div>
              <div><b>Longitude:</b> ${state.ui.location.longitude.toFixed(6)}</div>
              <div><b>Accuracy:</b> ${state.ui.location.accuracy ? `±${Math.round(state.ui.location.accuracy)}m` : "Unknown"}</div>
              <div><b>Captured:</b> ${new Date(state.ui.location.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
            </div>
            ${isAccuracyWarning(state.ui.location.accuracy) ? `
              <div class="warning-note">⚠ Location accuracy is low. Consider moving to a more open area or selecting a location manually.</div>` : ''}

            ${state.ui.location.latitude !== undefined ? `
              <a href="${createLocationLink(state.ui.location.latitude, state.ui.location.longitude)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="margin-top:12px;">
          OPEN MAP
        </a>` : ''}
          </div>
        ` : `
          <div class="flex-center" style="gap:12px; flex-direction:column; padding:24px 0;">
            <div style="font-size:40px;">📍</div>
            <h3>No location yet</h3>
            <p class="mu">Your location will not be captured or shared without your consent.</p>
            <div class="btn-row full-width" style="margin-top:16px;">
              <button type="button" class="btn btn-primary" id="capture-gps-btn">Use current location</button>
              <button type="button" class="btn btn-secondary" id="manual-location-btn">Enter manually</button>
            </div>
          </div>
        `}
      </div>

      <div class="card">
        <h3>Manual location</h3>
        <p class="mu">Enter coordinates or a place name.</p>
        <div class="formgroup">
          <label for="manual-lat">Latitude</label>
          <input type="number" id="manual-lat" class="form-input" step="0.000001" placeholder="e.g., 5.6037" />
        </div>
        <div class="formgroup">
          <label for="manual-lng">Longitude</label>
          <input type="number" id="manual-lng" class="form-input" step="0.000001" placeholder="e.g., -0.1870" />
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="save-manual-location">Use this location</button>
      </div>

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-primary" data-action="navigate" data-to="brief">${state.ui.location ? 'CONTINUE' : 'CONTINUE WITHOUT LOCATION'} →</button>
        </div>
      </div>
    </div>

    <div class="modal" id="location-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>SHARE CURRENT LOCATION?</h2>
        </div>
        <div class="modal-body">
          <p>LIFELINE can attach your current location to this incident report.</p>
          <p style="margin-top:12px;"><b>What will be shared:</b></p>
          <ul style="list-style:none; padding-left:0; margin:8px 0;">
            <li>✓ Latitude / Longitude</li>
            <li>✓ Location accuracy</li>
            <li>✓ Capture timestamp</li>
            <li>✓ Generated map link</li>
          </ul>
          <p style="margin-top:12px;">Your location will only be included in the approved incident package.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-location">Cancel</button>
          <button class="btn btn-primary" id="allow-location">Allow & capture</button>
        </div>
      </div>
    </div>
  `;
}

export async function setupLocationHandlers() {
  const captureBtn = document.getElementById("capture-gps-btn");
  const manualBtn = document.getElementById("manual-location-btn");
  const saveManualBtn = document.getElementById("save-manual-location");
  const modal = document.getElementById("location-modal");
  const allowBtn = document.getElementById("allow-location");
  const cancelBtn = document.getElementById("cancel-location");

  captureBtn?.addEventListener("click", async () => {
    state.ui.showLocationModal = true;
    const modalEl = document.getElementById("location-modal");
    if (modalEl) modalEl.classList.add("active");
  });

  allowBtn?.addEventListener("click", async () => {
    if (modal) modal.classList.remove("active");
    try {
      const location = await getCurrentLocation({ enableHighAccuracy: true, timeout: 15000 });
      state.ui.location = location;
      store.setUI({ location });
      if (isAccuracyWarning(location.accuracy)) {
        showWarning("Location accuracy is low. Consider selecting a location manually.");
      }
    } catch (error) {
      showError(error.message);
    }
  });

  cancelBtn?.addEventListener("click", () => {
    if (modal) modal.classList.remove("active");
  });

  manualBtn?.addEventListener("click", () => {
    const lat = document.getElementById("manual-lat")?.value;
    const lng = document.getElementById("manual-lng")?.value;
    if (!lat || !lng) {
      showError("Please enter both latitude and longitude.");
      return;
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      showError("Latitude must be between -90 and 90.");
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      showError("Longitude must be between -180 and 180.");
      return;
    }
    state.ui.location = {
      latitude: latNum,
      longitude: lngNum,
      accuracy: null,
      timestamp: Date.now(),
      source: "manual",
      sourceLabel: "MANUALLY ENTERED",
    };
    store.setUI({ location: state.ui.location });
  });

  saveManualBtn?.addEventListener("click", () => {
    const lat = document.getElementById("manual-lat")?.value;
    const lng = document.getElementById("manual-lng")?.value;
    if (!lat || !lng) return;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    state.ui.location = { latitude: latNum, longitude: lngNum, accuracy: null, timestamp: Date.now(), source: "manual", sourceLabel: "MANUALLY ENTERED" };
    store.setUI({ location: state.ui.location });
  });
}

function showError(msg) {
  const app = document.getElementById("app");
  const div = document.createElement("div");
  div.className = "toast toast-error";
  div.textContent = msg;
  app.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function showWarning(msg) {
  const app = document.getElementById("app");
  const div = document.createElement("div");
  div.className = "toast toast-info";
  div.textContent = msg;
  app.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

const { getState } = await import("../store.js");
const state = getState();
