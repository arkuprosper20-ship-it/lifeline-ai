// LIFELINE AI — Location and geolocation utilities
import { LOCATION_SOURCES, classNames } from "./types.js";

let permissionState = "unknowing";
let locationCache = null;

export function checkLocationPermission() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ granted: false, available: false, reason: "Geolocation not supported in this browser." });
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        resolve({
          granted: result.state === "granted",
          available: true,
          reason: result.state === "granted" ? "permission granted" : result.state === "denied" ? "permission denied" : "permission prompt",
          state: result.state,
        });
      }).catch(() => {
        resolve({ granted: false, available: true, reason: "Permission check failed." });
      });
    } else {
      resolve({ granted: false, available: true, reason: "Permission API not available." });
    }
  });
}

export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported in this browser."));
      return;
    }
    const timeout = options.timeout || 15000;
    const enableHighAccuracy = options.enableHighAccuracy !== false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: LOCATION_SOURCES.gps.type,
          sourceLabel: LOCATION_SOURCES.gps.label,
        };
        locationCache = coords;
        resolve(coords);
      },
      (error) => {
        let reason = error.message;
        if (error.code === 1) reason = "Location permission denied.";
        else if (error.code === 2) reason = "Location unavailable.";
        else if (error.code === 3) reason = "Location request timed out.";
        reject(new Error(reason));
      },
      { timeout, enableHighAccuracy }
    );
  });
}

export function getLocationCache() { return locationCache; }

export function createLocationLink(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function createAppleMapsLink(latitude, longitude) {
  return `https://maps.apple.com/?q=${latitude},${longitude}`;
}

export function validateLocationInput(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) return false;
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) return false;
  return true;
}

export function getAccuracyLabel(accuracy) {
  if (accuracy === null || accuracy === undefined) return "Unknown";
  if (accuracy < 10) return "Excellent (within 10m)";
  if (accuracy < 50) return "Good (within 50m)";
  if (accuracy < 100) return "Moderate (within 100m)";
  if (accuracy < 500) return "Fair (within 500m)";
  return "Low accuracy (over 500m)";
}

export function isAccuracyWarning(accuracy) {
  return accuracy > 100;
}

export function locationDisplayString(loc) {
  if (!loc) return "Not captured";
  if (loc.source === "text") return loc.description || "Location described in text";
  if (loc.source === "manual") return `${loc.latitude}, ${loc.longitude}`;
  if (loc.source === "gps") return `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
  return "Unknown location";
}

export const LOCATION_STATES = {
  REQUESTING: "REQUESTING LOCATION",
  AVAILABLE: "LOCATION AVAILABLE",
  DENIED: "LOCATION DENIED",
  UNAVAILABLE: "LOCATION UNAVAILABLE",
  LOW_ACCURACY: "LOW ACCURACY",
  OFFLINE: "MAP OFFLINE",
  NO_LOCATION: "NO LOCATION PROVIDED",
};

const LOW_ACCURACY_THRESHOLD_M = 100;

export function resolveLocationState({ online = true, geoSupported = true, permission = "prompt", error = null, accuracy = null } = {}) {
  if (!online) {
    return {
      state: LOCATION_STATES.OFFLINE,
      message: "You are offline. Live map tiles cannot load, but incidents saved on this device remain available below.",
    };
  }
  if (!geoSupported) {
    return { state: LOCATION_STATES.UNAVAILABLE, message: "Geolocation is not supported by this browser." };
  }
  if (permission === "denied") {
    return { state: LOCATION_STATES.DENIED, message: "Location permission denied. Enable it in your browser settings to use Locate Me." };
  }
  if (error) {
    const code = error.code;
    if (code === 2 || code === 3 || code === 1) {
      if (code === 1) {
        return { state: LOCATION_STATES.DENIED, message: "Location permission denied." };
      }
      return { state: LOCATION_STATES.UNAVAILABLE, message: (error.message && error.message !== "User denied Geolocation position retrieval." ? error.message : "Location unavailable.") };
    }
    return { state: LOCATION_STATES.UNAVAILABLE, message: error.message || "Location unavailable." };
  }
  if (accuracy !== null && accuracy !== undefined && Number(accuracy) > LOW_ACCURACY_THRESHOLD_M) {
    return { state: LOCATION_STATES.LOW_ACCURACY, message: `Location accuracy is low (\u00b1${Math.round(accuracy)} m). Results may be approximate.` };
  }
  if (accuracy !== null && accuracy !== undefined) {
    return { state: LOCATION_STATES.AVAILABLE, message: "Location captured." };
  }
  return { state: LOCATION_STATES.NO_LOCATION, message: "No location provided." };
}

export async function getPermissionState() {
  if (!navigator.geolocation) {
    return { state: "unavailable", granted: false, reason: "Geolocation not supported." };
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    return { state: "unknown", granted: false, reason: "Permission API unavailable." };
  }
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return { state: result.state, granted: result.state === "granted", reason: result.state };
  } catch {
    return { state: "unknown", granted: false, reason: "Permission check failed." };
  }
}

export function formatGeolocationError(error) {
  if (!error) return null;
  if (error.code === 1) return { state: LOCATION_STATES.DENIED, message: "Location permission denied." };
  if (error.code === 2) return { state: LOCATION_STATES.UNAVAILABLE, message: "Location unavailable." };
  if (error.code === 3) return { state: LOCATION_STATES.UNAVAILABLE, message: "Location request timed out." };
  return { state: LOCATION_STATES.UNAVAILABLE, message: error.message || "Location unavailable." };
}
