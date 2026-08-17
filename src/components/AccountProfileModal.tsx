import React, { useState } from "react";
import {
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  Copy,
  Check,
  LogOut,
  X,
  Fingerprint,
  Sparkles,
  Shield,
  Activity,
  Phone,
  Palette,
} from "lucide-react";
import { UserIdentity } from "../types";

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: UserIdentity;
  onLogout: () => void;
  onSwitchAccount: () => void;
  onOpenSettings?: () => void;
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
  identity,
  onLogout,
  onSwitchAccount,
  onOpenSettings,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(identity.publicKeyJwk);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(identity.fingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  return (
    <div
      id="modal-account-profile-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in font-sans select-none overflow-y-auto"
    >
      <div className="relative max-w-lg w-full bg-[#0F0F0F] border border-white/20 rounded-sm shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-white text-black flex items-center justify-center font-black">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                OPERATIVE PROFILE & VAULT
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                AUTHENTICATED CRYPTOGRAPHIC IDENTITY
              </p>
            </div>
          </div>

          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Identity Card */}
          <div className="p-4 rounded-sm bg-black border border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl text-white">
                  {identity.username ? identity.username.slice(0, 2).toUpperCase() : "OP"}
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {identity.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-green-400 uppercase font-bold">
                      {identity.username ? `@${identity.username}` : "ANONYMOUS GUEST"}
                    </span>
                    {identity.phoneNumber && (
                      <span className="text-[10px] font-mono bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded-xs flex items-center gap-1 font-bold">
                        <Phone className="w-2.5 h-2.5 text-green-400" />
                        {identity.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-sm bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>{identity.isRegistered ? "AUTHENTICATED" : "GUEST"}</span>
              </div>
            </div>

            {/* Cryptographic Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-sm bg-[#141414] border border-white/10 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">ENCLAVE KEY FINGERPRINT</div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-white tracking-widest">{identity.fingerprint}</span>
                  <button
                    onClick={handleCopyFingerprint}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                    title="Copy fingerprint"
                  >
                    {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-sm bg-[#141414] border border-white/10 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">VAULT CIPHER & DERIVATION</div>
                <div className="font-bold text-white uppercase truncate">PBKDF2 (100K) + AES-GCM</div>
              </div>
            </div>
          </div>

          {/* Cryptographic Public Key JWK (Wire-Safe) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase font-black tracking-widest text-zinc-400">
              <span>PUBLIC KEY (ECDH P-256 JWK)</span>
              <button
                id="btn-profile-copy-pubkey"
                onClick={handleCopyKey}
                className="flex items-center gap-1 text-white hover:underline cursor-pointer"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPY JWK</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-black border border-white/15 rounded-sm font-mono text-[11px] text-zinc-300 break-all max-h-24 overflow-y-auto leading-relaxed">
              {identity.publicKeyJwk}
            </div>
          </div>

          {/* Security Summary Box */}
          <div className="p-3 rounded-sm bg-[#141414] border border-white/10 text-xs font-mono text-zinc-400 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold uppercase">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>CRYPTOGRAPHIC ATTESTATION</span>
            </div>
            <ul className="space-y-1 text-[11px] text-zinc-400 list-disc list-inside">
              <li>Master passwords are salted with 16-byte random salts and hashed with 100,000 rounds of PBKDF2 SHA-256.</li>
              <li>ECDH P-256 private keys are stored in encrypted client-side vaults protected by AES-GCM 256-bit encryption.</li>
              <li>Global phone number linkage allows peer discovery with Zero-Knowledge verification.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {onOpenSettings && (
              <button
                id="btn-profile-settings"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="py-2.5 px-3 rounded-sm bg-[#141414] border border-white/20 text-white font-black uppercase text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>SETTINGS</span>
              </button>
            )}

            <button
              id="btn-profile-switch-account"
              onClick={() => {
                onClose();
                onSwitchAccount();
              }}
              className="py-2.5 px-3 rounded-sm bg-[#141414] border border-white/20 text-white font-black uppercase text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>SWITCH USER</span>
            </button>

            <button
              id="btn-profile-logout"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="py-2.5 px-3 rounded-sm bg-red-600/20 border border-red-500/50 text-red-400 font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOG OUT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

