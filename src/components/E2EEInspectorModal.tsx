import React, { useState } from "react";
import {
  ShieldCheck,
  Key,
  Binary,
  Lock,
  Copy,
  Check,
  X,
  FileCode,
  Sparkles,
  Server,
  Layers,
} from "lucide-react";
import { CipherAuditData } from "../types";

interface E2EEInspectorModalProps {
  auditData: CipherAuditData | null;
  onClose: () => void;
}

export const E2EEInspectorModal: React.FC<E2EEInspectorModalProps> = ({
  auditData,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!auditData) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      id="modal-e2ee-inspector"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#0F0F0F] border border-white/20 rounded-sm max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-white text-black font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white uppercase tracking-tight font-sans">
                CRYPTOGRAPHIC PACKET INSPECTOR
              </h3>
              <p className="text-xs text-zinc-400 font-mono uppercase">
                END-TO-END ENCRYPTION AUDIT & ZERO-KNOWLEDGE VERIFICATION
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono">
          {/* Zero-Knowledge Architecture Summary */}
          <div className="p-4 rounded-sm bg-[#141414] border border-green-500/40 flex items-start gap-3">
            <Server className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black text-green-400 uppercase tracking-wide">
                ZERO-KNOWLEDGE VERIFICATION
              </span>
              <p className="text-zinc-300 font-sans text-xs uppercase leading-relaxed">
                The payload below represents the exact bytes transmitted over the network relay.
                The server and any intermediary routers see only this encrypted ciphertext.
                Decryption occurs strictly client-side using non-extractable Web Crypto API keys.
              </p>
            </div>
          </div>

          {/* Cryptographic Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-sm bg-[#141414] border border-white/10">
              <span className="text-[10px] text-zinc-500 uppercase font-black block">CIPHER ALGORITHM</span>
              <span className="text-white font-bold text-xs mt-1 block">{auditData.algorithm}</span>
            </div>
            <div className="p-3 rounded-sm bg-[#141414] border border-white/10">
              <span className="text-[10px] text-zinc-500 uppercase font-black block">KEY STRENGTH</span>
              <span className="text-green-400 font-bold text-xs mt-1 block">{auditData.keyLength}-BIT SYMMETRIC</span>
            </div>
            <div className="p-3 rounded-sm bg-[#141414] border border-white/10">
              <span className="text-[10px] text-zinc-500 uppercase font-black block">EPHEMERAL POLICY</span>
              <span className="text-amber-400 font-bold text-xs mt-1 block">{auditData.ephemeralMode}</span>
            </div>
          </div>

          {/* Initialization Vector (IV / Nonce) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 uppercase text-[10px] font-black tracking-wider">
                96-BIT INITIALIZATION VECTOR (IV HEX)
              </span>
              <button
                onClick={() => copyToClipboard(auditData.ivHex, "iv")}
                className="text-white hover:text-green-400 flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                {copiedField === "iv" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "iv" ? "COPIED" : "COPY HEX"}</span>
              </button>
            </div>
            <div className="p-3 rounded-sm bg-black border border-white/15 text-green-400 break-all select-all font-mono text-[11px]">
              {auditData.ivHex}
            </div>
          </div>

          {/* Base64 Ciphertext */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 uppercase text-[10px] font-black tracking-wider">
                AES-GCM CIPHERTEXT PAYLOAD ({auditData.ciphertextLengthBytes} BYTES)
              </span>
              <button
                onClick={() => copyToClipboard(auditData.ciphertextBase64, "ciphertext")}
                className="text-white hover:text-green-400 flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                {copiedField === "ciphertext" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "ciphertext" ? "COPIED" : "COPY BASE64"}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-sm bg-black border border-white/15 text-zinc-300 break-all select-all font-mono text-[11px] max-h-36 overflow-y-auto leading-relaxed">
              {auditData.ciphertextBase64}
            </div>
          </div>

          {/* Key Exchange provenance */}
          <div className="p-3.5 rounded-sm bg-[#141414] border border-white/10 space-y-2">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">KEY AGREEMENT HANDSHAKE</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">ASYMMETRIC CURVE:</span>
              <span className="text-white font-mono font-bold">NIST P-256 (SECP256R1)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">AUTHENTICATION TAG:</span>
              <span className="text-green-400 font-mono font-bold">128-BIT GALOIS MAC</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">KEY STORAGE IN BROWSER:</span>
              <span className="text-zinc-300 font-mono font-bold">NON-EXTRACTABLE CRYPTOKEY RAM</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141414] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-sm bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            CLOSE AUDITOR
          </button>
        </div>
      </div>
    </div>
  );
};
