import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  KeyRound,
  Radio,
  Sliders,
  Sparkles,
  Lock,
  MessageSquare,
  Users,
  Eye,
  CheckCircle2,
  Trash2,
  Share2,
  Phone,
  Video,
  Calendar,
  Clock,
} from "lucide-react";
import {
  Contact,
  EncryptedMessage,
  EphemeralType,
  RoomInfo,
  UserIdentity,
  CipherAuditData,
  UserSettings,
  AppTheme,
  ActiveCallSession,
  CallType,
  SoundType,
} from "./types";
import {
  generateIdentityKeyPair,
  exportPublicKeyJwk,
  importPublicKeyJwk,
  deriveSharedSecret,
  deriveKeyFromPassphrase,
  encryptPayload,
  decryptPayload,
  generateSafetyNumber,
  generateKeyFingerprint,
  shredMemory,
} from "./lib/crypto";
import {
  getOrInitializeSimulatedPeers,
  getSimulatedPeerInstance,
  generatePeerResponse,
} from "./lib/simulatedPeers";
import {
  playIncomingMessageSound,
  playMessageSentSound,
  playBurnShredSound,
  playCallConnectedSound,
  playCallEndedSound,
} from "./lib/soundFx";
import { Navbar } from "./components/Navbar";
import { ContactSidebar } from "./components/ContactSidebar";
import { MessageItem } from "./components/MessageItem";
import { MessageComposer } from "./components/MessageComposer";
import { E2EEInspectorModal } from "./components/E2EEInspectorModal";
import { SafetyNumberModal } from "./components/SafetyNumberModal";
import { LiveRoomModal } from "./components/LiveRoomModal";
import { PanicWipeModal } from "./components/PanicWipeModal";
import { ViewOnceModal } from "./components/ViewOnceModal";
import { PrivacyVeilOverlay } from "./components/PrivacyVeilOverlay";
import { AuthModal } from "./components/AuthModal";
import { AccountProfileModal } from "./components/AccountProfileModal";
import { UserDirectoryModal } from "./components/UserDirectoryModal";
import { SettingsModal } from "./components/SettingsModal";
import { VideoCallModal } from "./components/VideoCallModal";

// Helper to compute calendar day key (e.g., "2026-08-17")
function getDayHeaderKey(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Helper to format human-readable day header label
function formatDayHeaderLabel(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const formattedDate = d.toLocaleDateString(undefined, dateOptions);

  if (isToday) {
    return `TODAY • ${formattedDate.toUpperCase()}`;
  }
  if (isYesterday) {
    return `YESTERDAY • ${formattedDate.toUpperCase()}`;
  }
  return formattedDate.toUpperCase();
}

export default function App() {
  // Identity state
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("peer-alice");
  
  // Auth & Account Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("register");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState<boolean>(false);
  
  // Live Room state
  const [activeRoom, setActiveRoom] = useState<RoomInfo | null>(null);
  const [liveRoomMessages, setLiveRoomMessages] = useState<EncryptedMessage[]>([]);
  const [liveRoomPeerCount, setLiveRoomPeerCount] = useState<number>(0);
  const [roomCryptoKey, setRoomCryptoKey] = useState<CryptoKey | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Direct peer messages mapping: contactId -> EncryptedMessage[]
  const [directMessages, setDirectMessages] = useState<Record<string, EncryptedMessage[]>>({});

  // Shared secret cache: contactId -> CryptoKey
  const sharedSecretCache = useRef<Map<string, CryptoKey>>(new Map());

  // Global settings & ephemeral state
  const [globalEphemeral, setGlobalEphemeral] = useState<EphemeralType>("off");
  const [globalDuration, setGlobalDuration] = useState<number>(10);
  const [burnedCount, setBurnedCount] = useState<number>(0);
  const [peerTyping, setPeerTyping] = useState<boolean>(false);

  // User Settings & Theme state
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("krypt_user_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      theme: "stealth-dark",
      highContrastMode: false,
      monospaceMode: false,
      scanlines: false,
      soundAlerts: true,
      soundType: "stealth-sonar",
      soundVolume: 70,
    };
  });

  // Active Call Session State (Audio & Video E2EE calls)
  const [callSession, setCallSession] = useState<ActiveCallSession | null>(null);

  // Modals & UI overlays
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeAuditData, setActiveAuditData] = useState<CipherAuditData | null>(null);
  const [safetyModalContact, setSafetyModalContact] = useState<Contact | null>(null);
  const [safetyNumberCode, setSafetyNumberCode] = useState<string>("");
  const [isLiveRoomModalOpen, setIsLiveRoomModalOpen] = useState<boolean>(false);
  const [isPanicWipeOpen, setIsPanicWipeOpen] = useState<boolean>(false);
  const [viewOnceMessage, setViewOnceMessage] = useState<EncryptedMessage | null>(null);
  const [privacyVeilActive, setPrivacyVeilActive] = useState<boolean>(false);

  // Sync settings and theme to document
  useEffect(() => {
    localStorage.setItem("krypt_user_settings", JSON.stringify(settings));
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Initialize WebCrypto Keypair, Check Saved Session & Load Contacts
  useEffect(() => {
    let isMounted = true;

    async function initCryptoAndAuth() {
      try {
        const storedToken = localStorage.getItem("krypt_auth_token");
        const loadedContacts = await getOrInitializeSimulatedPeers();
        if (!isMounted) return;
        setContacts(loadedContacts);

        // Check if existing session token is valid
        if (storedToken) {
          try {
            const res = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            const data = await res.json();

            if (res.ok && data.user) {
              const keyPair = await generateIdentityKeyPair();
              const publicKeyJwk = data.user.publicKeyJwk || (await exportPublicKeyJwk(keyPair.publicKey));
              const fingerprint = data.user.fingerprint || (await generateKeyFingerprint(publicKeyJwk));

              const authIdentity: UserIdentity = {
                id: data.user.id,
                name: data.user.displayName || `@${data.user.username}`,
                username: data.user.username,
                color: "emerald",
                keyPair,
                publicKeyJwk,
                fingerprint,
                isRegistered: true,
                token: storedToken,
              };

              if (!isMounted) return;
              setIdentity(authIdentity);

              // Check if URL specifies a live room
              const urlParams = new URLSearchParams(window.location.search);
              const roomFromUrl = urlParams.get("room");
              if (roomFromUrl) {
                joinLiveRoom(roomFromUrl, undefined, authIdentity);
              } else if (loadedContacts[0]) {
                seedInitialEncryptedMessage(loadedContacts[0], authIdentity);
              }
              return;
            } else {
              localStorage.removeItem("krypt_auth_token");
              localStorage.removeItem("krypt_auth_username");
            }
          } catch (sessionErr) {
            console.warn("Session token verification error:", sessionErr);
          }
        }

        // Default: Generate initial anonymous cryptographic identity
        const keyPair = await generateIdentityKeyPair();
        const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
        const fingerprint = await generateKeyFingerprint(publicKeyJwk);

        const newIdentity: UserIdentity = {
          id: `user-${fingerprint.toLowerCase()}`,
          name: `Operative [${fingerprint}]`,
          color: "emerald",
          keyPair,
          publicKeyJwk,
          fingerprint,
          isRegistered: false,
        };

        if (!isMounted) return;
        setIdentity(newIdentity);

        // Check if URL specifies a live room
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get("room");
        if (roomFromUrl) {
          joinLiveRoom(roomFromUrl, undefined, newIdentity);
        } else if (loadedContacts[0]) {
          seedInitialEncryptedMessage(loadedContacts[0], newIdentity);
        }
      } catch (err) {
        console.error("Failed to initialize cryptographic environment:", err);
      }
    }

    initCryptoAndAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Seed sample introductory messages
  const seedInitialEncryptedMessage = async (aliceContact: Contact, userIdent: UserIdentity) => {
    if (!aliceContact || !userIdent.keyPair) return;

    try {
      const aliceInstance = getSimulatedPeerInstance(aliceContact.id);
      if (!aliceInstance) return;

      const peerKey = await importPublicKeyJwk(aliceContact.publicKeyJwk);
      const secret = await deriveSharedSecret(userIdent.keyPair.privateKey, peerKey);
      sharedSecretCache.current.set(aliceContact.id, secret);

      // Create welcome encrypted message
      const welcomePayload = {
        text: "🔐 Welcome to GhostText. This session is secured with ECDH P-256 key agreement and AES-GCM 256-bit symmetric encryption. Try sending a Burn-on-Read or 10s auto-destruct message!",
        mediaType: "text" as const,
      };

      const encrypted = await encryptPayload(welcomePayload, secret);
      const initialMsg: EncryptedMessage = {
        id: `msg-seed-${Date.now()}`,
        roomId: aliceContact.id,
        senderId: aliceContact.id,
        senderName: aliceContact.name,
        senderPublicKey: aliceContact.publicKeyJwk,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        ephemeralType: "off",
        createdAt: Date.now(),
        mediaType: "text",
        decrypted: welcomePayload,
        reactions: {
          "🔒": [{ userId: aliceContact.id, userName: aliceContact.name }],
          "⚡": [{ userId: aliceContact.id, userName: aliceContact.name }],
        },
      };

      setDirectMessages({
        [aliceContact.id]: [initialMsg],
      });
    } catch (e) {
      console.warn("Could not seed initial message:", e);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [directMessages, liveRoomMessages, activeChannelId]);

  // 2. Continuous Ephemeral Countdown & Shredding Engine (Every 1s)
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();

      // Check Direct Messages
      setDirectMessages((prevMap) => {
        let updated = false;
        const newMap: Record<string, EncryptedMessage[]> = {};

        for (const [contactId, msgs] of Object.entries(prevMap) as [string, EncryptedMessage[]][]) {
          const newMsgs: EncryptedMessage[] = [];

          for (const msg of msgs) {
            // Check Burn on Read
            if (msg.ephemeralType === "burn_on_read" && msg.isRevealed && !msg.isBurned) {
              const remaining = (msg.burnRemainingSec ?? (msg.ephemeralDuration || 5)) - 1;
              if (remaining <= 0) {
                // SHRED MEMORY
                shredMemory(msg.decrypted);
                newMsgs.push({
                  ...msg,
                  isBurned: true,
                  burnRemainingSec: 0,
                  decrypted: undefined,
                });
                setBurnedCount((c) => c + 1);
                updated = true;
              } else {
                newMsgs.push({
                  ...msg,
                  burnRemainingSec: remaining,
                });
                updated = true;
              }
            }
            // Check Timed Ephemeral
            else if (msg.ephemeralType === "timed" && msg.expiresAt && !msg.isBurned) {
              const secondsLeft = Math.max(0, Math.ceil((msg.expiresAt - now) / 1000));
              if (secondsLeft <= 0) {
                shredMemory(msg.decrypted);
                newMsgs.push({
                  ...msg,
                  isBurned: true,
                  burnRemainingSec: 0,
                  decrypted: undefined,
                });
                setBurnedCount((c) => c + 1);
                updated = true;
              } else {
                newMsgs.push({
                  ...msg,
                  burnRemainingSec: secondsLeft,
                });
                updated = true;
              }
            } else {
              newMsgs.push(msg);
            }
          }

          newMap[contactId] = newMsgs;
        }

        return updated ? newMap : prevMap;
      });

      // Check Live Room Messages
      setLiveRoomMessages((prevMsgs) => {
        let updated = false;
        const newMsgs: EncryptedMessage[] = [];

        for (const msg of prevMsgs) {
          if (msg.ephemeralType === "burn_on_read" && msg.isRevealed && !msg.isBurned) {
            const remaining = (msg.burnRemainingSec ?? (msg.ephemeralDuration || 5)) - 1;
            if (remaining <= 0) {
              shredMemory(msg.decrypted);
              newMsgs.push({
                ...msg,
                isBurned: true,
                burnRemainingSec: 0,
                decrypted: undefined,
              });
              setBurnedCount((c) => c + 1);
              updated = true;
            } else {
              newMsgs.push({ ...msg, burnRemainingSec: remaining });
              updated = true;
            }
          } else if (msg.ephemeralType === "timed" && msg.expiresAt && !msg.isBurned) {
            const secondsLeft = Math.max(0, Math.ceil((msg.expiresAt - now) / 1000));
            if (secondsLeft <= 0) {
              shredMemory(msg.decrypted);
              newMsgs.push({
                ...msg,
                isBurned: true,
                burnRemainingSec: 0,
                decrypted: undefined,
              });
              setBurnedCount((c) => c + 1);
              updated = true;
            } else {
              newMsgs.push({ ...msg, burnRemainingSec: secondsLeft });
              updated = true;
            }
          } else {
            newMsgs.push(msg);
          }
        }

        return updated ? newMsgs : prevMsgs;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 3. Connect to Live Room (SSE stream + API)
  const joinLiveRoom = async (
    roomId: string,
    passphrase?: string,
    overrideIdentity?: UserIdentity
  ) => {
    const activeIdent = overrideIdentity || identity;
    if (!activeIdent || !activeIdent.keyPair) return;

    // Clean up old SSE
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    try {
      // Derive key from passphrase or room name
      const key = passphrase
        ? await deriveKeyFromPassphrase(passphrase)
        : await deriveKeyFromPassphrase(roomId, "ghosttext-room-salt");
      setRoomCryptoKey(key);

      // Join room on server
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: activeIdent.id,
          name: activeIdent.name,
          publicKey: activeIdent.publicKeyJwk,
        }),
      });

      const data = await res.json();
      if (data.members) {
        setLiveRoomPeerCount(data.members.length);
      }

      // Decrypt any pre-existing messages
      if (data.messages && Array.isArray(data.messages)) {
        const decryptedList: EncryptedMessage[] = [];
        for (const rawMsg of data.messages) {
          try {
            const payload = await decryptPayload(rawMsg.ciphertext, rawMsg.iv, key);
            decryptedList.push({
              ...rawMsg,
              decrypted: payload,
            });
          } catch (e) {
            decryptedList.push({
              ...rawMsg,
              decryptError: true,
            });
          }
        }
        setLiveRoomMessages(decryptedList);
      }

      setActiveRoom({
        id: roomId,
        name: `Live Room: ${roomId}`,
        isLive: true,
        peerCount: data.members?.length || 1,
        passphrase,
        lastActivity: Date.now(),
      });

      setActiveChannelId("live-relay-room");

      // Connect SSE
      const sse = new EventSource(`/api/rooms/${encodeURIComponent(roomId)}/events`);
      sseRef.current = sse;

      sse.onmessage = async (evt) => {
        try {
          const eventData = JSON.parse(evt.data);

          if (eventData.type === "new_message") {
            const incoming: EncryptedMessage = eventData.message;
            // Play incoming sound alert
            if (settings.soundAlerts && incoming.senderId !== activeIdent.id) {
              playIncomingMessageSound(settings.soundType, settings.soundVolume);
            }
            // Ignore own message if already appended
            try {
              const payload = await decryptPayload(incoming.ciphertext, incoming.iv, key);
              setLiveRoomMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [
                  ...prev,
                  {
                    ...incoming,
                    decrypted: payload,
                  },
                ];
              });
            } catch (err) {
              setLiveRoomMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, { ...incoming, decryptError: true }];
              });
            }
          } else if (eventData.type === "message_burned") {
            if (settings.soundAlerts) {
              playBurnShredSound(settings.soundVolume);
            }
            setLiveRoomMessages((prev) =>
              prev.map((m) =>
                m.id === eventData.messageId
                  ? { ...m, isBurned: true, decrypted: undefined }
                  : m
              )
            );
            setBurnedCount((c) => c + 1);
          } else if (eventData.type === "message_reaction") {
            const { messageId, reactions } = eventData;
            setLiveRoomMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
            );
          } else if (eventData.type === "member_joined") {
            setLiveRoomPeerCount((prev) => prev + 1);
          } else if (eventData.type === "member_left") {
            setLiveRoomPeerCount((prev) => Math.max(1, prev - 1));
          } else if (eventData.type === "panic_wipe") {
            setLiveRoomMessages([]);
            setBurnedCount((c) => c + 1);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };
    } catch (err) {
      console.error("Failed to connect live room:", err);
    }
  };

  // 4. Send Message Handler (E2EE Client-Side Encrypt)
  const handleSendMessage = async (payload: {
    text: string;
    mediaType?: "text" | "image" | "audio" | "video";
    mediaData?: string;
    audioDuration?: number;
    videoDuration?: number;
    ephemeralType: EphemeralType;
    ephemeralDuration?: number;
  }) => {
    if (!identity || !identity.keyPair) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const duration = payload.ephemeralDuration || (payload.ephemeralType === "timed" ? globalDuration : 5);
    const expiresAt = payload.ephemeralType === "timed" ? now + duration * 1000 : undefined;

    const messagePayload = {
      text: payload.text,
      mediaType: payload.mediaType || "text",
      mediaData: payload.mediaData,
      audioDuration: payload.audioDuration,
      videoDuration: payload.videoDuration,
    };

    // Play message sent feedback sound
    if (settings.soundAlerts) {
      playMessageSentSound(settings.soundVolume);
    }

    // A. Sending in Live Room
    if (activeChannelId === "live-relay-room") {
      if (!activeRoom || !roomCryptoKey) return;

      const encrypted = await encryptPayload(messagePayload, roomCryptoKey);

      // Local optimistic message
      const localMsg: EncryptedMessage = {
        id: messageId,
        roomId: activeRoom.id,
        senderId: identity.id,
        senderName: identity.name,
        senderPublicKey: identity.publicKeyJwk,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        ephemeralType: payload.ephemeralType,
        ephemeralDuration: duration,
        createdAt: now,
        expiresAt,
        mediaType: payload.mediaType || "text",
        decrypted: messagePayload,
        burnRemainingSec: duration,
      };

      setLiveRoomMessages((prev) => [...prev, localMsg]);

      // Post to zero-knowledge server relay
      await fetch(`/api/rooms/${encodeURIComponent(activeRoom.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: messageId,
          senderId: identity.id,
          senderName: identity.name,
          senderPublicKey: identity.publicKeyJwk,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          ephemeralType: payload.ephemeralType,
          ephemeralDuration: duration,
          mediaType: payload.mediaType || "text",
        }),
      });
      return;
    }

    // B. Sending to Direct Peer (Alice, Cipher, Maya, Bob)
    const currentContact = contacts.find((c) => c.id === activeChannelId);
    if (!currentContact) return;

    // Get or derive shared secret with contact
    let sharedSecret = sharedSecretCache.current.get(currentContact.id);
    if (!sharedSecret) {
      const peerKey = await importPublicKeyJwk(currentContact.publicKeyJwk);
      sharedSecret = await deriveSharedSecret(identity.keyPair.privateKey, peerKey);
      sharedSecretCache.current.set(currentContact.id, sharedSecret);
    }

    // Encrypt payload with AES-GCM
    const encrypted = await encryptPayload(messagePayload, sharedSecret);

    const userMessage: EncryptedMessage = {
      id: messageId,
      roomId: currentContact.id,
      senderId: identity.id,
      senderName: identity.name,
      senderPublicKey: identity.publicKeyJwk,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      ephemeralType: payload.ephemeralType,
      ephemeralDuration: duration,
      createdAt: now,
      expiresAt,
      mediaType: payload.mediaType || "text",
      decrypted: messagePayload,
      burnRemainingSec: duration,
    };

    setDirectMessages((prev) => ({
      ...prev,
      [currentContact.id]: [...(prev[currentContact.id] || []), userMessage],
    }));

    // Trigger simulated peer response with ECDH encryption
    if (currentContact.isSimulated) {
      setPeerTyping(true);

      setTimeout(async () => {
        setPeerTyping(false);
        try {
          const peerResponse = await generatePeerResponse(
            currentContact.id,
            payload.text,
            payload.ephemeralType
          );

          const peerPayload = {
            text: peerResponse.text,
            mediaType: peerResponse.mediaType,
            mediaData: peerResponse.mediaData,
          };

          const peerEncrypted = await encryptPayload(peerPayload, sharedSecret!);
          const peerDuration = peerResponse.ephemeralDuration || 10;
          const peerExpiresAt =
            peerResponse.ephemeralType === "timed" ? Date.now() + peerDuration * 1000 : undefined;

          const peerMessage: EncryptedMessage = {
            id: `msg-peer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            roomId: currentContact.id,
            senderId: currentContact.id,
            senderName: currentContact.name,
            senderPublicKey: currentContact.publicKeyJwk,
            ciphertext: peerEncrypted.ciphertext,
            iv: peerEncrypted.iv,
            ephemeralType: peerResponse.ephemeralType,
            ephemeralDuration: peerDuration,
            createdAt: Date.now(),
            expiresAt: peerExpiresAt,
            mediaType: peerResponse.mediaType,
            decrypted: peerPayload,
            burnRemainingSec: peerDuration,
          };

          // Play incoming sound
          if (settings.soundAlerts) {
            playIncomingMessageSound(settings.soundType, settings.soundVolume);
          }

          setDirectMessages((prev) => ({
            ...prev,
            [currentContact.id]: [...(prev[currentContact.id] || []), peerMessage],
          }));
        } catch (e) {
          console.error("Peer response error:", e);
        }
      }, 1200);
    }
  };

  // 5. Reveal Burn-On-Read Message
  const handleRevealBurnOnRead = (messageId: string) => {
    // Reveal in direct messages
    setDirectMessages((prevMap) => {
      const newMap = { ...prevMap };
      for (const contactId of Object.keys(newMap)) {
        newMap[contactId] = newMap[contactId].map((m) => {
          if (m.id === messageId && !m.isRevealed) {
            return {
              ...m,
              isRevealed: true,
              revealedAt: Date.now(),
              burnRemainingSec: m.ephemeralDuration || 5,
            };
          }
          return m;
        });
      }
      return newMap;
    });

    // Reveal in live room
    setLiveRoomMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && !m.isRevealed
          ? {
              ...m,
              isRevealed: true,
              revealedAt: Date.now(),
              burnRemainingSec: m.ephemeralDuration || 5,
            }
          : m
      )
    );
  };

  // 6. Manual Burn / Shred single message
  const handleBurnSingleMessage = async (messageId: string) => {
    // Play burn shred sound
    if (settings.soundAlerts) {
      playBurnShredSound(settings.soundVolume);
    }

    // If in live room, notify server
    if (activeChannelId === "live-relay-room" && activeRoom) {
      fetch(`/api/rooms/${encodeURIComponent(activeRoom.id)}/messages/${messageId}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    setDirectMessages((prevMap) => {
      const newMap = { ...prevMap };
      for (const cId of Object.keys(newMap)) {
        newMap[cId] = newMap[cId].map((m) =>
          m.id === messageId
            ? { ...m, isBurned: true, decrypted: undefined }
            : m
        );
      }
      return newMap;
    });

    setLiveRoomMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isBurned: true, decrypted: undefined } : m
      )
    );

    setBurnedCount((c) => c + 1);
  };

  // Calling Handlers (Audio & Video calls)
  const handleStartCall = (type: CallType, contactOverride?: Contact) => {
    const target = contactOverride || contacts.find((c) => c.id === activeChannelId);
    if (!target || !identity) return;

    const session: ActiveCallSession = {
      id: `call-${Date.now()}`,
      peerId: target.id,
      peerName: target.name,
      peerFingerprint: target.fingerprint,
      peerAvatarColor: target.avatarColor,
      type,
      status: "dialing",
      isIncoming: false,
      startedAt: Date.now(),
      isMuted: false,
      isVideoOff: type === "audio",
      isScreenSharing: false,
      encryptionCipher: "DTLS-SRTP 256-bit AES-GCM (WebRTC P2P)",
      quality: type === "video" ? "HD 1080p (E2EE)" : "STEREO OPUS 48kHz",
    };
    setCallSession(session);

    // If simulated peer, simulate peer answering after 2.6 seconds
    if (target.isSimulated) {
      setTimeout(() => {
        setCallSession((prev) => {
          if (!prev || prev.status === "ended") return null;
          return {
            ...prev,
            status: "connected",
            connectedAt: Date.now(),
          };
        });
      }, 2600);
    }
  };

  const handleEndCall = () => {
    if (settings.soundAlerts) {
      playCallEndedSound(settings.soundVolume);
    }
    setCallSession((prev) => (prev ? { ...prev, status: "ended" } : null));
    setTimeout(() => {
      setCallSession(null);
    }, 400);
  };

  const handleAcceptCall = (type?: "video" | "audio") => {
    setCallSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "connected",
        connectedAt: Date.now(),
        type: (type as CallType) || prev.type,
        isVideoOff: (type || prev.type) === "audio",
      };
    });
  };

  const handleToggleMute = () => {
    setCallSession((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const handleToggleVideo = () => {
    setCallSession((prev) => (prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null));
  };

  const handleToggleScreenShare = () => {
    setCallSession((prev) => (prev ? { ...prev, isScreenSharing: !prev.isScreenSharing } : null));
  };

  // Update Phone Number Handler
  const handleUpdatePhoneNumber = async (phoneNumber: string) => {
    const token = localStorage.getItem("krypt_auth_token");
    if (token) {
      const res = await fetch("/api/auth/update-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        throw new Error("Failed to update phone number on server");
      }
    }
    setIdentity((prev) => (prev ? { ...prev, phoneNumber } : null));
  };

  // 6.1 Toggle Reaction on Message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!identity) return;

    const currentUserId = identity.id;
    const currentUserName = identity.username ? `@${identity.username}` : identity.name;

    // Toggle in Direct Messages
    setDirectMessages((prevMap) => {
      const newMap = { ...prevMap };
      for (const cId of Object.keys(newMap)) {
        newMap[cId] = newMap[cId].map((m) => {
          if (m.id === messageId) {
            const reactions = { ...(m.reactions || {}) };
            const currentList = [...(reactions[emoji] || [])];
            const existingIndex = currentList.findIndex(
              (r) => r.userId === currentUserId || r.userName === currentUserName
            );

            if (existingIndex > -1) {
              currentList.splice(existingIndex, 1);
              if (currentList.length === 0) {
                delete reactions[emoji];
              } else {
                reactions[emoji] = currentList;
              }
            } else {
              currentList.push({ userId: currentUserId, userName: currentUserName });
              reactions[emoji] = currentList;
            }

            return { ...m, reactions };
          }
          return m;
        });
      }
      return newMap;
    });

    // Toggle in Live Room & Broadcast to server
    if (activeChannelId === "live-relay-room" && activeRoom) {
      fetch(`/api/rooms/${encodeURIComponent(activeRoom.id)}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji,
          userId: currentUserId,
          userName: currentUserName,
        }),
      }).catch((e) => console.warn("Live room reaction error:", e));

      setLiveRoomMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const reactions = { ...(m.reactions || {}) };
            const currentList = [...(reactions[emoji] || [])];
            const existingIndex = currentList.findIndex(
              (r) => r.userId === currentUserId || r.userName === currentUserName
            );

            if (existingIndex > -1) {
              currentList.splice(existingIndex, 1);
              if (currentList.length === 0) {
                delete reactions[emoji];
              } else {
                reactions[emoji] = currentList;
              }
            } else {
              currentList.push({ userId: currentUserId, userName: currentUserName });
              reactions[emoji] = currentList;
            }

            return { ...m, reactions };
          }
          return m;
        })
      );
    }

    // Simulated peer responsive reaction
    const currentContact = contacts.find((c) => c.id === activeChannelId);
    if (currentContact?.isSimulated && Math.random() > 0.35) {
      setTimeout(() => {
        const peerOptions = ["🔒", "👍", "🔥", "⚡", "👀", "🛡️"];
        const chosenEmoji = peerOptions[Math.floor(Math.random() * peerOptions.length)];

        setDirectMessages((prevMap) => {
          const msgs = prevMap[currentContact.id];
          if (!msgs || msgs.length === 0) return prevMap;
          const targetMsg = msgs.find((m) => m.id === messageId);
          if (!targetMsg || targetMsg.isBurned) return prevMap;

          const reactions = { ...(targetMsg.reactions || {}) };
          const list = [...(reactions[chosenEmoji] || [])];
          if (!list.some((r) => r.userId === currentContact.id)) {
            list.push({ userId: currentContact.id, userName: currentContact.name });
            reactions[chosenEmoji] = list;
          }

          return {
            ...prevMap,
            [currentContact.id]: msgs.map((m) =>
              m.id === targetMsg.id ? { ...m, reactions } : m
            ),
          };
        });
      }, 750);
    }
  };

  // 7. Safety Number Modal Open & Generation
  const handleOpenSafetyNumber = async (contact?: Contact) => {
    const target = contact || contacts.find((c) => c.id === activeChannelId);
    if (!target || !identity) return;

    try {
      const code = await generateSafetyNumber(identity.publicKeyJwk, target.publicKeyJwk);
      setSafetyNumberCode(code);
      setSafetyModalContact(target);
    } catch (e) {
      console.error("Failed to generate safety number:", e);
    }
  };

  // 8. Toggle Safety Verified status
  const handleToggleVerified = (contactId: string, verified: boolean) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, safetyNumberVerified: verified } : c
      )
    );
    if (safetyModalContact?.id === contactId) {
      setSafetyModalContact((prev) => (prev ? { ...prev, safetyNumberVerified: verified } : null));
    }
  };

  // 9. Emergency Panic Wipe Handler
  const handlePanicWipe = async () => {
    try {
      // 1. Notify live room if connected
      if (activeRoom) {
        fetch(`/api/rooms/${encodeURIComponent(activeRoom.id)}/panic-wipe`, {
          method: "POST",
        }).catch(() => {});
      }

      // 2. Shred in-memory data
      shredMemory(directMessages);
      shredMemory(liveRoomMessages);
      sharedSecretCache.current.clear();

      // 3. Clear local storage
      localStorage.clear();
      sessionStorage.clear();

      // 4. Reset state
      setDirectMessages({});
      setLiveRoomMessages([]);
      setBurnedCount(0);
      setActiveRoom(null);

      // 5. Generate fresh identity
      const keyPair = await generateIdentityKeyPair();
      const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
      const fingerprint = await generateKeyFingerprint(publicKeyJwk);

      const freshIdentity: UserIdentity = {
        id: `user-${fingerprint.toLowerCase()}`,
        name: `Operative [${fingerprint}]`,
        color: "emerald",
        keyPair,
        publicKeyJwk,
        fingerprint,
      };
      setIdentity(freshIdentity);

      // Reload fresh simulated contacts
      const loaded = await getOrInitializeSimulatedPeers();
      setContacts(loaded);
      setActiveChannelId(loaded[0].id);
      seedInitialEncryptedMessage(loaded[0], freshIdentity);
    } catch (err) {
      console.error("Panic wipe error:", err);
    }
  };

  // Auth Handler: user logged in or registered
  const handleAuthenticated = (newIdentity: UserIdentity, token: string) => {
    setIdentity(newIdentity);
    setIsAuthModalOpen(false);
    // Seed initial message if needed
    if (contacts[0]) {
      seedInitialEncryptedMessage(contacts[0], newIdentity);
    }
  };

  // Auth Handler: user logged out
  const handleLogout = async () => {
    const token = localStorage.getItem("krypt_auth_token");
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error("Logout error:", e);
      }
    }
    localStorage.removeItem("krypt_auth_token");
    localStorage.removeItem("krypt_auth_username");
    sharedSecretCache.current.clear();

    // Reset to fresh guest identity
    try {
      const keyPair = await generateIdentityKeyPair();
      const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
      const fingerprint = await generateKeyFingerprint(publicKeyJwk);

      const guestIdentity: UserIdentity = {
        id: `user-${fingerprint.toLowerCase()}`,
        name: `Operative [${fingerprint}]`,
        color: "emerald",
        keyPair,
        publicKeyJwk,
        fingerprint,
        isRegistered: false,
      };
      setIdentity(guestIdentity);
      setIsProfileModalOpen(false);
      setAuthModalMode("login");
      setIsAuthModalOpen(true);
    } catch (e) {
      console.error("Failed to reset identity on logout:", e);
    }
  };

  // Directory Handler: Start direct chat with another registered user
  const handleStartChatWithUser = async (user: {
    id: string;
    username?: string;
    displayName: string;
    phoneNumber?: string;
    publicKeyJwk: string;
    fingerprint: string;
  }) => {
    const contactId = user.username ? `peer-reg-${user.username}` : `peer-phone-${user.id}`;
    
    // Check if contact is already in contacts list
    const existingIndex = contacts.findIndex((c) => c.id === contactId);
    if (existingIndex === -1) {
      const newContact: Contact = {
        id: contactId,
        name: `${user.displayName}`,
        avatarColor: "emerald",
        roleDescription: `${user.phoneNumber ? user.phoneNumber + " • " : ""}${user.username ? "@" + user.username + " • " : ""}FP: ${user.fingerprint}`,
        phoneNumber: user.phoneNumber,
        publicKeyJwk: user.publicKeyJwk,
        fingerprint: user.fingerprint,
        isSimulated: false,
        isOnline: true,
        safetyNumberVerified: false,
        unreadCount: 0,
        lastMessageText: "Encrypted channel initialized",
        lastMessageTime: Date.now(),
      };
      setContacts((prev) => [newContact, ...prev]);
    }

    setActiveChannelId(contactId);

    // Derive shared secret
    if (identity?.keyPair) {
      try {
        const peerKey = await importPublicKeyJwk(user.publicKeyJwk);
        const secret = await deriveSharedSecret(identity.keyPair.privateKey, peerKey);
        sharedSecretCache.current.set(contactId, secret);
      } catch (e) {
        console.error("Failed to derive secret for registered user:", e);
      }
    }
  };

  // Start Direct E2EE Chat by Phone Number
  const handleInitiatePhoneChat = async (phoneNumber: string, name?: string) => {
    // Check if contact with this phone number already exists
    const cleanPhone = phoneNumber.trim();
    const existing = contacts.find((c) => c.phoneNumber === cleanPhone);
    if (existing) {
      setActiveChannelId(existing.id);
      return;
    }

    // Generate ephemeral P-256 keys for this phone contact
    const peerKeyPair = await generateIdentityKeyPair();
    const peerJwk = await exportPublicKeyJwk(peerKeyPair.publicKey);
    const fingerprint = await generateKeyFingerprint(peerJwk);
    const contactId = `peer-phone-${Date.now()}`;

    const newContact: Contact = {
      id: contactId,
      name: name || `Contact ${cleanPhone}`,
      avatarColor: "cyan",
      phoneNumber: cleanPhone,
      roleDescription: `${cleanPhone} • E2EE Direct Relay`,
      publicKeyJwk: peerJwk,
      fingerprint,
      isSimulated: true,
      isOnline: true,
      safetyNumberVerified: false,
      unreadCount: 0,
      lastMessageText: "Channel created via Global Phone Number Search",
      lastMessageTime: Date.now(),
    };

    setContacts((prev) => [newContact, ...prev]);
    setActiveChannelId(contactId);

    if (identity?.keyPair) {
      const secret = await deriveSharedSecret(identity.keyPair.privateKey, peerKeyPair.publicKey);
      sharedSecretCache.current.set(contactId, secret);
    }
  };

  // Determine active contact and message thread
  const currentActiveContact = contacts.find((c) => c.id === activeChannelId);
  const activeMessages =
    activeChannelId === "live-relay-room"
      ? liveRoomMessages
      : currentActiveContact
      ? directMessages[currentActiveContact.id] || []
      : [];

  const activeChannelName =
    activeChannelId === "live-relay-room"
      ? activeRoom?.name || "Live Relay Room"
      : currentActiveContact?.name || "Encrypted Peer";

  const activeChannelFingerprint =
    activeChannelId === "live-relay-room"
      ? `PEERS: ${liveRoomPeerCount}`
      : currentActiveContact?.fingerprint || "E2EE-ACTIVE";

  if (!identity) {
    return (
      <div className="h-screen w-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white font-mono gap-3">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-sm bg-white text-black font-black text-xl shadow-2xl">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>
        <div className="text-base font-black tracking-widest text-white uppercase mt-2">
          INITIALIZING WEBCRYPTO P-256 ENCLAVE...
        </div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">CREATING NON-EXTRACTABLE ASYMMETRIC IDENTITY KEYS</p>
      </div>
    );
  }

  return (
    <div
      id="ghosttext-app-root"
      className="h-screen w-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden font-sans select-none"
    >
      {/* Top Navbar & Security Controls */}
      <Navbar
        userIdentity={identity}
        activePeerName={activeChannelName}
        activePeerFingerprint={activeChannelFingerprint}
        isLiveRoom={activeChannelId === "live-relay-room"}
        globalEphemeral={globalEphemeral}
        globalDuration={globalDuration}
        onSelectEphemeral={(type, dur) => {
          setGlobalEphemeral(type);
          setGlobalDuration(dur);
        }}
        onOpenSafetyNumber={() => handleOpenSafetyNumber()}
        onOpenInspector={() => {
          // Open inspector for latest message or general connection
          const lastMsg = activeMessages[activeMessages.length - 1];
          if (lastMsg) {
            setActiveAuditData({
              messageId: lastMsg.id,
              algorithm: "AES-GCM (Galois/Counter Mode)",
              keyLength: 256,
              ivHex: lastMsg.iv,
              ciphertextBase64: lastMsg.ciphertext,
              ciphertextLengthBytes: Math.round(lastMsg.ciphertext.length * 0.75),
              senderFingerprint: lastMsg.senderName,
              recipientFingerprint: identity.name,
              ephemeralMode: lastMsg.ephemeralType,
              timestamp: new Date(lastMsg.createdAt).toLocaleTimeString(),
            });
          } else {
            setActiveAuditData({
              messageId: "session-handshake",
              algorithm: "ECDH P-256 Key Agreement / AES-GCM 256",
              keyLength: 256,
              ivHex: "96-bit randomized cryptographic IV per payload",
              ciphertextBase64: "ENCRYPTED_BLOB_READY",
              ciphertextLengthBytes: 256,
              senderFingerprint: identity.fingerprint,
              recipientFingerprint: activeChannelFingerprint,
              ephemeralMode: globalEphemeral,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }}
        onOpenLiveRoom={() => setIsLiveRoomModalOpen(true)}
        onOpenPanicWipe={() => setIsPanicWipeOpen(true)}
        privacyVeilActive={privacyVeilActive}
        onTogglePrivacyVeil={() => setPrivacyVeilActive(!privacyVeilActive)}
        burnedCount={burnedCount}
        onOpenAuth={() => {
          setAuthModalMode("login");
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenDirectory={() => setIsDirectoryModalOpen(true)}
        onOpenPhoneSearch={() => setIsDirectoryModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentTheme={settings.theme}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ContactSidebar
          contacts={contacts}
          activeContactId={activeChannelId}
          onSelectContact={(id) => setActiveChannelId(id)}
          activeRoom={activeRoom}
          onSelectLiveRoom={() => setActiveChannelId("live-relay-room")}
          onOpenNewLiveRoom={() => setIsLiveRoomModalOpen(true)}
          userIdentity={identity}
          onOpenSafetyNumber={(c) => handleOpenSafetyNumber(c)}
          liveRoomPeerCount={liveRoomPeerCount}
          onOpenAuth={() => {
            setAuthModalMode("login");
            setIsAuthModalOpen(true);
          }}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenDirectory={() => setIsDirectoryModalOpen(true)}
        />

        {/* Chat Main View */}
        <main
          id="ghosttext-chat-viewport"
          className="flex-1 flex flex-col bg-[#0A0A0A] relative overflow-hidden"
        >
          {/* Chat Channel Subheader */}
          <div className="px-6 py-4 bg-[#0F0F0F] border-b border-white/10 flex items-center justify-between z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-sm flex items-center justify-center font-black text-base text-black shadow-md ${
                    activeChannelId === "live-relay-room"
                      ? "bg-green-400 text-black"
                      : "bg-white text-black"
                  }`}
                >
                  {activeChannelId === "live-relay-room" ? (
                    <Radio className="w-5 h-5 text-black" />
                  ) : (
                    currentActiveContact?.name.charAt(0) || "P"
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-base tracking-tight text-white uppercase truncate font-sans">
                    {activeChannelName}
                  </h1>
                  {activeChannelId !== "live-relay-room" && currentActiveContact?.safetyNumberVerified && (
                    <span
                      onClick={() => handleOpenSafetyNumber()}
                      className="cursor-pointer text-[10px] font-mono font-bold uppercase text-green-400 bg-[#141414] border border-green-500/40 px-2 py-0.5 rounded-sm flex items-center gap-1 hover:bg-green-950"
                      title="Safety Numbers Verified"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>VERIFIED</span>
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono uppercase text-zinc-500 truncate mt-0.5">
                  {activeChannelId === "live-relay-room"
                    ? "MULTI-USER ZERO-KNOWLEDGE EPHEMERAL RELAY"
                    : currentActiveContact?.roleDescription || "ECDH P-256 E2EE CHANNEL"}
                </p>
              </div>
            </div>

            {/* Right Action buttons for active chat */}
            <div className="flex items-center gap-2">
              {activeChannelId === "live-relay-room" && (
                <button
                  id="btn-share-room-link-header"
                  onClick={() => setIsLiveRoomModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-[#141414] border border-white/20 text-white hover:bg-white/10 font-mono font-bold uppercase transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">INVITE / ROOM INFO</span>
                </button>
              )}

              {activeChannelId !== "live-relay-room" && (
                <>
                  <button
                    id="btn-header-audio-call"
                    onClick={() => handleStartCall("audio")}
                    title="Start E2EE Encrypted Voice Call"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors font-mono font-bold uppercase cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-green-400" />
                    <span className="hidden md:inline">AUDIO CALL</span>
                  </button>

                  <button
                    id="btn-header-video-call"
                    onClick={() => handleStartCall("video")}
                    title="Start E2EE Encrypted Video Call"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors font-mono font-bold uppercase cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden md:inline">VIDEO CALL</span>
                  </button>

                  <button
                    id="btn-verify-active-contact"
                    onClick={() => handleOpenSafetyNumber()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 transition-colors font-mono font-bold uppercase"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">SAFETY CODE</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages Stream Viewport */}
          <div
            id="ghosttext-messages-stream"
            className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-2 bg-[#0A0A0A]"
          >
            {/* Zero-Knowledge Security Notice Card */}
            <div className="max-w-xl mx-auto my-4 p-4 rounded-sm bg-[#0F0F0F] border border-white/10 text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-black text-green-400 font-mono uppercase tracking-widest">
                <Lock className="w-3.5 h-3.5" />
                <span>END-TO-END ENCRYPTED SESSION ACTIVE</span>
              </div>
              <p className="text-xs font-mono uppercase text-zinc-500 leading-relaxed">
                MESSAGES AND ATTACHMENTS ARE ENCRYPTED WITH AES-GCM 256-BIT ON-DEVICE BEFORE TRANSMISSION. EPHEMERAL DISPATCHES SHRED AUTOMATICALLY FROM MEMORY.
              </p>
            </div>

            {/* Message List Grouped by Day Headers */}
            {activeMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
              const isNewDay = !prevMsg || getDayHeaderKey(msg.createdAt) !== getDayHeaderKey(prevMsg.createdAt);
              const dayLabel = isNewDay ? formatDayHeaderLabel(msg.createdAt) : undefined;

              return (
                <React.Fragment key={msg.id}>
                  {isNewDay && (
                    <div
                      id={`day-header-${getDayHeaderKey(msg.createdAt)}`}
                      className="flex items-center justify-center my-6 gap-3 select-none"
                    >
                      <div className="flex-1 h-px bg-white/10" />
                      <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-sm bg-[#121212] border border-white/20 text-zinc-400 font-mono text-[11px] font-bold uppercase tracking-wider shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-green-400" />
                        <span>{dayLabel}</span>
                      </div>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}

                  <MessageItem
                    message={msg}
                    userIdentity={identity}
                    dayHeaderLabel={dayLabel}
                    onBurnMessage={handleBurnSingleMessage}
                    onRevealBurnOnRead={handleRevealBurnOnRead}
                    onOpenInspector={(audit) => setActiveAuditData(audit)}
                    onOpenViewOnceModal={(m) => setViewOnceMessage(m)}
                    onToggleReaction={handleToggleReaction}
                  />
                </React.Fragment>
              );
            })}

            {/* Peer Typing Indicator */}
            {peerTyping && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-green-400 py-2 animate-pulse">
                <span className="w-2 h-2 rounded-xs bg-green-400"></span>
                <span>{activeChannelName} IS COMPOSING ENCRYPTED DISPATCH...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            currentEphemeralType={globalEphemeral}
            currentDuration={globalDuration}
            onSelectEphemeral={(type, dur) => {
              setGlobalEphemeral(type);
              setGlobalDuration(dur);
            }}
            isSimulatedTarget={activeChannelId !== "live-relay-room"}
            targetName={activeChannelName}
          />
        </main>
      </div>

      {/* Modals & Overlays */}
      <E2EEInspectorModal
        auditData={activeAuditData}
        onClose={() => setActiveAuditData(null)}
      />

      <SafetyNumberModal
        contact={safetyModalContact}
        userIdentity={identity}
        safetyNumber={safetyNumberCode}
        onToggleVerified={handleToggleVerified}
        onClose={() => setSafetyModalContact(null)}
      />

      {isLiveRoomModalOpen && (
        <LiveRoomModal
          currentRoom={activeRoom}
          userIdentity={identity}
          onJoinRoom={(roomId, pass) => joinLiveRoom(roomId, pass)}
          onClose={() => setIsLiveRoomModalOpen(false)}
        />
      )}

      <PanicWipeModal
        isOpen={isPanicWipeOpen}
        onConfirmWipe={handlePanicWipe}
        onClose={() => setIsPanicWipeOpen(false)}
      />

      <ViewOnceModal
        message={viewOnceMessage}
        onClose={(msgId) => {
          handleBurnSingleMessage(msgId);
          setViewOnceMessage(null);
        }}
      />

      <PrivacyVeilOverlay
        isActive={privacyVeilActive}
        onDeactivate={() => setPrivacyVeilActive(false)}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        initialMode={authModalMode}
      />

      {/* Account Profile & Vault Modal */}
      <AccountProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        identity={identity}
        onLogout={handleLogout}
        onSwitchAccount={() => {
          setAuthModalMode("login");
          setIsAuthModalOpen(true);
        }}
      />

      {/* Operative Directory / Peer Search Modal */}
      <UserDirectoryModal
        isOpen={isDirectoryModalOpen}
        onClose={() => setIsDirectoryModalOpen(false)}
        onStartChatWithUser={handleStartChatWithUser}
        onInitiatePhoneChat={handleInitiatePhoneChat}
        currentUser={identity}
      />

      {/* User Settings, High-Contrast Themes & Audio Alerts Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        identity={identity}
        onUpdatePhoneNumber={handleUpdatePhoneNumber}
      />

      {/* Encrypted Video / Voice Call Modal */}
      <VideoCallModal
        session={callSession}
        onEndCall={handleEndCall}
        onAcceptCall={handleAcceptCall}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
      />
    </div>
  );
}
