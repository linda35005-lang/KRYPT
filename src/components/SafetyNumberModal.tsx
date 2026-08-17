import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Check,
  Copy,
  X,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Contact, UserIdentity } from "../types";

interface SafetyNumberModalProps {
  contact: Contact | null;
  userIdentity: UserIdentity;
  safetyNumber: string;
  onToggleVerified: (contactId: string, verified: boolean) => void;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  contact,
  userIdentity,
  safetyNumber,
  onToggleVerified,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!contact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate visual pixel matrix from safety number digits for visual comparison
  const matrixCells: boolean[] = [];
  const cleanDigits = safetyNumber.replace(/[^0-9]/g, "");
  for (let i = 0; i < 64; i++) {
    const char = cleanDigits.charCodeAt(i % cleanDigits.length) || 48;
    matrixCells.push((char + i * 7) % 2 === 0);
  }

  return (
    <div
      id="modal-safety-numbers"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-[#0F0F0F] border border-white/20 rounded-sm max-w-md w-full shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-white text-black font-black">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white uppercase tracking-tight font-sans">
                VERIFY SAFETY NUMBERS
              </h3>
              <p className="text-xs text-zinc-400 font-mono uppercase">
                ECDH END-TO-END CRYPTOGRAPHIC HANDSHAKE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center">
          <p className="text-xs font-mono uppercase text-zinc-400 leading-relaxed">
            COMPARE THIS SAFETY NUMBER WITH <span className="font-black text-white">{contact.name}</span> IN PERSON OR VIA SECURE CHANNEL TO VERIFY ZERO INTERCEPTION.
          </p>

          {/* Visual Security Matrix */}
          <div className="flex justify-center my-2">
            <div className="p-3 bg-white rounded-xs shadow-inner inline-block">
              <div className="grid grid-cols-8 gap-0.5 w-32 h-32">
                {matrixCells.map((isDark, idx) => (
                  <div
                    key={idx}
                    className={`w-full h-full ${
                      isDark ? "bg-black" : "bg-zinc-200"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* 12-digit formatted safety number */}
          <div className="p-4 bg-black rounded-sm border border-white/15 space-y-2">
            <div className="text-lg sm:text-xl font-mono font-bold tracking-widest text-green-400 select-all">
              {safetyNumber || "8492 - 1049 - 5832"}
            </div>
            <button
              id="btn-copy-safety-number"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#141414] border border-white/20 hover:bg-white/10 text-white text-xs font-mono font-bold uppercase transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? "COPIED TO CLIPBOARD" : "COPY SAFETY NUMBER"}</span>
            </button>
          </div>

          {/* Fingerprint chips */}
          <div className="grid grid-cols-2 gap-2 text-left text-xs font-mono">
            <div className="p-3 rounded-sm bg-[#141414] border border-white/10">
              <span className="text-[10px] text-zinc-500 uppercase font-black block">YOUR KEY FP</span>
              <span className="text-white font-bold block mt-1">{userIdentity.fingerprint}</span>
            </div>
            <div className="p-3 rounded-sm bg-[#141414] border border-white/10">
              <span className="text-[10px] text-zinc-500 uppercase font-black block">PEER KEY FP</span>
              <span className="text-green-400 font-bold block mt-1">{contact.fingerprint}</span>
            </div>
          </div>

          {/* Verification status toggle */}
          <div className="pt-2">
            <button
              id="btn-toggle-safety-verified"
              onClick={() => onToggleVerified(contact.id, !contact.safetyNumberVerified)}
              className={`w-full py-3 px-4 rounded-sm font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                contact.safetyNumberVerified
                  ? "bg-[#141414] text-green-400 border border-green-500/50 hover:bg-green-950/40"
                  : "bg-white hover:bg-zinc-200 text-black"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {contact.safetyNumberVerified
                  ? "VERIFIED IDENTITIES (CLICK TO REVOKE)"
                  : "MARK SAFETY NUMBERS AS VERIFIED"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

