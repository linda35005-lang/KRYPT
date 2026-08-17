import React, { useState } from "react";
import {
  Radio,
  Share2,
  Copy,
  Check,
  Key,
  Users,
  ShieldCheck,
  X,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { RoomInfo, UserIdentity } from "../types";

interface LiveRoomModalProps {
  currentRoom: RoomInfo | null;
  userIdentity: UserIdentity;
  onJoinRoom: (roomId: string, passphrase?: string) => void;
  onClose: () => void;
}

export const LiveRoomModal: React.FC<LiveRoomModalProps> = ({
  currentRoom,
  userIdentity,
  onJoinRoom,
  onClose,
}) => {
  const [roomIdInput, setRoomIdInput] = useState(
    currentRoom?.id || `room-ghost-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [passphraseInput, setPassphraseInput] = useState(currentRoom?.passphrase || "");
  const [copiedLink, setCopiedLink] = useState(false);

  const getShareableLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomIdInput);
    return url.toString();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareableLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    onJoinRoom(roomIdInput.trim(), passphraseInput.trim() || undefined);
    onClose();
  };

  return (
    <div
      id="modal-live-room"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-[#0F0F0F] border border-white/20 rounded-sm max-w-lg w-full shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-white text-black font-black">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base text-white uppercase tracking-tight font-sans">
                MULTI-DEVICE LIVE ENCRYPTED ROOM
              </h3>
              <p className="text-xs text-zinc-400 font-mono uppercase">
                ZERO-KNOWLEDGE SERVER-SENT EVENTS (SSE) RELAY
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
        <form onSubmit={handleJoin} className="p-6 space-y-4 text-xs font-sans">
          <div className="p-4 rounded-sm bg-[#141414] border border-green-500/40 text-zinc-300 space-y-1.5">
            <div className="flex items-center gap-2 font-black uppercase text-green-400 text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>REAL CROSS-DEVICE / MULTI-TAB RELAY</span>
            </div>
            <p className="text-xs font-mono uppercase text-zinc-400 leading-relaxed">
              Open the share link in a new incognito window, another browser, or mobile device. Messages are encrypted client-side and relayed through memory with zero persistence.
            </p>
          </div>

          {/* Room ID Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-zinc-300 font-black uppercase text-xs flex items-center justify-between">
              <span>SECURE ROOM CODE / CHANNEL ID</span>
              <button
                type="button"
                onClick={() => setRoomIdInput(`room-ghost-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-xs text-green-400 hover:underline font-mono uppercase font-bold"
              >
                GENERATE NEW CODE
              </button>
            </label>
            <input
              id="input-live-room-code"
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="e.g. room-alpha-992"
              className="w-full bg-black border border-white/20 rounded-sm px-4 py-2.5 text-white font-mono font-bold text-sm uppercase focus:outline-none focus:border-white"
              required
            />
          </div>

          {/* Optional Shared Passphrase */}
          <div className="space-y-1.5 text-left">
            <label className="text-zinc-300 font-black uppercase text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-green-400" />
                <span>SHARED PASSPHRASE (OPTIONAL)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">PBKDF2 100K</span>
            </label>
            <input
              id="input-live-room-passphrase"
              type="password"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              placeholder="OPTIONAL PASSPHRASE"
              className="w-full bg-black border border-white/20 rounded-sm px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-white"
            />
          </div>

          {/* Instant Share Link */}
          <div className="p-4 bg-black rounded-sm border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-white" />
                <span>SHAREABLE INVITE LINK</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-white hover:text-green-400 flex items-center gap-1 font-mono text-xs font-bold uppercase"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedLink ? "LINK COPIED" : "COPY LINK"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-sm bg-[#141414] border border-white/10 font-mono text-xs text-zinc-300 truncate select-all">
              {getShareableLink()}
            </div>
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
              type="submit"
              id="btn-confirm-join-room"
              className="px-6 py-2.5 rounded-sm bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
            >
              <span>CONNECT LIVE ROOM</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

