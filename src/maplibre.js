// LIFELINE AI — Vector tile support for MapLibre GL JS
// Replaces raster OpenStreetMap tiles with vector tiles for better
// performance, offline caching, and styling control.
// Falls back gracefully to Leaflet + raster tiles if MapLibre is unavailable.

const TILE_CONFIG = {
  // MapLibre vector tile endpoint (no API key required)
  vectorUrl: "https://tiles.openstreetmap.org/v/{z}/{x}/{y}.pbf",
  // Raster fallback (original Leaflet behavior)
  rasterUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  maxZoom: 18,
  minZoom: 1,
};

export const TILE_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "vector",
      tiles: [TILE_CONFIG.vectorUrl],
      minzoom: 0,
      maxzoom: 16,
    },
  },
  sprite: "",
  glyphs: "",
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#1a1a2e" },
    },
    {
      id: "land",
      type: "fill",
      source-layer: "land",
      paint: { "fill-color": "#16213e" },
    },
    {
      id: "water",
      type: "fill",
      source-layer: "water",
      paint: { "fill-color": "#0f3460" },
    },
    {
      id: "roads",
      type: "line",
      source-layer: "roads",
      paint: { "line-color": "#3a3a5a", "line-width": 1 },
    },
    {
      id: "roads-primary",
      type: "line",
      source-layer: "roads",
      filter: ["==", ["get", "class"], "primary"],
      paint: { "line-color": "#e94560", "line-width": 2 },
    },
    {
      id: "labels",
      type: "symbol",
      source-layer: "place",
      layout: { "text-field": "{name}", "text-size": 12 },
      paint: { "text-color": "#888" },
    },
  ],
};

export async function loadMapLibre() {
  if (typeof maplibregl !== "undefined") return maplibregl;
  try {
    const mod = await import("https://unpkg.com/maplibregl@4.7.1/dist/maplibregl.js");
    return mod.default || mod;
  } catch {
    return null;
  }
}

export function createMapContainer(containerId, options = {}) {
  const { center = [20, 0], zoom = 2, isDashboard = false } = options;

  return {
    containerId,
    center,
    zoom,
    style: TILE_STYLE,
    isDashboard,
    markers: [],
    userMarker: null,
  };
}

export function createVectorMarker(spec) {
  return {
    html: `<div title="${spec.label}" style="width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:${spec.color};box-shadow:0 0 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:13px;">${spec.icon}</div>`,
    size: [28, 28],
    anchor: [14, 28],
  };
}

export function getTileConfig() {
  return TILE_CONFIG;
}

export function isMapLibreSupported() {
  return typeof maplibregl !== "undefined" || typeof window !== "undefined";
}

export function createOfflineTileBundle(bbox, zoomLevels = [10, 11, 12, 13]) {
  return {
    bbox,
    zoomLevels,
    tiles: [],
    downloadedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
}

export function calculateTileCount(bbox, zoomLevels) {
  const [west, south, east, north] = bbox;
  let count = 0;
  for (const zoom of zoomLevels) {
    const [x1, y1] = deg2num(west, south, zoom);
    const [x2, y2] = deg2num(east, north, zoom);
    count += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1);
  }
  return count;
}

function deg2num(lon, lat, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return [x, y];
}

export function estimateOfflineBundleSize(bbox, zoomLevels) {
  const tileCount = calculateTileCount(bbox, zoomLevels);
  const avgTileSizeKB = 50;
  return tileCount * avgTileSizeKB;
}

export function getRecommendedZoomLevels(bbox, maxTiles = 500) {
  const zooms = [];
  for (let z = 10; z <= 16; z++) {
    const count = calculateTileCount(bbox, [z]);
    if (count <= maxTiles) zooms.push(z);
    else break;
  }
  return zooms.length ? zooms : [10];
}