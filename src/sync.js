// LIFELINE AI — Sync queue (offline-first architecture)
import { STORAGE_KEYS } from "./types.js";

export function enqueueSync(item) {
  const queue = readQueue();
  item.id = item.id || `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  item.queuedAt = Date.now();
  item.attempts = (item.attempts || 0) + 1;
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.syncQueue);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try { localStorage.setItem(STORAGE_KEYS.syncQueue, JSON.stringify(queue)); } catch { }
}

export async function flushQueue(onItem, options = {}) {
  const queue = readQueue();
  if (!queue.length) return { processed: 0, failed: 0 };
  const failed = [];
  let processed = 0;
  for (const item of queue) {
    if (options.signal?.aborted) break;
    try {
      await onItem(item);
      processed++;
    } catch (error) {
      console.warn("[LIFELINE] Sync item failed:", error?.message || error);
      item.lastError = error?.message || String(error);
      if (item.attempts < (options.maxAttempts || 3)) {
        failed.push(item);
      }
    }
  }
  writeQueue(failed);
  return { processed, failed: failed.length };
}

export function clearQueue() {
  writeQueue([]);
}

export function getQueueCount() {
  return readQueue().length;
}

export function pruneResolvedQueue() {
  const queue = readQueue();
  const pruned = queue.filter(item => item.attempts < 3 && !item.completed);
  if (pruned.length !== queue.length) writeQueue(pruned);
  return pruned.length;
}

export function canSync() {
  return navigator.onLine && readQueue().length > 0;
}

// ---------------------------------------------------------------------------
// Notification queue (offline-first notifications)
// ---------------------------------------------------------------------------

export function enqueueNotification(item) {
  const queue = readNotifications();
  item.id = item.id || "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  item.queuedAt = Date.now();
  item.attempts = (item.attempts || 0) + 1;
  queue.push(item);
  writeNotifications(queue);
  return item;
}

export function readNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notifications);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(queue));
  } catch {}
}

export function clearNotificationQueue() {
  writeNotifications([]);
}

export async function flushNotifications(sendItem, options = {}) {
  const queue = readNotifications();
  if (!queue.length) return { processed: 0, failed: 0 };
  const failed = [];
  let processed = 0;
  for (const item of queue) {
    if (options.signal?.aborted) break;
    try {
      await sendItem(item);
      processed++;
    } catch (error) {
      console.warn("[LIFELINE] Queued notification failed:", error?.message || error);
      item.lastError = error?.message || String(error);
      if (item.attempts < (options.maxAttempts || 3)) {
        failed.push(item);
      }
    }
  }
  writeNotifications(failed);
  return { processed, failed: failed.length };
}

export function getNotificationQueueCount() {
  return readNotifications().length;
}
