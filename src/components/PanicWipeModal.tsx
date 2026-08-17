import React, { useState } from "react";
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Lock,
  X,
  Sparkles,
} from "lucide-react";

interface PanicWipeModalProps {
  isOpen: boolean;
  onConfirmWipe: () => void;
  onClose: () => void;
}

export const PanicWipeModal: React.FC<PanicWipeModalProps> = ({
  isOpen,
  onConfirmWipe,
  onClose,
}) => {
  const [typedConfirm, setTypedConfirm] = useState("");

  if (!isOpen) return null;

  const handleWipe = () => {
    onConfirmWipe();
    onClose();
  };

  return (
    <div
      id="modal-panic-wipe"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-[#0F0F0F] border-2 border-red-600 rounded-sm max-w-md w-full shadow-2xl overflow-hidden text-white animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-red-900/50 bg-red-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-red-600 text-black font-black">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base text-red-500 uppercase tracking-tight font-sans">
                EMERGENCY PANIC WIPE
              </h3>
              <p className="text-xs text-zinc-400 font-mono uppercase">
                PERMANENT CRYPTOGRAPHIC VAULT VAPORIZATION
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
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-sm bg-black border border-red-500/40 space-y-2">
            <div className="flex items-center gap-2 font-black uppercase text-red-500 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>IRREVERSIBLE DATA DESTRUCTION</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400 font-mono uppercase">
              <li>ZEROES IN-MEMORY ECDH & AES-GCM CRYPTOKEY OBJECTS</li>
              <li>WIPES ALL LOCALSTORAGE & INDEXEDDB VAULTS</li>
              <li>PURGES ALL DECRYPTED CACHES FROM RAM</li>
              <li>GENERATES FRESH EPHEMERAL IDENTITY ON RESTART</li>
              <li>SENDS ZERO-KNOWLEDGE PURGE SIGNAL TO ACTIVE RELAYS</li>
            </ul>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-zinc-400 font-mono text-xs font-bold uppercase">
              TYPE <span className="text-red-500 font-black">NUKE</span> TO AUTHORIZE MEMORY PURGE:
            </label>
            <input
              id="input-panic-confirm"
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value.toUpperCase())}
              placeholder="NUKE"
              className="w-full bg-black border border-red-500/50 rounded-sm px-4 py-3 text-red-500 font-mono font-black text-center tracking-widest text-lg focus:outline-none focus:border-red-400 uppercase"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-sm bg-[#141414] hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider transition-colors border border-white/15"
            >
              CANCEL
            </button>
            <button
              type="button"
              id="btn-confirm-panic-nuke"
              onClick={handleWipe}
              disabled={typedConfirm !== "NUKE"}
              className="px-6 py-2.5 rounded-sm bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>VAPORIZE ALL VAULTS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

