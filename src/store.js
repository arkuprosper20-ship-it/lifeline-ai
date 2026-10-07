// LIFELINE AI - State Manager
import { STORAGE_KEYS, createIncidentId, INCIDENT_TYPES } from "./types.js";
import { getDefaultContacts as DEFAULT_CONTACTS } from "./contacts.js";
import { initDB, dbGet, dbPut, dbGetAll, dbDelete, dbClear, dbCount, migrateFromLocalStorage, STORES } from "./indexeddb.js";

const state = {
  incidents: [],
  contacts: DEFAULT_CONTACTS,
  settings: { mode: "automatic", allowGroqFallback: true, locationDefault: "ask", notifications: true, autoSync: true, demoMode: false, countryCode: "US" },
  notificationConfig: null,
  ui: { currentView: "report", selectedIncident: null, reportText: "", imagePreview: null, imageFile: null, voiceText: null, locationText: null, location: null, currentLocation: null, isAnalyzing: false, analysisResult: null, showLocationModal: false, selectedContact: null, needsRender: false, params: {} },
  syncQueue: [],
  isOnline: navigator.onLine,
  currentUser: null,
  demoMode: false,
  dbAvailable: false,
};

let listeners = [];
let locationCallback = null;
let dbReady = false;

export function getState() { return state; }

export function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; }

function notify() { listeners.forEach(fn => fn()); }

async function loadFromIndexedDB() {
  if (!dbReady) return false;
  try {
    const [incidents, contacts, settings, syncQueue] = await Promise.all([
      dbGetAll(STORES.INCIDENTS),
      dbGetAll(STORES.CONTACTS),
      dbGet(STORES.SETTINGS, "settings"),
      dbGetAll(STORES.SYNC_QUEUE),
    ]);
    if (incidents.length) state.incidents = incidents;
    if (contacts.length) state.contacts = contacts;
    if (settings) state.settings = { ...state.settings, ...settings.value };
    if (syncQueue.length) state.syncQueue = syncQueue;
    state.dbAvailable = true;
    return true;
  } catch (e) {
    console.warn("[LIFELINE] IndexedDB load failed, using localStorage:", e);
    state.dbAvailable = false;
    return false;
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.incidents);
    if (saved) state.incidents = JSON.parse(saved);
    const savedContacts = localStorage.getItem(STORAGE_KEYS.contacts);
    if (savedContacts) state.contacts = JSON.parse(savedContacts);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
    if (savedSettings) state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    const savedUI = localStorage.getItem(STORAGE_KEYS.ui);
    if (savedUI) state.ui = { ...state.ui, ...JSON.parse(savedUI) };
    const savedQueue = localStorage.getItem(STORAGE_KEYS.syncQueue);
    if (savedQueue) state.syncQueue = JSON.parse(savedQueue);
  } catch { /* use defaults */ }
}

function saveState() {
  saveStateToLocalStorage();
  if (state.dbAvailable) {
    saveToIndexedDB();
  }
}

function saveStateToLocalStorage() {
  try { localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(state.incidents)); } catch { }
  try { localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(state.contacts)); } catch { }
  try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings)); } catch { }
  try { localStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(state.ui)); } catch { }
  try { localStorage.setItem(STORAGE_KEYS.syncQueue, JSON.stringify(state.syncQueue)); } catch { }
}

async function saveToIndexedDB() {
  if (!dbReady) return;
  try {
    await Promise.all(state.incidents.map((inc) => dbPut(STORES.INCIDENTS, inc)));
    await Promise.all(state.contacts.map((c) => dbPut(STORES.CONTACTS, c)));
    await dbPut(STORES.SETTINGS, { key: "settings", value: state.settings });
    await dbClear(STORES.SYNC_QUEUE);
    await Promise.all(state.syncQueue.map((item) => dbPut(STORES.SYNC_QUEUE, item)));
  } catch (e) {
    console.warn("[LIFELINE] IndexedDB save failed:", e);
  }
}

async function initStorage() {
  try {
    await initDB();
    dbReady = true;
    const migrated = await migrateFromLocalStorage();
    await loadFromIndexedDB();
    if (Object.values(migrated).some(Boolean)) {
      console.log("[LIFELINE] Migrated data from localStorage to IndexedDB");
    }
  } catch (e) {
    console.warn("[LIFELINE] IndexedDB unavailable, using localStorage only:", e);
    dbReady = false;
    state.dbAvailable = false;
  }
}

loadState();
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { state.isOnline = true; notify(); });
  window.addEventListener("offline", () => { state.isOnline = false; notify(); });
}

export const store = {
  setIncidents(incidents) { state.incidents = incidents; saveState(); notify(); },
  addIncident(incident) {
    state.incidents.unshift(incident);
    if (state.incidents.length > 100) state.incidents = state.incidents.slice(0, 100);
    saveState(); notify();
  },
  updateIncident(id, updates) {
    const idx = state.incidents.findIndex(i => i.id === id);
    if (idx >= 0) { state.incidents[idx] = { ...state.incidents[idx], ...updates }; saveState(); notify(); }
  },
  setContacts(contacts) { state.contacts = contacts; saveState(); notify(); },
  updateContact(id, updates) {
    const idx = state.contacts.findIndex(c => c.id === id);
    if (idx >= 0) { state.contacts[idx] = { ...state.contacts[idx], ...updates }; saveState(); notify(); }
  },
   setSettings(settings) { state.settings = { ...state.settings, ...settings }; if ("demoMode" in settings) state.demoMode = settings.demoMode; saveState(); notify(); },
  setUI(ui) { state.ui = { ...state.ui, ...ui }; saveState(); notify(); },
  setNotificationConfig(config) { state.notificationConfig = config || state.notificationConfig; saveState(); notify(); },
  setDemoMode(on) { state.demoMode = on; state.settings.demoMode = on; saveState(); notify(); },
  enqueueSync(item) { state.syncQueue.push({ ...item, queuedAt: Date.now() }); saveState(); notify(); },
  clearSyncQueue() { state.syncQueue = []; saveState(); notify(); },
  setUser(user) { state.currentUser = user; saveState(); notify(); },
  setLocationCallback(fn) { locationCallback = fn; },
  getLocation() { return locationCallback ? locationCallback() : null; },
  save() { saveState(); },
};

export function initStore() {
  if (state.incidents.length === 0) {
    state.incidents = [
      { id: createIncidentId(), type: "road_hazard", title: "Road obstruction", urgency: "verify", status: "reported", observations: ["Road partially blocked"], timestamp: Date.now() - 8 * 60000, location: { source: "text", description: "near the main market" }, synced: true, isDemo: true },
      { id: createIncidentId(), type: "flooding", title: "Water accumulation", urgency: "monitor", status: "active", observations: ["Water accumulating on road", "Minor flooding"], timestamp: Date.now() - 50 * 60000, location: { source: "text", description: "near the bridge" }, synced: true, isDemo: true },
      { id: createIncidentId(), type: "fire_smoke", title: "Smoke reported", urgency: "urgent", status: "verify", observations: ["Heavy smoke reported"], timestamp: Date.now() - 2 * 60000, location: { source: "text", description: "near community center" }, synced: true, isDemo: true },
    ];
  }
   if (state.settings.mode === "automatic" && state.isOnline) {
     state.settings.allowGroqFallback = true;
   }
   if (state.settings.demoMode) {
     state.demoMode = true;
   }
   saveState();
}

export function isDBAvailable() {
  return state.dbAvailable;
}

export function getDBReady() {
  return dbReady;
}

// Initialize state
loadState();
initStorage().then(() => {
  initStore();
  notify();
});

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { state.isOnline = true; notify(); });
  window.addEventListener("offline", () => { state.isOnline = false; notify(); });
}
