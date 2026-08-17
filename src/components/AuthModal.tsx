import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Shield,
  Fingerprint,
} from "lucide-react";
import {
  validateUsername,
  calculatePasswordStrength,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
} from "../lib/authCrypto";
import {
  generateIdentityKeyPair,
  exportPublicKeyJwk,
  exportPrivateKeyJwk,
  importPrivateKeyJwk,
  importPublicKeyJwk,
  generateKeyFingerprint,
} from "../lib/crypto";
import { UserIdentity } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (identity: UserIdentity, token: string) => void;
  onContinueAsGuest?: () => void;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  onContinueAsGuest,
  initialMode = "register",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Form fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Progress
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  if (!isOpen) return null;

  const usernameValidation = validateUsername(username);
  const passwordStrength = calculatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validations
    if (!usernameValidation.valid) {
      setErrorMessage(usernameValidation.error || "Invalid username");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Generate native WebCrypto ECDH P-256 Keypair
      setLoadingStep("Generating ECDH P-256 cryptographic identity...");
      const keyPair = await generateIdentityKeyPair();
      const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
      const privateKeyJwk = await exportPrivateKeyJwk(keyPair.privateKey);
      const fingerprint = await generateKeyFingerprint(publicKeyJwk);

      // Step 2: Encrypt private key client-side with master password (Host-Proof Zero Knowledge)
      setLoadingStep("Deriving PBKDF2 (100k rounds) key & encrypting vault...");
      const vault = await encryptPrivateKeyWithPassword(privateKeyJwk, password);
      const encryptedPrivateKeyVault = JSON.stringify(vault);

      // Step 3: Register user on server
      setLoadingStep("Registering authenticated account with relay server...");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          displayName: displayName.trim() || username.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          password,
          publicKeyJwk,
          encryptedPrivateKeyVault,
          fingerprint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccessMessage("Vault created successfully! Unlocking enclave...");

      const newIdentity: UserIdentity = {
        id: data.user.id,
        name: data.user.displayName || `@${data.user.username}`,
        username: data.user.username,
        phoneNumber: data.user.phoneNumber,
        color: "emerald",
        keyPair,
        publicKeyJwk,
        fingerprint,
        isRegistered: true,
        token: data.token,
      };

      // Save token in localStorage
      localStorage.setItem("krypt_auth_token", data.token);
      localStorage.setItem("krypt_auth_username", data.user.username);

      setTimeout(() => {
        setIsLoading(false);
        onAuthenticated(newIdentity, data.token);
      }, 600);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setIsLoading(false);
      setErrorMessage(err.message || "Registration failed. Please try again.");
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please enter your username and master password.");
      return;
    }

    setIsLoading(true);

    try {
      setLoadingStep("Verifying master credentials...");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfterSec) {
          setRateLimitSeconds(data.retryAfterSec);
        }
        throw new Error(data.error || "Login failed.");
      }

      setLoadingStep("Decrypting local ECDH cryptographic keypair...");

      // Parse encrypted vault from user record
      const vault = JSON.parse(data.user.encryptedPrivateKeyVault);

      // Decrypt private key with entered password
      let privateKeyJwk: string;
      try {
        privateKeyJwk = await decryptPrivateKeyWithPassword(vault, password);
      } catch (vaultErr) {
        console.error("Vault decryption error:", vaultErr);
        throw new Error("Corrupted key vault or incorrect decryption parameters.");
      }

      // Reconstruct WebCrypto KeyPair
      const privateKey = await importPrivateKeyJwk(privateKeyJwk);
      const publicKey = await importPublicKeyJwk(data.user.publicKeyJwk);

      const keyPair: CryptoKeyPair = {
        publicKey,
        privateKey,
      };

      setSuccessMessage("Authentication verified! Enclave unlocked.");

      const restoredIdentity: UserIdentity = {
        id: data.user.id,
        name: data.user.displayName || `@${data.user.username}`,
        username: data.user.username,
        color: "emerald",
        keyPair,
        publicKeyJwk: data.user.publicKeyJwk,
        fingerprint: data.user.fingerprint,
        isRegistered: true,
        token: data.token,
      };

      // Save token in localStorage
      localStorage.setItem("krypt_auth_token", data.token);
      localStorage.setItem("krypt_auth_username", data.user.username);

      setTimeout(() => {
        setIsLoading(false);
        onAuthenticated(restoredIdentity, data.token);
      }, 600);
    } catch (err: any) {
      console.error("Login error:", err);
      setIsLoading(false);
      setErrorMessage(err.message || "Login failed.");
    }
  };

  return (
    <div
      id="modal-auth-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in font-sans select-none overflow-y-auto"
    >
      <div className="relative max-w-md w-full bg-[#0F0F0F] border border-white/20 rounded-sm shadow-2xl overflow-hidden my-6">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-white text-black flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                  {mode === "register" ? "REGISTER ENCLAVE" : "AUTHENTICATE"}
                </h2>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                HOST-PROOF ZERO-KNOWLEDGE AUTH
              </p>
            </div>
          </div>

          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-white/10 bg-[#0A0A0A]">
          <button
            id="tab-auth-register"
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
            }}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
              mode === "register"
                ? "border-white bg-white/5 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            CREATE ACCOUNT
          </button>
          <button
            id="tab-auth-login"
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
              mode === "login"
                ? "border-white bg-white/5 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            SECURE LOG IN
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-sm flex items-start gap-2.5 text-xs text-red-300 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase">AUTHENTICATION ERROR</div>
                <div>{errorMessage}</div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-950/60 border border-green-500/50 rounded-sm flex items-start gap-2.5 text-xs text-green-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase">SUCCESS</div>
                <div>{successMessage}</div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              <div className="space-y-1">
                <div className="text-sm font-black uppercase text-white font-sans">
                  CRYPTOGRAPHIC OPERATION IN PROGRESS
                </div>
                <div className="text-xs font-mono text-zinc-400 uppercase">{loadingStep}</div>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase max-w-xs">
                PBKDF2 100,000 iterations • AES-GCM 256-bit • ECDH P-256
              </div>
            </div>
          ) : mode === "register" ? (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Unique Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400 flex items-center justify-between">
                  <span>UNIQUE USERNAME</span>
                  <span className="text-zinc-500">3-24 CHARS</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">@</span>
                  <input
                    id="input-register-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="operative_handle"
                    className="w-full bg-[#141414] border border-white/15 rounded-sm pl-8 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase"
                  />
                </div>
                {username && !usernameValidation.valid && (
                  <p className="text-[10px] font-mono text-amber-400">{usernameValidation.error}</p>
                )}
              </div>

              {/* Display Alias */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400">
                  DISPLAY ALIAS (OPTIONAL)
                </label>
                <input
                  id="input-register-displayname"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Agent Phoenix"
                  className="w-full bg-[#141414] border border-white/15 rounded-sm px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white uppercase"
                />
              </div>

              {/* Global Phone Number (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400 flex items-center justify-between">
                  <span>GLOBAL PHONE NUMBER (OPTIONAL)</span>
                  <span className="text-green-400 font-bold">E.164 GLOBAL</span>
                </label>
                <input
                  id="input-register-phone"
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 019-2834 or +44 20 7946 0912"
                  className="w-full bg-[#141414] border border-white/15 rounded-sm px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase font-bold"
                />
              </div>

              {/* Master Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400 flex items-center justify-between">
                  <span>MASTER ENCLAVE PASSWORD</span>
                  <span className="text-zinc-500">MIN 8 CHARS</span>
                </label>
                <div className="relative">
                  <input
                    id="input-register-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#141414] border border-white/15 rounded-sm pl-3 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className="text-zinc-500 uppercase">STRENGTH:</span>
                      <span
                        className={
                          passwordStrength.score >= 3
                            ? "text-green-400"
                            : passwordStrength.score === 2
                            ? "text-amber-400"
                            : "text-red-400"
                        }
                      >
                        {passwordStrength.label} ({passwordStrength.score}/4)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5 bg-[#141414] rounded-xs overflow-hidden">
                      <div
                        className={`h-full ${
                          passwordStrength.score >= 1
                            ? passwordStrength.score >= 3
                              ? "bg-green-500"
                              : "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <div
                        className={`h-full ${
                          passwordStrength.score >= 2
                            ? passwordStrength.score >= 3
                              ? "bg-green-500"
                              : "bg-amber-500"
                            : "bg-zinc-800"
                        }`}
                      ></div>
                      <div
                        className={`h-full ${
                          passwordStrength.score >= 3 ? "bg-green-500" : "bg-zinc-800"
                        }`}
                      ></div>
                      <div
                        className={`h-full ${
                          passwordStrength.score >= 4 ? "bg-green-500" : "bg-zinc-800"
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400">
                  CONFIRM MASTER PASSWORD
                </label>
                <input
                  id="input-register-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#141414] border border-white/15 rounded-sm px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[10px] font-mono text-red-400">Passwords do not match.</p>
                )}
              </div>

              {/* Security Blueprint Notice */}
              <div className="p-3 rounded-sm bg-black border border-white/10 text-[10px] font-mono text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-white font-bold uppercase">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span>ZERO-KNOWLEDGE ARCHITECTURE</span>
                </div>
                <p>
                  Your ECDH P-256 private key is encrypted client-side via PBKDF2 (100,000 rounds) and AES-GCM 256-bit before leaving your browser. The server never sees your plaintext password or private key.
                </p>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-register"
                type="submit"
                disabled={!usernameValidation.valid || password.length < 8 || !passwordsMatch}
                className="w-full py-3 px-4 rounded-sm bg-white text-black font-black uppercase tracking-wider text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>GENERATE VAULT & REGISTER</span>
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400">
                  USERNAME / OPERATIVE HANDLE
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">@</span>
                  <input
                    id="input-login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="operative_handle"
                    className="w-full bg-[#141414] border border-white/15 rounded-sm pl-8 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400">
                  MASTER ENCLAVE PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#141414] border border-white/15 rounded-sm pl-3 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick test credentials hint */}
              <div className="p-2.5 rounded-sm bg-black border border-white/10 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>DEMO ACCOUNT:</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("operative");
                    setPassword("Krypt@2026!");
                  }}
                  className="text-white hover:underline uppercase font-bold"
                >
                  USE @OPERATIVE / Krypt@2026!
                </button>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={!username.trim() || !password}
                className="w-full py-3 px-4 rounded-sm bg-white text-black font-black uppercase tracking-wider text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>AUTHENTICATE & UNLOCK ENCLAVE</span>
              </button>
            </form>
          )}

          {/* Guest fallback option */}
          {onContinueAsGuest && (
            <div className="pt-2 border-t border-white/10 text-center">
              <button
                id="btn-auth-continue-guest"
                type="button"
                onClick={onContinueAsGuest}
                className="text-[11px] font-mono uppercase font-bold text-zinc-400 hover:text-white transition-colors"
              >
                CONTINUE AS ANONYMOUS GUEST (EPHEMERAL SESSION) →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
