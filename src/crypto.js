// LIFELINE AI - Encryption utilities
// Uses Web Crypto API (SubtleCrypto) for AES-GCM encryption
// Keys are derived from user passphrase using PBKDF2
// Never stores keys in plaintext; never sends keys over network

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const SALT_LENGTH = 128;
const IV_LENGTH = 96;
const ITERATIONS = 100000;

export async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH / 8));
}

export async function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH / 8));
}

export async function encryptData(data, key) {
  const enc = new TextEncoder();
  const iv = await generateIV();
  const encoded = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encoded
  );
  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    timestamp: Date.now(),
  };
}

export async function decryptData(encrypted, key) {
  const iv = new Uint8Array(encrypted.iv);
  const ciphertext = new Uint8Array(encrypted.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    ciphertext
  );
  const dec = new TextDecoder().decode(decrypted);
  return JSON.parse(dec);
}

export async function encryptIncident(incident, passphrase) {
  const salt = await generateSalt();
  const key = await deriveKey(passphrase, salt);
  const encrypted = await encryptData(incident, key);
  return {
    encrypted,
    salt: Array.from(salt),
    version: 1,
    encryptedAt: Date.now(),
  };
}

export async function decryptIncident(encryptedIncident, passphrase) {
  const salt = new Uint8Array(encryptedIncident.salt);
  const key = await deriveKey(passphrase, salt);
  return decryptData(encryptedIncident.encrypted, key);
}

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );
  const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return {
    publicKey: Array.from(new Uint8Array(publicKey)),
    privateKey: Array.from(new Uint8Array(privateKey)),
  };
}

export async function deriveSharedKey(privateKey, publicKey) {
  const privKey = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array(privateKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );
  const pubKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(publicKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: pubKey },
    privKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function generateFingerprint(data) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data))
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16)
      .toUpperCase()
    );
}

export function isCryptoAvailable() {
  return typeof crypto !== "undefined" && 
         typeof crypto.subtle !== "undefined" &&
         typeof crypto.subtle.encrypt === "function";
}

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code.match(/.{1,4}/g).join("-");
}