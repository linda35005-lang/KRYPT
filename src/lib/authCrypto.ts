import { PrivateKeyVault } from "../types";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./crypto";

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user password using PBKDF2 (100,000 rounds)
 */
export async function deriveKeyFromUserPassword(
  password: string,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    rawKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable in memory
    ["encrypt", "decrypt"]
  );
}

/**
 * Client-Side Host-Proof Vault Encryption:
 * Encrypts privateKeyJwk using AES-GCM-256 with a key derived from the user's password.
 * The server never sees the plaintext password or the unencrypted private key.
 */
export async function encryptPrivateKeyWithPassword(
  privateKeyJwk: string,
  password: string
): Promise<PrivateKeyVault> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromUserPassword(password, salt);
  const enc = new TextEncoder();
  const data = enc.encode(privateKeyJwk);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypts the privateKeyJwk vault using the password.
 */
export async function decryptPrivateKeyWithPassword(
  vault: PrivateKeyVault,
  password: string
): Promise<string> {
  const saltBytes = new Uint8Array(base64ToArrayBuffer(vault.salt));
  const ivBytes = new Uint8Array(base64ToArrayBuffer(vault.iv));
  const ciphertextBuffer = base64ToArrayBuffer(vault.ciphertext);

  const key = await deriveKeyFromUserPassword(password, saltBytes);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Username validation helper
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: "Username cannot be empty" };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "Username must not exceed 20 characters" };
  }
  const regex = /^[a-zA-Z0-9_-]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: "Username can only contain alphanumeric characters, underscores, and hyphens" };
  }
  return { valid: true };
}

/**
 * Comprehensive password security evaluator
 */
export function calculatePasswordStrength(password: string): {
  score: number; // 0 to 4
  label: string;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: "NONE", feedback: ["Enter a secure master password"], isStrong: false };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("Use at least 8 characters");
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Mix uppercase & lowercase characters");
  }

  if (/[0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push("Include numbers");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push("Include symbols (!@#$%^&*)");
  }

  const roundedScore = Math.min(4, Math.floor(score));

  let label = "WEAK";
  if (roundedScore === 2) label = "FAIR";
  if (roundedScore === 3) label = "GOOD";
  if (roundedScore === 4) label = "ARMORED";

  return {
    score: roundedScore,
    label,
    feedback,
    isStrong: roundedScore >= 2 && password.length >= 8,
  };
}
