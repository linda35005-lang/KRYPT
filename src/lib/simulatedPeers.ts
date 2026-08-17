import { Contact } from "../types";
import {
  generateIdentityKeyPair,
  exportPublicKeyJwk,
  generateKeyFingerprint,
} from "./crypto";

export interface SimulatedPeerInstance {
  contact: Contact;
  keyPair: CryptoKeyPair;
}

// Global registry of initialized simulated peers with active CryptoKeyPairs
const peerInstances = new Map<string, SimulatedPeerInstance>();

export async function getOrInitializeSimulatedPeers(): Promise<Contact[]> {
  const peerConfigs = [
    {
      id: "peer-alice",
      name: "Alice Chen (Lead Crypto Analyst)",
      username: "alice_chen",
      phoneNumber: "+1 (202) 555-0143",
      avatarColor: "from-emerald-500 to-teal-700",
      roleDescription: "Zero-Knowledge & Ephemeral Protocol tester",
      isOnline: true,
      sampleResponses: [
        "Received your encrypted dispatch. The AES-GCM tag validated perfectly on my end.",
        "Verified our safety numbers. The key fingerprints match my hardware security token.",
        "I've enabled a 10s self-destruct on my next response. Watch the countdown timer trigger.",
        "Zero-knowledge relay confirmed: the server only holds encrypted ciphertext chunks.",
        "Burn-on-read received and acknowledged. The ephemeral memory buffer has been zeroed out.",
      ],
    },
    {
      id: "peer-marcus",
      name: "Cmdr. Marcus Stone (UK Operations)",
      username: "marcus_stone",
      phoneNumber: "+44 20 7946 0912",
      avatarColor: "from-blue-500 to-indigo-700",
      roleDescription: "UK Crypto Intelligence Node",
      isOnline: true,
      sampleResponses: [
        "Global encrypted link online via London relay node. Key handshake verified.",
        "Forwarding tactical signal. High-contrast terminal mode active on field devices.",
        "Safety verification code confirmed via secure voice line.",
      ],
    },
    {
      id: "peer-cipher",
      name: "Cipher Security Node",
      username: "cipher_node",
      phoneNumber: "+1 (800) 555-0199",
      avatarColor: "from-cyan-500 to-blue-700",
      roleDescription: "Automated ECDH P-256 Echo & Key Verifier",
      isOnline: true,
      sampleResponses: [
        "ECDH P-256 Key Exchange handshake complete. Shared 256-bit symmetric secret established.",
        "Sending you a View-Once encrypted image test. Tap to unlock the timed viewer.",
        "Cryptographic integrity test PASSED: 128-bit authentication tag intact with zero tampering.",
        "Memory shredder initiated on previous message. All RAM addresses overwritten with 0x00.",
      ],
    },
    {
      id: "peer-maya",
      name: "Maya Lin (Field Journalist)",
      username: "maya_lin",
      phoneNumber: "+41 22 739 8110",
      avatarColor: "from-amber-500 to-orange-700",
      roleDescription: "Encrypted source protection & disappearing media",
      isOnline: true,
      sampleResponses: [
        "Using GhostText for sensitive briefings. Everything auto-deletes per our ephemeral policy.",
        "The camouflage privacy veil is great when working in public spaces to prevent shoulder-surfing.",
        "Sending an encrypted voice memo. Listen before the burn countdown kicks in.",
      ],
    },
    {
      id: "peer-kenji",
      name: "Kenji Sato (Tokyo Node)",
      username: "kenji_sato",
      phoneNumber: "+81 3 5555 0184",
      avatarColor: "from-rose-500 to-red-700",
      roleDescription: "Tokyo Asia-Pacific Cryptographic Relay",
      isOnline: true,
      sampleResponses: [
        "Tokyo hub handshake acknowledged. Low latency direct tunnel established.",
        "Cipher key rotated successfully.",
      ],
    },
    {
      id: "peer-bob",
      name: "Bob Vance (DevOps)",
      username: "bob_vance",
      phoneNumber: "+1 (555) 018-7321",
      avatarColor: "from-purple-500 to-indigo-700",
      roleDescription: "Server-side TTL & Relay Validator",
      isOnline: false,
      sampleResponses: [
        "Tested the panic wipe functionality. All local IndexedDB vaults and cached keys wiped cleanly.",
        "The relay server auto-pruned 14 expired messages from RAM. Zero persistent logs remain.",
      ],
    },
  ];

  const contacts: Contact[] = [];

  for (const cfg of peerConfigs) {
    if (!peerInstances.has(cfg.id)) {
      const keyPair = await generateIdentityKeyPair();
      const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
      const fingerprint = await generateKeyFingerprint(publicKeyJwk);

      const contact: Contact = {
        id: cfg.id,
        name: cfg.name,
        username: cfg.username,
        phoneNumber: cfg.phoneNumber,
        avatarColor: cfg.avatarColor,
        roleDescription: cfg.roleDescription,
        publicKeyJwk,
        fingerprint,
        isSimulated: true,
        isOnline: cfg.isOnline,
        safetyNumberVerified: true,
        unreadCount: 0,
        lastMessageText: "E2EE session ready • ECDH P-256 verified",
        lastMessageTime: Date.now() - 1000 * 60 * 5,
      };

      peerInstances.set(cfg.id, {
        contact,
        keyPair,
      });
    }

    contacts.push(peerInstances.get(cfg.id)!.contact);
  }

  return contacts;
}

// Dynamically create a simulated peer for an ad-hoc global phone number search
export async function createSimulatedPeerForPhoneNumber(
  phoneNumber: string,
  displayName?: string
): Promise<Contact> {
  const cleanId = "peer-phone-" + phoneNumber.replace(/[^\d]/g, "");
  if (peerInstances.has(cleanId)) {
    return peerInstances.get(cleanId)!.contact;
  }

  const keyPair = await generateIdentityKeyPair();
  const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
  const fingerprint = await generateKeyFingerprint(publicKeyJwk);

  const contact: Contact = {
    id: cleanId,
    name: displayName || `Global Node (${phoneNumber})`,
    phoneNumber,
    avatarColor: "from-teal-500 to-emerald-700",
    roleDescription: `Direct E2EE Tunnel via Global Phone (${phoneNumber})`,
    publicKeyJwk,
    fingerprint,
    isSimulated: true,
    isOnline: true,
    safetyNumberVerified: false,
    unreadCount: 0,
    lastMessageText: "Global Phone line verified • AES-GCM 256 ready",
    lastMessageTime: Date.now(),
  };

  peerInstances.set(cleanId, {
    contact,
    keyPair,
  });

  return contact;
}

export function getSimulatedPeerInstance(peerId: string): SimulatedPeerInstance | undefined {
  return peerInstances.get(peerId);
}

// Generate realistic simulated peer reply with varied media & ephemeral types
export async function generatePeerResponse(
  peerId: string,
  userMessageText: string,
  userEphemeralType: string
): Promise<{
  text: string;
  mediaType: "text" | "image" | "audio";
  mediaData?: string;
  ephemeralType: "off" | "burn_on_read" | "timed" | "view_once";
  ephemeralDuration?: number;
}> {
  const instance = peerInstances.get(peerId);
  const name = instance?.contact.name || "Peer";

  const lower = userMessageText.toLowerCase();

  // If user sent a photo or asked for photo
  if (lower.includes("photo") || lower.includes("image") || lower.includes("pic") || lower.includes("see")) {
    return {
      text: "Here is the encrypted visual dispatch. View once before it self-destructs.",
      mediaType: "image",
      mediaData: createTestDisappearingCanvasImage("CONFIDENTIAL DISPATCH • VIEW ONCE"),
      ephemeralType: "view_once",
      ephemeralDuration: 8,
    };
  }

  // If user sent a voice memo or asked for audio
  if (lower.includes("voice") || lower.includes("audio") || lower.includes("listen") || lower.includes("record")) {
    return {
      text: "Here is an encrypted audio memo dispatch.",
      mediaType: "audio",
      mediaData: createSyntheticAudioTone(),
      ephemeralType: userEphemeralType === "burn_on_read" ? "burn_on_read" : "timed",
      ephemeralDuration: 15,
    };
  }

  // If user used burn on read, respond with burn on read
  if (userEphemeralType === "burn_on_read") {
    return {
      text: `[SECURE BURN-ON-READ] Acknowledged your secret dispatch. Once you tap to reveal this, it will vaporize from memory in 6 seconds.`,
      mediaType: "text",
      ephemeralType: "burn_on_read",
      ephemeralDuration: 6,
    };
  }

  // If user used timed ephemeral
  if (userEphemeralType === "timed") {
    return {
      text: `[TIMED EPHEMERAL] Received with end-to-end encryption. This message is configured to disappear in 15 seconds.`,
      mediaType: "text",
      ephemeralType: "timed",
      ephemeralDuration: 15,
    };
  }

  // General crypto response
  const generalResponses = [
    `Received your ciphertext securely. Decrypted locally using ECDH shared key derived from your P-256 public key (${instance?.contact.fingerprint || "E2EE"}).`,
    `Safety number checksum confirmed. All packets authenticated with 128-bit Galois Message Authentication Codes (GMAC).`,
    `The communication channel is completely private. Neither server nor ISP can inspect our plaintext contents.`,
    `GhostText session active. You can test self-destruct timers (10s, 30s, 1m) or send view-once photos anytime.`,
  ];

  const chosenText = generalResponses[Math.floor(Math.random() * generalResponses.length)];
  return {
    text: chosenText,
    mediaType: "text",
    ephemeralType: "off",
  };
}

// Generate a high-contrast confidential crypto visual badge canvas as Base64 image
function createTestDisappearingCanvasImage(label: string): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Dark cyber background
  const grad = ctx.createLinearGradient(0, 0, 600, 400);
  grad.addColorStop(0, "#090d16");
  grad.addColorStop(0.5, "#0f172a");
  grad.addColorStop(1, "#042f2e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Circuit grid lines
  ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 600; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }
  for (let y = 0; y < 400; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // Security Watermark Frame
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 540, 340);

  // Corner brackets
  ctx.strokeStyle = "#06b6d4";
  ctx.lineWidth = 5;
  // Top left
  ctx.beginPath(); ctx.moveTo(20, 50); ctx.lineTo(20, 20); ctx.lineTo(50, 20); ctx.stroke();
  // Top right
  ctx.beginPath(); ctx.moveTo(550, 20); ctx.lineTo(580, 20); ctx.lineTo(580, 50); ctx.stroke();
  // Bottom left
  ctx.beginPath(); ctx.moveTo(20, 350); ctx.lineTo(20, 380); ctx.lineTo(50, 380); ctx.stroke();
  // Bottom right
  ctx.beginPath(); ctx.moveTo(550, 380); ctx.lineTo(580, 380); ctx.lineTo(580, 350); ctx.stroke();

  // Shield Icon / Text
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText("🔒 E2EE VIEW-ONCE ENCRYPTED PHOTO", 300, 140);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(label, 300, 190);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px monospace";
  ctx.fillText(`KEY ID: 0x${Math.random().toString(16).substring(2, 10).toUpperCase()} • EPHEMERAL TTL: 8 SECONDS`, 300, 240);
  ctx.fillText("WILL BE PERMANENTLY SHREDDED UPON EXPIRY", 300, 270);

  // Red stamp
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.strokeRect(200, 300, 200, 40);
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 16px monospace";
  ctx.fillText("TOP SECRET // 256-BIT", 300, 326);

  return canvas.toDataURL("image/png");
}

// Generate short synthetic WAV audio tone (playable base64 data URI)
function createSyntheticAudioTone(): string {
  // Generate 2 seconds of synthetic audio waveform as PCM WAV
  const sampleRate = 8000;
  const duration = 2;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true); // Block align
  view.setUint16(34, 8, true); // 8-bit
  writeString(view, 36, "data");
  view.setUint32(40, numSamples, true);

  // Generate pleasant dual-tone cipher sound
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 440 + Math.sin(t * 12) * 80;
    const sample = 128 + Math.round(50 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 0.8));
    view.setUint8(44 + i, sample);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + window.btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
