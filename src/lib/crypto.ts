/**
 * Web Crypto API native End-to-End Encryption Engine
 * Implements ECDH (P-256) Key Exchange, AES-GCM (256-bit) Encryption,
 * and Cryptographic Safety Number derivation.
 */

// Generate ECDH P-256 key pair for user identity
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

// Export public key to JSON Web Key (JWK) string for wire exchange
export async function exportPublicKeyJwk(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

// Import public key from JWK string
export async function importPublicKeyJwk(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

// Export private key to JWK string (for local storage vault if desired)
export async function exportPrivateKeyJwk(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

// Import private key from JWK string
export async function importPrivateKeyJwk(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

// Derive AES-GCM 256-bit symmetric key from local private key + remote public key
export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable in memory for security
    ["encrypt", "decrypt"]
  );
}

// Derive AES-GCM key from room passphrase using PBKDF2 (100,000 iterations)
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltStr: string = "ghosttext-salt-2026"
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(saltStr),
      iterations: 100000,
      hash: "SHA-256",
    },
    rawKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt payload object into Base64 ciphertext & IV using AES-GCM
export async function encryptPayload(
  payload: any,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const jsonStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const data = enc.encode(jsonStr);

  // Generate 12-byte random Initialization Vector (96-bit for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );

  const ciphertextBase64 = arrayBufferToBase64(encryptedBuffer);
  const ivBase64 = arrayBufferToBase64(iv.buffer);

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
  };
}

// Decrypt Base64 ciphertext & IV using AES-GCM and return parsed payload
export async function decryptPayload<T = any>(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<T> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer),
    },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr);
}

// Generate human-verifiable 12-digit Safety Number (fingerprint) between two peers
export async function generateSafetyNumber(
  pubKey1Jwk: string,
  pubKey2Jwk: string
): Promise<string> {
  // Sort keys alphabetically to ensure commutative equality on both devices
  const sorted = [pubKey1Jwk, pubKey2Jwk].sort();
  const enc = new TextEncoder();
  const combinedData = enc.encode(sorted.join(":::GHOSTTEXT_SAFETY:::"));
  
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", combinedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Format into 3 chunks of 4 digits (e.g. 8492-1049-5832)
  let numStr = "";
  for (let i = 0; i < 6; i++) {
    const val = (hashArray[i * 2] << 8) | hashArray[i * 2 + 1];
    const chunk = (val % 10000).toString().padStart(4, "0");
    numStr += (i > 0 ? (i % 2 === 0 ? " - " : " ") : "") + chunk;
  }
  return numStr;
}

// Generate short 8-hex fingerprint for an individual public key
export async function generateKeyFingerprint(pubKeyJwk: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", enc.encode(pubKeyJwk));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 4).toUpperCase()}-${hex.slice(4, 8).toUpperCase()}`;
}

// Helper: Convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert Base64 to Hex for cryptographic inspector
export function base64ToHex(base64: string): string {
  try {
    const buffer = base64ToArrayBuffer(base64);
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  } catch {
    return "";
  }
}

// Cryptographic memory shredding utility
export function shredMemory(target: any): void {
  if (!target) return;
  if (target instanceof Uint8Array || target instanceof ArrayBuffer) {
    const view = target instanceof Uint8Array ? target : new Uint8Array(target);
    for (let i = 0; i < view.length; i++) {
      view[i] = 0;
    }
  } else if (typeof target === "object") {
    for (const key of Object.keys(target)) {
      if (typeof target[key] === "string") {
        target[key] = "[DESTROYED]";
      } else if (typeof target[key] === "object") {
        shredMemory(target[key]);
      }
    }
  }
}
