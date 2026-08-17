export type EphemeralType = "off" | "burn_on_read" | "timed" | "view_once";

export interface DecryptedContent {
  text?: string;
  mediaType?: "text" | "image" | "audio" | "video";
  mediaData?: string; // base64 data url
  audioDuration?: number;
  videoDuration?: number;
  videoThumbnail?: string;
  fileName?: string;
  fileSize?: string;
}

export interface ReactionEntry {
  userId: string;
  userName: string;
}

export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderPublicKey: string; // JWK string
  ciphertext: string; // Base64
  iv: string; // Base64
  ephemeralType: EphemeralType;
  ephemeralDuration?: number; // in seconds (e.g. 10, 30, 60, 300)
  createdAt: number;
  expiresAt?: number;
  mediaType: "text" | "image" | "audio" | "video";
  reactions?: Record<string, ReactionEntry[]>;
  
  // Local state properties (never sent over wire)
  decrypted?: DecryptedContent;
  isRevealed?: boolean;
  revealedAt?: number;
  isBurned?: boolean;
  burnRemainingSec?: number;
  viewOnceOpened?: boolean;
  decryptError?: boolean;
}

export type AppTheme =
  | "stealth-dark"
  | "terminal-green"
  | "monochrome"
  | "amber-crt"
  | "cyber-cyan";

export type SoundType =
  | "stealth-sonar"
  | "crypto-chirp"
  | "quantum-pulse"
  | "minimal-click";

export interface UserSettings {
  theme: AppTheme;
  highContrastMode: boolean;
  monospaceMode: boolean;
  scanlines: boolean;
  soundAlerts: boolean;
  soundType: SoundType;
  soundVolume: number; // 0 to 100
}

export interface PrivateKeyVault {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  phoneNumber?: string;
  publicKeyJwk: string;
  encryptedPrivateKeyVault: string; // JSON string of PrivateKeyVault
  fingerprint: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface UserIdentity {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  color: string;
  keyPair?: CryptoKeyPair;
  publicKeyJwk: string;
  fingerprint: string;
  isRegistered?: boolean;
  token?: string;
}

export interface Contact {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  avatarColor: string;
  roleDescription: string;
  publicKeyJwk: string;
  fingerprint: string;
  isSimulated: boolean;
  isOnline: boolean;
  safetyNumberVerified: boolean;
  unreadCount: number;
  lastMessageText?: string;
  lastMessageTime?: number;
  customSharedSecret?: CryptoKey;
}

export interface RoomInfo {
  id: string;
  name: string;
  isLive: boolean;
  peerCount: number;
  passphrase?: string;
  lastActivity: number;
}

export interface CipherAuditData {
  messageId: string;
  algorithm: string;
  keyLength: number;
  ivHex: string;
  ciphertextBase64: string;
  ciphertextLengthBytes: number;
  senderFingerprint: string;
  recipientFingerprint: string;
  ephemeralMode: string;
  timestamp: string;
}

export type CallStatus = "idle" | "dialing" | "ringing" | "connected" | "ended";
export type CallType = "audio" | "video";

export interface ActiveCallSession {
  id: string;
  peerId: string;
  peerName: string;
  peerFingerprint: string;
  peerAvatarColor?: string;
  type: CallType;
  status: CallStatus;
  isIncoming: boolean;
  startedAt?: number;
  connectedAt?: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  encryptionCipher: string;
  quality: "HD 1080p (E2EE)" | "HD 720p (E2EE)" | "STEREO OPUS 48kHz";
}
