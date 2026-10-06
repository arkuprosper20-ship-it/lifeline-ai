// LIFELINE AI - Map screen (MapLibre vector tiles + Leaflet fallback)
import { getState, store } from "../store.js";
import { esc, showToast, formatTimeAgo, loadLeaflet } from "../ui.js";
import {
  createLocationLink,
  getCurrentLocation,
  resolveLocationState,
  LOCATION_STATES,
  getPermissionState,
} from "../location.js";
import {
  STATUS_MARKERS,
  URGENCY_COLORS,
  getIncidentType,
  statusSpec,
  hasCoords,
  resolveLocation,
  isLocationPlottable,
  applyFilters,
  searchIncidents,
  getDemoIncidents,
  computeBounds,
  incidentDetailFields,
  getCategoryOptions,
  getUrgencyOptions,
  getStatusOptions,
} from "../map-helpers.js";
import {
  TILE_CONFIG,
  TILE_STYLE,
  loadMapLibre,
  createVectorMarker,
  getTileConfig,
  estimateOfflineBundleSize,
  getRecommendedZoomLevels,
} from "../maplibre.js";

const DEFAULT_FILTERS = { category: "all", urgency: "all", status: "all", search: "" };
const LOW_ACCURACY_UI = 100;

function isOnline() {
  return typeof navigator !== "undefined" && navigator.onLine;
}

function renderFilterSelect(id, label, options, selected) {
  return `
    <div class="formgroup" style="margin-bottom:8px;">
      <label for="${id}" style="font-size:12px;color:var(--text-secondary);">${label}</label>
      <select id="${id}" class="form-input" style="padding:8px 10px;font-size:13px;">
        ${options.map((o) => `<option value="${o.value}" ${o.value === selected ? "selected" : ""}>${o.icon ? o.icon + " " : ""}${o.label}</option>`).join("")}
      </select>
    </div>`;
}

function renderIncidentListItems(incidents) {
  if (!incidents.length) {
    return `<p class="mu text-small text-muted">No incidents match the current filters.</p>`;
  }
  return incidents
    .map((inc) => {
      const typeInfo = getIncidentType(inc);
      const spec = statusSpec(inc);
      return `
        <div class="incident-item" data-incident="${esc(inc.id)}" style="cursor:pointer;">
          <span class="incident-type-icon">${typeInfo.icon}</span>
          <div class="incident-text">
            <div class="incident-title">${esc(inc.id)} - ${esc(typeInfo.label)}</div>
            <div class="incident-meta">${formatTimeAgo(inc.timestamp)} . ${esc(spec.label)}</div>
          </div>
          <span class="badge ${spec.badge}" style="font-size:10px;">${esc(spec.label)}</span>
        </div>`;
    })
    .join("");
}

export function initMapScreen() {
  const state = getState();
  const online = isOnline();
  const loc = state.ui.currentLocation || null;
  const realWithCoords = state.incidents.filter((i) => hasCoords(i)).length;
  const showDemo = realWithCoords === 0;

  return `
    <div class="map-screen">
      <div id="map-banner" class="card" style="display:${!online || showDemo ? "flex" : "none"};">
        <div class="flex-center gap-sm" style="gap:8px;">
          <span id="map-banner-icon">${showDemo ? "[TEST]" : "&#9888;"}</span>
          <span id="map-banner-text" style="font-size:13px;">${showDemo ? "DEMO MODE - displaying sample incidents. Your real reports will appear here once locations are captured." : "You are offline. Map tiles cannot load, but incidents stored on this device remain available below."}</span>
        </div>
      </div>

      <div class="map-viewport" style="position:relative;">
        <div id="incident-map" style="height:64vh; min-height:320px; background:var(--bg-primary); border-radius:var(--radius); border:1px solid var(--border);">
          <div id="map-placeholder" class="flex-center" style="height:100%;">
            <div class="text-center">
              <div style="font-size:32px; margin-bottom:8px;">&#128504;</div>
              <p class="mu" style="color:var(--text-secondary);">${online ? "Loading map..." : "MAP OFFLINE"}</p>
            </div>
          </div>
        </div>

        <div id="map-controls" class="card" style="position:absolute;top:12px;right:12px;max-width:330px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;z-index:400;max-height:82vh;overflow:auto;">
          <div class="flex-between" style="margin-bottom:10px;">
            <h3 style="font-size:14px;margin:0;">Filters</h3>
            <span class="badge ${showDemo ? "badge-warning" : online ? "badge-ready" : "badge-immediate"}" style="font-size:10px;">${showDemo ? "DEMO" : online ? "ONLINE" : "OFFLINE"}</span>
          </div>

          <input type="text" id="map-search" class="form-input" placeholder="Search by ID, type, or keyword..." style="padding:8px 10px;font-size:13px;margin-bottom:8px;" value="" />

          ${renderFilterSelect("map-filter-category", "Category", getCategoryOptions(), "all")}
          ${renderFilterSelect("map-filter-urgency", "Urgency", getUrgencyOptions(), "all")}
          ${renderFilterSelect("map-filter-status", "Status", getStatusOptions(), "all")}

          <div class="btn-row" style="margin-top:10px;">
            <button type="button" class="btn btn-secondary btn-sm" id="locate-me-btn" style="flex:1;font-size:13px;">&#128205; Locate me</button>
            <button type="button" class="btn btn-secondary btn-sm" id="reset-view-btn" style="flex:1;font-size:13px;">Reset view</button>
          </div>

          <div id="locate-status" class="text-small" style="margin-top:10px;color:var(--text-secondary);line-height:1.5;min-height:64px;">
            <span style="color:var(--text-tertiary);">Click Locate me to capture your location.</span>
          </div>

          ${loc ? `
          <div class="btn-row" style="margin-top:8px;" id="current-location-link-row">
            <a href="${createLocationLink(loc.latitude, loc.longitude)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;">OPEN IN GOOGLE MAPS</a>
            <button type="button" class="btn btn-secondary btn-sm" id="copy-link-btn" style="flex:1;font-size:12px;">COPY LOCATION LINK</button>
          </div>` : `<div class="btn-row" id="current-location-link-row" style="margin-top:8px;display:none;"></div>`}
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="flex-between">
          <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Incidents</h3>
          <span class="text-small text-muted" id="incident-count"></span>
        </div>
        <div id="incident-list" style="max-height:260px;overflow-y:auto;margin-top:8px;">
          ${renderIncidentListItems(state.incidents.slice(0, 30))}
        </div>
      </div>

      <div class="modal" id="incident-detail-panel" style="max-width:540px;">
        <div class="modal-header"><h2 style="font-size:16px;">INCIDENT DETAIL</h2></div>
        <div class="modal-body" id="incident-detail-body" style="padding:20px;font-size:13px;line-height:1.7;"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="close-detail">Close</button>
        </div>
      </div>
    </div>
  `;
}

function popupContent(inc, isDashboard) {
  const typeInfo = getIncidentType(inc);
  const spec = statusSpec(inc);
  const loc = resolveLocation(inc, { coordinator: isDashboard });
  const link = loc.plottable ? createLocationLink(loc.lat, loc.lng) : null;
  const fields = isDashboard ? incidentDetailFields(inc) : null;
  const fieldsHtml = fields
    ? fields
        .map((f) => {
let val = esc(f.value) || "-";
if (f.type === "link" && f.link) val = `<a href="${f.link}" target="_blank" rel="noopener" style="color:var(--accent);">OPEN IN GOOGLE MAPS -></a>`;
          return `<div style="margin:2px 0;"><b style="color:var(--text-tertiary);font-size:11px;">${f.label}:</b> <span style="font-size:12px;">${f.icon ? f.icon + " " : ""}${val}</span></div>`;
        })
        .join("")
    : `<div style="margin:4px 0;">${esc(inc.summary || (inc.observations || []).join(", ") || "-")}</div>`;
  return `
    <div style="font-size:13px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-size:15px;">${spec.icon}</span>
        <div><b>${esc(inc.id)}</b> <span class="badge ${spec.badge}" style="font-size:10px;">${esc(spec.label)}</span></div>
      </div>
      <div style="color:var(--text-tertiary);font-size:12px;margin:4px 0;">${esc(typeInfo.label)} · ${esc(inc.urgency || "")}</div>
      ${fieldsHtml}
      ${link ? `<a href="${link}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);">OPEN MAP -></a>` : "<span style='font-size:11px;color:var(--text-tertiary);'>No coordinates</span>"}
      ${!isDashboard ? `<div style="margin-top:6px;"><button type="button" class="btn btn-primary" style="width:100%;font-size:12px;padding:6px;" data-view-incident="${esc(inc.id)}">VIEW INCIDENT</button></div>` : ""}
    </div>`;
}

export function setupMap(containerId = "incident-map", options = {}) {
  const isDashboard = options.isDashboard === true;
  const mapContainer = document.getElementById(containerId);
  if (!mapContainer) return null;

  let map;
  let markers = new Map();
  let userMarker = null;
  let filters = { ...DEFAULT_FILTERS };

  function buildIncidentSource() {
    const s = getState();
    const withCoords = s.incidents.filter((i) => hasCoords(i));
    if (withCoords.length === 0) return getDemoIncidents();
    return s.incidents;
  }

  function currentIncidents() {
    return applyFilters(searchIncidents(buildIncidentSource(), filters.search), filters);
  }

  function hidePlaceholder() {
    const ph = document.getElementById("map-placeholder");
    if (ph) ph.style.display = "none";
  }

  function showBanner(state, message) {
    const banner = document.getElementById("map-banner");
    const icon = document.getElementById("map-banner-icon");
    const text = document.getElementById("map-banner-text");
    if (!banner) return;
    if (state === null) {
      banner.style.display = "none";
    } else {
      banner.style.display = "flex";
      if (icon) icon.textContent = (state === LOCATION_STATES.OFFLINE ? "&#9888;" : state === LOCATION_STATES.REQUESTING ? "&#128340;" : "&#128504;");
      if (text) text.textContent = message || state || "";
    }
  }

  function initLeaflet() {
    if (typeof L === "undefined") {
      loadLeaflet().then(() => initLeaflet());
      return;
    }
    if (map) return;
    hidePlaceholder();
    showBanner(isOnline() ? null : LOCATION_STATES.OFFLINE, isOnline() ? null : "Map is offline. Tiles cannot load, but local incidents remain available below.");

    map = L.map(containerId).setView([20, 0], 2);
    L.tileLayer(TILE_CONFIG.rasterUrl, {
      attribution: TILE_CONFIG.attribution,
      maxZoom: TILE_CONFIG.maxZoom,
      minZoom: TILE_CONFIG.minZoom,
      detectRetina: true,
    }).addTo(map);

    renderMarkers();
    fitMap();
  }

  async function initMapLibre() {
    const maplibregl = await loadMapLibre();
    if (!maplibregl) {
      initLeaflet();
      return;
    }
    if (map) return;
    hidePlaceholder();
    showBanner(isOnline() ? null : LOCATION_STATES.OFFLINE, isOnline() ? null : "Map is offline. Tiles cannot load, but local incidents remain available below.");

    map = new maplibregl.Map({
      container: containerId,
      style: TILE_STYLE,
      center: [0, 20],
      zoom: 2,
      maxZoom: 16,
      minZoom: 1,
    });

    map.on("load", () => {
      renderMarkers();
      fitMap();
    });
  }

  function renderMarkers() {
    if (!map) return;
    markers.forEach((m) => map.removeLayer(m.marker));
    markers.clear();
    const visible = currentIncidents();
    visible.forEach((inc) => {
      const loc = resolveLocation(inc, { coordinator: isDashboard });
      if (!loc.plottable) return;
      const spec = statusSpec(inc);
      const icon = L.divIcon({
        className: "lifeline-marker",
        html: `<div title="${esc(spec.label)} (${esc(inc.urgency || "")})" aria-label="${esc(spec.label)} ${esc(inc.urgency || "")}" style="width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:${spec.color};box-shadow:0 0 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:13px;">${spec.icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const m = L.marker([loc.lat, loc.lng], { icon, title: esc(inc.id) })
        .addTo(map)
        .bindPopup(popupContent(inc, isDashboard), { maxWidth: 280 });
      if (!isDashboard) {
        m.on("click", () => openDetail(inc));
      }
      markers.set(inc.id, { marker: m, incident: inc });
    });
  }

  function fitMap() {
    if (!map) return;
    const items = Array.from(markers.values());
    if (!items.length) return;
    if (items.length === 1) {
      const loc = resolveLocation(items[0].incident, { coordinator: isDashboard });
      map.setView([loc.lat, loc.lng], 13);
    } else {
      const bounds = computeBounds(currentIncidents());
      if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  function renderIncidentList() {
    const list = document.getElementById("incident-list");
    const count = document.getElementById("incident-count");
    if (!list) return;
    const visible = currentIncidents();
    list.innerHTML = renderIncidentListItems(visible);
    if (count) count.textContent = `${visible.length} shown`;
  }

  function openDetail(inc) {
    const panel = document.getElementById("incident-detail-panel");
    const body = document.getElementById("incident-detail-body");
    if (!panel || !body) {
      showToast("Incident detail unavailable on this view.");
      return;
    }
    const fields = incidentDetailFields(inc);
    body.innerHTML = fields
      .map((f) => {
        let val = esc(f.value) || "-";
        if (f.type === "link" && f.link) val = `<a href="${f.link}" target="_blank" rel="noopener" style="color:var(--accent);">OPEN IN GOOGLE MAPS -></a>`;
        if (f.type === "list") {
          const arr = Array.isArray(f.value) ? f.value : [];
          val = arr.length ? arr.map((e) => `<div class="text-small" style="margin-bottom:4px;">${esc(typeof e === "string" ? e : JSON.stringify(e))}</div>`).join("") : "-";
        }
        return `
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;">${f.label}</div>
            <div style="font-size:13px;margin-top:2px;">${f.icon ? f.icon + " " : ""}${val}</div>
          </div>`;
      })
      .join("");
    panel.classList.add("active");
    if (map) map.closePopup();
  }

  function bindControls() {
    const search = document.getElementById("map-search");
    const cat = document.getElementById("map-filter-category");
    const urg = document.getElementById("map-filter-urgency");
    const st = document.getElementById("map-filter-status");
    const locateBtn = document.getElementById("locate-me-btn");
    const resetBtn = document.getElementById("reset-view-btn");
    const copyBtn = document.getElementById("copy-link-btn");
    const closeBtn = document.getElementById("close-detail");

    const apply = () => { renderMarkers(); fitMap(); renderIncidentList(); };
    search?.addEventListener("input", () => { filters.search = search.value; apply(); });
    cat?.addEventListener("change", () => { filters.category = cat.value; apply(); });
    urg?.addEventListener("change", () => { filters.urgency = urg.value; apply(); });
    st?.addEventListener("change", () => { filters.status = st.value; apply(); });
    resetBtn?.addEventListener("click", () => { filters = { ...DEFAULT_FILTERS }; if (search) search.value = ""; apply(); });
    closeBtn?.addEventListener("click", () => {
      const panel = document.getElementById("incident-detail-panel");
      if (panel) panel.classList.remove("active");
    });
    locateBtn?.addEventListener("click", locateMe);
    copyBtn?.addEventListener("click", copyCurrentLocationLink);

    const controlsRoot = mapContainer.ownerDocument;
    controlsRoot.getElementById("incident-map")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view-incident]");
      if (btn) openDetailById(btn.getAttribute("data-view-incident"));
    });

    window.addEventListener("offline", () => showBanner(LOCATION_STATES.OFFLINE, "You are offline. Map tiles cannot load, but local incidents remain available below."));
    window.addEventListener("online", () => showBanner(null, null));
  }

  function openDetailById(id) {
    const inc = currentIncidents().find((i) => i.id === id) || buildIncidentSource().find((i) => i.id === id);
    if (inc) openDetail(inc);
  }

  async function locateMe() {
    if (!isOnline()) {
      showBanner(LOCATION_STATES.OFFLINE, "Cannot locate while offline.");
      return;
    }
    const status = document.getElementById("locate-status");
    if (!status) return;
    showBanner(LOCATION_STATES.REQUESTING, "Requesting location permission...");
    const geoSupported = typeof navigator !== "undefined" && !!navigator.geolocation;
    const perm = await getPermissionState();
    try {
      const loc = await getCurrentLocation({ enableHighAccuracy: true, timeout: 15000 });
      const resolved = resolveLocationState({ online: true, geoSupported, permission: perm.state, accuracy: loc.accuracy });
      store.setUI({ currentLocation: loc });
      renderCurrentLocation(loc, resolved);
      addCurrentLocationMarker(loc);
      showBanner(null, null);
    } catch (error) {
      const resolved = resolveLocationState({ online: true, geoSupported, permission: perm.state, error });
      renderCurrentLocation(null, resolved);
      showToast(resolved.message);
    }
  }

  function renderCurrentLocation(loc, resolved) {
    const status = document.getElementById("locate-status");
    if (!status) return;
    if (!loc) {
      status.innerHTML = `<b>${resolved.state}</b><br><span style="color:var(--text-tertiary);font-size:12px;">${resolved.message}</span>`;
      return;
    }
    const low = Number(loc.accuracy) > LOW_ACCURACY_UI;
    const badge = low ? "badge-warning" : "badge-ready";
    const badgeLabel = low ? LOCATION_STATES.LOW_ACCURACY : LOCATION_STATES.AVAILABLE;
    status.innerHTML = `
      <div class="flex-between" style="margin-bottom:6px;">
        <b>${badgeLabel}</b>
        <span class="badge ${badge}" style="font-size:10px;">${low ? "LOW ACCURACY" : "OK"}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
        <div><b>Latitude:</b> ${Number(loc.latitude).toFixed(6)}</div>
        <div><b>Longitude:</b> ${Number(loc.longitude).toFixed(6)}</div>
        <div><b>Accuracy:</b> ${loc.accuracy ? `+/-${Math.round(loc.accuracy)} m` : "Unknown"}</div>
        <div><b>Timestamp:</b> ${new Date(loc.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
      </div>`;
    const row = document.getElementById("current-location-link-row");
    if (row) {
      const link = createLocationLink(loc.latitude, loc.longitude);
      row.innerHTML = `
        <a href="${link}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;">OPEN IN GOOGLE MAPS</a>
        <button type="button" class="btn btn-secondary btn-sm" id="copy-link-btn" style="flex:1;font-size:12px;">COPY LOCATION LINK</button>`;
      row.style.display = "flex";
      row.querySelector("#copy-link-btn")?.addEventListener("click", copyCurrentLocationLink);
    }
  }

  function addCurrentLocationMarker(loc) {
    if (!map) return;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([loc.latitude, loc.longitude], {
      color: "#3b82f6", fillColor: "#2563eb", fillOpacity: 0.8, radius: 9, weight: 3,
    }).addTo(map);
    userMarker.bindPopup("Your location", { autoClose: true });
    map.setView([loc.latitude, loc.longitude], 15);
  }

  function copyCurrentLocationLink() {
    const loc = getState().ui.currentLocation;
    if (!loc || loc.latitude === undefined || loc.longitude === undefined) {
      showToast("No location to copy.");
      return;
    }
    const link = createLocationLink(loc.latitude, loc.longitude);
    navigator.clipboard.writeText(link).then(() => showToast("Location link copied.")).catch(() => showToast("Copy failed."));
  }

  function init() {
    const cached = getState().ui.currentLocation;
    if (cached) renderCurrentLocation(cached, resolveLocationState({ online: isOnline(), accuracy: cached.accuracy }));
    renderIncidentList();
    bindControls();

    // Try MapLibre vector tiles first, fall back to Leaflet raster tiles
    if (typeof maplibregl !== "undefined") {
      initMapLibre();
    } else if (typeof L !== "undefined") {
      initLeaflet();
    } else {
      // Load both and prefer MapLibre
      Promise.all([loadLeaflet(), loadMapLibre()]).then(([leaflet, maplibre]) => {
        if (maplibre) {
          initMapLibre();
        } else if (leaflet) {
          initLeaflet();
        }
      });
    }
  }

  function bindOfflineBundleControls() {
    const bundleBtn = document.getElementById("offline-bundle-btn");
    if (bundleBtn) {
      bundleBtn.addEventListener("click", async () => {
        const bbox = computeBounds(currentIncidents());
        if (!bbox) {
          showToast("No incidents with coordinates to download offline tiles for.");
          return;
        }
        const zooms = getRecommendedZoomLevels(bbox);
        const sizeKB = estimateOfflineBundleSize(bbox, zooms);
        if (sizeKB > 10000) {
          showToast(`Offline bundle is large (~${Math.round(sizeKB / 1000)}MB). Consider a smaller area.`);
        } else {
          showToast(`Preparing offline bundle (~${Math.round(sizeKB)}KB)...`);
        }
      });
    }
  }

  init();
  window.LIFELINE_MAP = { 
    refresh: () => { renderMarkers(); fitMap(); renderIncidentList(); },
    getTileConfig,
    getOfflineBundleSize: (bbox) => estimateOfflineBundleSize(bbox, getRecommendedZoomLevels(bbox)),
  };
  return map;
}
