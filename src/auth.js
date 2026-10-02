// LIFELINE AI — Auth provider (local + Firebase)
import { getState, store } from "./store.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

export const AUTH_STATES = { UNAUTHENTICATED: "unauthenticated", AUTHENTICATING: "authenticating", AUTHENTICATED: "authenticated" };

export function isAdmin(uid) {
  return uid === getState().currentUser?.uid || uid === "admin";
}

export function getAuthState() {
  const user = getState().currentUser;
  if (!user) return AUTH_STATES.UNAUTHENTICATED;
  return AUTH_STATES.AUTHENTICATED;
}

export async function localAuth(name, email, password) {
  const users = JSON.parse(localStorage.getItem("lifeline.users.v1") || "[]");
  const existing = users.find(u => u.email === email);
  if (existing) {
    if (btoa(existing.salt + password) === existing.hash) {
      const user = { uid: existing.uid, name: existing.name, email: existing.email, role: "user" };
      store.setUser(user);
      return user;
    }
    throw new Error("Password incorrect.");
  }
  const uid = "user_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const salt = Math.random().toString(36).slice(2, 12);
  const hash = btoa(salt + password);
  const user = { uid, name, email, role: "user", salt, hash, createdAt: new Date().toISOString() };
  users.push(user);
  localStorage.setItem("lifeline.users.v1", JSON.stringify(users));
  store.setUser({ uid, name, email, role: "user" });
  return { uid, name, email, role: "user" };
}

export async function firebaseAuth(email, password) {
  if (!FIREBASE_CONFIG.apiKey) {
    throw new Error("Firebase is not configured. Use local mode.");
  }
  try {
    const [{ initializeApp }, A] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    ]);
    const firebaseApp = initializeApp(FIREBASE_CONFIG);
    const auth = A.getAuth(firebaseApp);
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = { uid: cred.user.uid, name: cred.user.displayName || "", email: cred.user.email, role: "user" };
    store.setUser(user);
    return user;
  } catch (e) {
    throw new Error(e.message || "Authentication failed.");
  }
}

export function logout() {
  store.setUser(null);
}

export function getProviderMode() {
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) return "firebase";
  return "local";
}
