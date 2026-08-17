import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface StoredUser {
  id: string;
  username: string; // lowercase
  displayName: string;
  phoneNumber?: string;
  salt: string; // 16 bytes hex
  passwordHash: string; // PBKDF2 100k rounds SHA256 hex
  publicKeyJwk: string;
  encryptedPrivateKeyVault: string; // JSON string with ciphertext, iv, salt
  fingerprint: string;
  createdAt: number;
  lastLoginAt: number;
}

interface UserSession {
  token: string;
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

interface FailedLoginTracker {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// Helper to normalize phone numbers (e.g. "+1 (555) 019-2834" -> "+15550192834" or digits)
function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function getPhoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

// In-memory repositories (host-proof zero-knowledge storage)
const usersByUsername = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();
const activeSessions = new Map<string, UserSession>();
const failedLoginAttempts = new Map<string, FailedLoginTracker>();

// Cryptographic Password Hashing helper (PBKDF2 SHA-256 100,000 iterations)
function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
}

// Safe constant-time hash comparison to eliminate timing side-channel attacks
function verifyPassword(password: string, saltHex: string, expectedHashHex: string): boolean {
  const computedHashHex = hashPassword(password, saltHex);
  const computedBuffer = Buffer.from(computedHashHex, "hex");
  const expectedBuffer = Buffer.from(expectedHashHex, "hex");
  if (computedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
}

// Seed demo international operative accounts with global phone numbers
(() => {
  const seedList = [
    {
      id: "usr_operative_01",
      username: "operative",
      displayName: "Agent Zero",
      phoneNumber: "+1 (202) 555-0199",
      fingerprint: "A9F1-38E4",
      x: "sample_x_coord_for_demo_operative_01_secure_key",
      y: "sample_y_coord_for_demo_operative_01_secure_key",
    },
    {
      id: "usr_alice_02",
      username: "alice_vance",
      displayName: "Dr. Alice Vance (US)",
      phoneNumber: "+1 (415) 555-0142",
      fingerprint: "4C8B-E92A",
      x: "sample_x_coord_for_alice_vance_02_secure_key",
      y: "sample_y_coord_for_alice_vance_02_secure_key",
    },
    {
      id: "usr_marcus_03",
      username: "marcus_stone",
      displayName: "Cmdr. Marcus Stone (UK)",
      phoneNumber: "+44 20 7946 0912",
      fingerprint: "77F0-18D3",
      x: "sample_x_coord_for_marcus_stone_03_secure_key",
      y: "sample_y_coord_for_marcus_stone_03_secure_key",
    },
    {
      id: "usr_elena_04",
      username: "elena_rostova",
      displayName: "Elena Rostova (CH)",
      phoneNumber: "+41 22 739 8110",
      fingerprint: "3A99-56C1",
      x: "sample_x_coord_for_elena_rostova_04_secure_key",
      y: "sample_y_coord_for_elena_rostova_04_secure_key",
    },
    {
      id: "usr_kenji_05",
      username: "kenji_sato",
      displayName: "Kenji Sato (JP)",
      phoneNumber: "+81 3 5555 0184",
      fingerprint: "8E12-BC90",
      x: "sample_x_coord_for_kenji_sato_05_secure_key",
      y: "sample_y_coord_for_kenji_sato_05_secure_key",
    },
  ];

  for (const item of seedList) {
    const demoSalt = crypto.randomBytes(16).toString("hex");
    const demoHash = hashPassword("Krypt@2026!", demoSalt);
    const demoUser: StoredUser = {
      id: item.id,
      username: item.username,
      displayName: item.displayName,
      phoneNumber: item.phoneNumber,
      salt: demoSalt,
      passwordHash: demoHash,
      publicKeyJwk: JSON.stringify({
        crv: "P-256",
        ext: true,
        key_ops: [],
        kty: "EC",
        x: item.x,
        y: item.y,
      }),
      encryptedPrivateKeyVault: JSON.stringify({
        ciphertext: "demo_encrypted_vault_sample_" + item.username,
        iv: "demo_iv_sample_" + item.username,
        salt: "demo_salt_sample_" + item.username,
      }),
      fingerprint: item.fingerprint,
      createdAt: Date.now() - 86400000 * 2,
      lastLoginAt: Date.now() - 1800000,
    };
    usersByUsername.set(item.username, demoUser);
    usersById.set(demoUser.id, demoUser);
  }
})();

interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderPublicKey: string; // JWK or string representation
  ciphertext: string; // Base64
  iv: string; // Base64 or hex
  ephemeralType: "off" | "burn_on_read" | "timed" | "view_once";
  ephemeralDuration?: number; // seconds
  createdAt: number; // timestamp ms
  expiresAt?: number; // timestamp ms
  mediaType?: "text" | "image" | "audio";
  reactions?: Record<string, { userId: string; userName: string }[]>;
}

interface RoomMember {
  id: string;
  name: string;
  publicKey: string;
  lastSeen: number;
}

interface Room {
  id: string;
  createdAt: number;
  members: Map<string, RoomMember>;
  messages: Map<string, EncryptedMessage>;
  clients: Set<express.Response>;
}

// In-memory zero-knowledge room repository
const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      createdAt: Date.now(),
      members: new Map(),
      messages: new Map(),
      clients: new Set(),
    });
  }
  return rooms.get(roomId)!;
}

// Automatic server-side TTL cleanup job every 2 seconds
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Clean expired messages
    for (const [msgId, msg] of room.messages.entries()) {
      if (msg.expiresAt && msg.expiresAt <= now) {
        room.messages.delete(msgId);
        broadcastToRoom(room, {
          type: "message_burned",
          messageId: msgId,
          reason: "ttl_expired",
        });
      }
    }
    // Clean inactive members (> 60s idle)
    for (const [memberId, member] of room.members.entries()) {
      if (now - member.lastSeen > 60000) {
        room.members.delete(memberId);
        broadcastToRoom(room, {
          type: "member_left",
          memberId,
        });
      }
    }
    // Clean empty rooms if inactive for 10 minutes
    if (room.members.size === 0 && room.messages.size === 0 && now - room.createdAt > 600000) {
      rooms.delete(roomId);
    }
  }
}, 2000);

function broadcastToRoom(room: Room, data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of room.clients) {
    try {
      client.write(payload);
    } catch {
      room.clients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API Routes for Zero-Knowledge Room Relay

  // 1. Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now(), activeRooms: rooms.size, registeredUsers: usersByUsername.size });
  });

  // --- USER AUTHENTICATION & SECURITY ENDPOINTS ---

  // Helper middleware: extract active session user
  const authenticateToken = (req: express.Request): StoredUser | null => {
    const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
    if (!authHeader) return null;
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const session = activeSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) activeSessions.delete(token);
      return null;
    }
    return usersById.get(session.userId) || null;
  };

  // Register New User Identity
  app.post("/api/auth/register", (req, res) => {
    try {
      const {
        username,
        password,
        displayName,
        phoneNumber,
        publicKeyJwk,
        encryptedPrivateKeyVault,
        fingerprint,
      } = req.body;

      if (!username || typeof username !== "string") {
        res.status(400).json({ error: "Username is required." });
        return;
      }

      const normalizedUsername = username.trim().toLowerCase();

      // Username security format check: 3-24 alphanumeric, dash or underscore
      const usernameRegex = /^[a-zA-Z0-9_-]{3,24}$/;
      if (!usernameRegex.test(normalizedUsername)) {
        res.status(400).json({
          error: "Username must be 3-24 characters and only contain letters, numbers, hyphens, or underscores.",
        });
        return;
      }

      // Check unique username constraint
      if (usersByUsername.has(normalizedUsername)) {
        res.status(409).json({ error: `Username @${normalizedUsername} is already registered.` });
        return;
      }

      // Password security policy: minimum 8 characters
      if (!password || typeof password !== "string" || password.length < 8) {
        res.status(400).json({
          error: "Password must be at least 8 characters with high entropy.",
        });
        return;
      }

      // Cryptographic credentials validation
      if (!publicKeyJwk || !encryptedPrivateKeyVault || !fingerprint) {
        res.status(400).json({
          error: "Cryptographic identity payload (P-256 keypair and encrypted vault) is required.",
        });
        return;
      }

      // Generate unique 16-byte cryptographically secure salt
      const saltHex = crypto.randomBytes(16).toString("hex");
      // Hash with PBKDF2 (100,000 rounds of SHA-256)
      const passwordHashHex = hashPassword(password, saltHex);

      const userId = "usr_" + crypto.randomBytes(8).toString("hex");
      const newUser: StoredUser = {
        id: userId,
        username: normalizedUsername,
        displayName: displayName?.trim() || username.trim(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
        salt: saltHex,
        passwordHash: passwordHashHex,
        publicKeyJwk,
        encryptedPrivateKeyVault,
        fingerprint,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      usersByUsername.set(normalizedUsername, newUser);
      usersById.set(userId, newUser);

      // Create authenticated session
      const token = "tok_" + crypto.randomBytes(32).toString("hex");
      activeSessions.set(token, {
        token,
        userId,
        username: normalizedUsername,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 86400000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: "Registration successful. Cryptographic vault sealed.",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName,
          phoneNumber: newUser.phoneNumber,
          publicKeyJwk: newUser.publicKeyJwk,
          encryptedPrivateKeyVault: newUser.encryptedPrivateKeyVault,
          fingerprint: newUser.fingerprint,
          createdAt: newUser.createdAt,
        },
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Internal server error during registration." });
    }
  });

  // Login Existing User Identity
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Both username and master password are required." });
        return;
      }

      const normalizedUsername = username.trim().toLowerCase();

      // Brute-force rate limiting check
      const tracker = failedLoginAttempts.get(normalizedUsername) || {
        count: 0,
        lastAttempt: 0,
      };

      if (tracker.lockedUntil && tracker.lockedUntil > Date.now()) {
        const secondsLeft = Math.ceil((tracker.lockedUntil - Date.now()) / 1000);
        res.status(429).json({
          error: `Authentication rate-limit active. Too many failed attempts. Try again in ${secondsLeft}s.`,
          retryAfterSec: secondsLeft,
        });
        return;
      }

      const user = usersByUsername.get(normalizedUsername);

      // Constant-time password verification to prevent timing attacks
      const isMatch = user ? verifyPassword(password, user.salt, user.passwordHash) : false;

      if (!user || !isMatch) {
        tracker.count += 1;
        tracker.lastAttempt = Date.now();
        if (tracker.count >= 5) {
          tracker.lockedUntil = Date.now() + 30000; // 30s lockout
          tracker.count = 0;
        }
        failedLoginAttempts.set(normalizedUsername, tracker);

        res.status(401).json({
          error: "Invalid username or password.",
          remainingAttempts: Math.max(0, 5 - tracker.count),
        });
        return;
      }

      // Reset failed attempts on valid login
      failedLoginAttempts.delete(normalizedUsername);
      user.lastLoginAt = Date.now();

      // Issue high-entropy session token
      const token = "tok_" + crypto.randomBytes(32).toString("hex");
      activeSessions.set(token, {
        token,
        userId: user.id,
        username: user.username,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 86400000, // 7 days
      });

      res.json({
        success: true,
        message: "Authentication verified. Enclave keys released.",
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          publicKeyJwk: user.publicKeyJwk,
          encryptedPrivateKeyVault: user.encryptedPrivateKeyVault,
          fingerprint: user.fingerprint,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error during login." });
    }
  });

  // Check Current Session Status
  app.get("/api/auth/me", (req, res) => {
    const user = authenticateToken(req);
    if (!user) {
      res.status(401).json({ error: "Session expired or invalid authentication token." });
      return;
    }
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        publicKeyJwk: user.publicKeyJwk,
        encryptedPrivateKeyVault: user.encryptedPrivateKeyVault,
        fingerprint: user.fingerprint,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  });

  // Update Authenticated User Phone Number
  app.post("/api/auth/update-phone", (req, res) => {
    const user = authenticateToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { phoneNumber } = req.body;
    user.phoneNumber = phoneNumber ? phoneNumber.trim() : undefined;
    res.json({
      success: true,
      message: "Phone number updated.",
      phoneNumber: user.phoneNumber,
    });
  });

  // Logout / Invalidate Session Token
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      activeSessions.delete(token);
    }
    res.json({ success: true, message: "Session terminated." });
  });

  // Discover & Search Registered Operatives (Support Name, Username, Fingerprint, & Global Phone Search)
  app.get("/api/users/search", (req, res) => {
    const query = ((req.query.q as string) || "").trim().toLowerCase();
    const queryDigits = getPhoneDigitsOnly(query);
    const currentUser = authenticateToken(req);

    const matches = Array.from(usersByUsername.values())
      .filter((u) => {
        if (currentUser && u.id === currentUser.id) return false;
        if (!query) return true;

        const nameMatch = u.username.includes(query) || u.displayName.toLowerCase().includes(query);
        const fingerprintMatch = u.fingerprint.toLowerCase().includes(query);
        
        let phoneMatch = false;
        if (u.phoneNumber) {
          const userPhoneLower = u.phoneNumber.toLowerCase();
          const userPhoneDigits = getPhoneDigitsOnly(u.phoneNumber);
          phoneMatch =
            userPhoneLower.includes(query) ||
            (queryDigits.length >= 3 && userPhoneDigits.includes(queryDigits));
        }

        return nameMatch || fingerprintMatch || phoneMatch;
      })
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        publicKeyJwk: u.publicKeyJwk,
        fingerprint: u.fingerprint,
        createdAt: u.createdAt,
        isOnline: Date.now() - u.lastLoginAt < 300000,
      }));

    res.json({ users: matches });
  });

  // Dedicated Global Phone Lookup Endpoint
  app.get("/api/users/lookup-phone", (req, res) => {
    const rawPhone = ((req.query.phone as string) || "").trim();
    if (!rawPhone) {
      res.status(400).json({ error: "Phone number query parameter is required." });
      return;
    }

    const searchDigits = getPhoneDigitsOnly(rawPhone);
    const currentUser = authenticateToken(req);

    const match = Array.from(usersByUsername.values()).find((u) => {
      if (currentUser && u.id === currentUser.id) return false;
      if (!u.phoneNumber) return false;
      const uDigits = getPhoneDigitsOnly(u.phoneNumber);
      return uDigits === searchDigits || (searchDigits.length >= 7 && uDigits.endsWith(searchDigits));
    });

    if (match) {
      res.json({
        found: true,
        user: {
          id: match.id,
          username: match.username,
          displayName: match.displayName,
          phoneNumber: match.phoneNumber,
          publicKeyJwk: match.publicKeyJwk,
          fingerprint: match.fingerprint,
          createdAt: match.createdAt,
          isOnline: Date.now() - match.lastLoginAt < 300000,
        },
      });
    } else {
      res.json({
        found: false,
        message: "No registered cryptographic node found with that exact global phone number.",
      });
    }
  });

  // 2. Join or register member in room
  app.post("/api/rooms/:roomId/join", (req, res) => {
    const { roomId } = req.params;
    const { memberId, name, publicKey } = req.body;

    if (!memberId || !publicKey) {
      res.status(400).json({ error: "Missing memberId or publicKey" });
      return;
    }

    const room = getOrCreateRoom(roomId);
    const member: RoomMember = {
      id: memberId,
      name: name || "Anonymous Peer",
      publicKey,
      lastSeen: Date.now(),
    };

    room.members.set(memberId, member);

    // Notify other members
    broadcastToRoom(room, {
      type: "member_joined",
      member,
    });

    res.json({
      success: true,
      members: Array.from(room.members.values()),
      messages: Array.from(room.messages.values()),
    });
  });

  // 3. Keepalive / Heartbeat
  app.post("/api/rooms/:roomId/heartbeat", (req, res) => {
    const { roomId } = req.params;
    const { memberId } = req.body;
    const room = rooms.get(roomId);
    if (room && memberId && room.members.has(memberId)) {
      room.members.get(memberId)!.lastSeen = Date.now();
    }
    res.json({ status: "alive" });
  });

  // 4. Server-Sent Events (SSE) stream for real-time room events
  app.get("/api/rooms/:roomId/events", (req, res) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    room.clients.add(res);

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: "connected", roomId })}\n\n`);

    req.on("close", () => {
      room.clients.delete(res);
    });
  });

  // 5. Send encrypted message (Zero-Knowledge: Server handles only ciphertext)
  app.post("/api/rooms/:roomId/messages", (req, res) => {
    const { roomId } = req.params;
    const {
      id,
      senderId,
      senderName,
      senderPublicKey,
      ciphertext,
      iv,
      ephemeralType,
      ephemeralDuration,
      mediaType,
    } = req.body;

    if (!id || !senderId || !ciphertext || !iv) {
      res.status(400).json({ error: "Invalid encrypted message payload" });
      return;
    }

    const room = getOrCreateRoom(roomId);
    const now = Date.now();
    let expiresAt: number | undefined = undefined;

    if (ephemeralType === "timed" && ephemeralDuration) {
      expiresAt = now + ephemeralDuration * 1000;
    }

    const message: EncryptedMessage = {
      id,
      roomId,
      senderId,
      senderName: senderName || "Peer",
      senderPublicKey,
      ciphertext,
      iv,
      ephemeralType: ephemeralType || "off",
      ephemeralDuration,
      createdAt: now,
      expiresAt,
      mediaType: mediaType || "text",
    };

    room.messages.set(id, message);

    // Broadcast ciphertext to all peers in room
    broadcastToRoom(room, {
      type: "new_message",
      message,
    });

    res.json({ success: true, messageId: id, expiresAt });
  });

  // 6. Burn / Delete message (Burn-on-read or manual shred)
  app.delete("/api/rooms/:roomId/messages/:messageId", (req, res) => {
    const { roomId, messageId } = req.params;
    const room = rooms.get(roomId);
    if (room && room.messages.has(messageId)) {
      room.messages.delete(messageId);
      broadcastToRoom(room, {
        type: "message_burned",
        messageId,
        reason: req.body?.reason || "burn_on_read",
      });
    }
    res.json({ success: true });
  });

  // 7. Ephemeral Typing Indicator
  app.post("/api/rooms/:roomId/typing", (req, res) => {
    const { roomId } = req.params;
    const { memberId, isTyping } = req.body;
    const room = rooms.get(roomId);
    if (room) {
      broadcastToRoom(room, {
        type: "typing",
        memberId,
        isTyping: !!isTyping,
      });
    }
    res.json({ success: true });
  });

  // 7.1 Message Reactions endpoint
  app.post("/api/rooms/:roomId/messages/:messageId/reactions", (req, res) => {
    const { roomId, messageId } = req.params;
    const { emoji, userId, userName } = req.body;

    if (!emoji || !userId) {
      res.status(400).json({ error: "Emoji and userId are required" });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const message = room.messages.get(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    message.reactions = message.reactions || {};
    const currentReactions = message.reactions[emoji] || [];
    const existingIndex = currentReactions.findIndex((r) => r.userId === userId);

    if (existingIndex > -1) {
      // Remove reaction
      currentReactions.splice(existingIndex, 1);
      if (currentReactions.length === 0) {
        delete message.reactions[emoji];
      } else {
        message.reactions[emoji] = currentReactions;
      }
    } else {
      // Add reaction
      currentReactions.push({
        userId,
        userName: userName || "Operative",
      });
      message.reactions[emoji] = currentReactions;
    }

    broadcastToRoom(room, {
      type: "message_reaction",
      messageId,
      reactions: message.reactions,
    });

    res.json({ success: true, reactions: message.reactions });
  });

  // 8. Wipe / Panic Burn Room
  app.post("/api/rooms/:roomId/panic-wipe", (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    if (room) {
      room.messages.clear();
      broadcastToRoom(room, {
        type: "panic_wipe",
        timestamp: Date.now(),
      });
    }
    res.json({ success: true, wiped: true });
  });

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GhostText E2EE Relay Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
