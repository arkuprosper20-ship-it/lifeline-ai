// LIFELINE AI — IndexedDB storage layer
// Replaces localStorage for larger payloads (images, audio, audit logs)
// Falls back to localStorage when IndexedDB is unavailable

const DB_NAME = "lifeline-ai-db";
const DB_VERSION = 1;
const STORES = {
  INCIDENTS: "incidents",
  CONTACTS: "contacts",
  SETTINGS: "settings",
  SYNC_QUEUE: "sync_queue",
  NOTIFICATIONS: "notifications",
  IMAGES: "images",
  AUDIT_LOGS: "audit_logs",
  MAP_TILES: "map_tiles",
};

let db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const [name, keyPath] of Object.entries({
        [STORES.INCIDENTS]: "id",
        [STORES.CONTACTS]: "id",
        [STORES.SETTINGS]: "key",
        [STORES.SYNC_QUEUE]: "id",
        [STORES.NOTIFICATIONS]: "id",
        [STORES.IMAGES]: "id",
        [STORES.AUDIT_LOGS]: "id",
        [STORES.MAP_TILES]: "url",
      })) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getDB() {
  if (db) return db;
  return initDB();
}

export async function dbGet(storeName, key) {
  const database = await getDB();
  if (!database) return null;
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function dbPut(storeName, value) {
  const database = await getDB();
  if (!database) return false;
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

export async function dbGetAll(storeName) {
  const database = await getDB();
  if (!database) return [];
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

export async function dbDelete(storeName, key) {
  const database = await getDB();
  if (!database) return false;
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

export async function dbClear(storeName) {
  const database = await getDB();
  if (!database) return false;
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
}

export async function dbCount(storeName) {
  const database = await getDB();
  if (!database) return 0;
  return new Promise((resolve) => {
    const tx = database.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
}

export async function migrateFromLocalStorage() {
  const migrated = {
    incidents: false,
    contacts: false,
    settings: false,
    syncQueue: false,
    notifications: false,
  };

  try {
    const incidents = JSON.parse(localStorage.getItem("lifeline.incidents.v1") || "[]");
    if (incidents.length) {
      for (const inc of incidents) {
        await dbPut(STORES.INCIDENTS, inc);
      }
      migrated.incidents = true;
    }

    const contacts = JSON.parse(localStorage.getItem("lifeline.contacts.v1") || "[]");
    if (contacts.length) {
      for (const c of contacts) {
        await dbPut(STORES.CONTACTS, c);
      }
      migrated.contacts = true;
    }

    const settings = JSON.parse(localStorage.getItem("lifeline.settings.v1") || "{}");
    if (Object.keys(settings).length) {
      await dbPut(STORES.SETTINGS, { key: "settings", value: settings });
      migrated.settings = true;
    }

    const syncQueue = JSON.parse(localStorage.getItem("lifeline.syncqueue.v1") || "[]");
    if (syncQueue.length) {
      for (const item of syncQueue) {
        await dbPut(STORES.SYNC_QUEUE, item);
      }
      migrated.syncQueue = true;
    }

    const notifications = JSON.parse(localStorage.getItem("lifeline.notifications.v1") || "[]");
    if (notifications.length) {
      for (const n of notifications) {
        await dbPut(STORES.NOTIFICATIONS, n);
      }
      migrated.notifications = true;
    }
  } catch (e) {
    console.warn("[LIFELINE] Migration failed:", e);
  }

  return migrated;
}

export function getDBSize() {
  return dbCount(STORES.INCIDENTS).then(c => c);
}

export { STORES };