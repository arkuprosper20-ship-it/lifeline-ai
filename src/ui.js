// LIFELINE AI — UI helper utilities
export function renderComponent(container, renderFn) {
  if (typeof renderFn === "function") {
    const result = renderFn();
    container.innerHTML = typeof result === "string" ? result : "";
  }
}

export function showToast(message, type = "info", duration = 4000) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 20px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 12px; padding: 12px 18px; font-size: 13px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 300;
    animation: slideIn 0.2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function formatTimeAgo(ts) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createMapLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function createLeafletMap(containerId, lat = 0, lng = 0, zoom = 13, markers = []) {
  if (typeof L === "undefined") {
    loadLeaflet().then(() => initMap(containerId, lat, lng, zoom, markers));
    return null;
  }
  return initMap(containerId, lat, lng, zoom, markers);
}

function initMap(containerId, lat, lng, zoom, markers) {
  const map = L.map(containerId).setView([lat, lng], zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  markers.forEach(m => {
    L.marker([m.lat, m.lng])
      .addTo(map)
      .bindPopup(m.popup || "")
      .openPopup();
  });
  return map;
}

export function loadLeaflet() {
  return new Promise((resolve) => {
    if (typeof L !== "undefined") { resolve(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/leaflet/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "/leaflet/leaflet.js";
    script.onload = () => {
      // Fix Leaflet's default icon paths to use our local images
      if (typeof L !== "undefined" && L.Icon && L.Icon.Default) {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: '/leaflet/images/marker-icon.png',
          iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
          shadowUrl: '/leaflet/images/marker-shadow.png',
        });
      }
      resolve();
    };
    document.head.appendChild(script);
  });
}
