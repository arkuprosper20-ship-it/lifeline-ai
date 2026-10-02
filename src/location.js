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
