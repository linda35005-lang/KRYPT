import React from "react";
import {
  ShieldCheck,
  Flame,
  KeyRound,
  Radio,
  EyeOff,
  Eye,
  Sliders,
  Sparkles,
  Lock,
  Zap,
  Phone,
  Palette,
} from "lucide-react";
import { EphemeralType, UserIdentity, AppTheme } from "../types";

interface NavbarProps {
  userIdentity: UserIdentity;
  activePeerName: string;
  activePeerFingerprint: string;
  isLiveRoom: boolean;
  globalEphemeral: EphemeralType;
  globalDuration: number;
  onSelectEphemeral: (type: EphemeralType, duration: number) => void;
  onOpenSafetyNumber: () => void;
  onOpenInspector: () => void;
  onOpenLiveRoom: () => void;
  onOpenPanicWipe: () => void;
  privacyVeilActive: boolean;
  onTogglePrivacyVeil: () => void;
  burnedCount: number;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenDirectory: () => void;
  onOpenPhoneSearch?: () => void;
  onOpenSettings?: () => void;
  currentTheme?: AppTheme;
}

export const Navbar: React.FC<NavbarProps> = ({
  userIdentity,
  activePeerName,
  activePeerFingerprint,
  isLiveRoom,
  globalEphemeral,
  globalDuration,
  onSelectEphemeral,
  onOpenSafetyNumber,
  onOpenInspector,
  onOpenLiveRoom,
  onOpenPanicWipe,
  privacyVeilActive,
  onTogglePrivacyVeil,
  burnedCount,
  onOpenAuth,
  onOpenProfile,
  onOpenDirectory,
  onOpenPhoneSearch,
  onOpenSettings,
  currentTheme = "stealth-dark",
}) => {
  const getEphemeralLabel = () => {
    if (globalEphemeral === "off") return "MANUAL";
    if (globalEphemeral === "burn_on_read") return "BURN ON READ";
    if (globalEphemeral === "view_once") return "VIEW ONCE";
    if (globalDuration < 60) return `${globalDuration}S AUTO-BURN`;
    if (globalDuration < 3600) return `${Math.round(globalDuration / 60)}M AUTO-BURN`;
    return `${Math.round(globalDuration / 3600)}H AUTO-BURN`;
  };

  const getThemeTag = () => {
    switch (currentTheme) {
      case "terminal-green":
        return "MATRIX CRT";
      case "monochrome":
        return "B&W 21:1";
      case "amber-crt":
        return "AMBER CRT";
      case "cyber-cyan":
        return "ICE BLUE";
      default:
        return "STEALTH";
    }
  };

  return (
    <header
      id="ghosttext-main-navbar"
      className="bg-[#0A0A0A] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 select-none text-white z-30 sticky top-0"
    >
      {/* Brand Identity & Bold Headline */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic uppercase leading-none text-white">
                KRYPT
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/5 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                <span className="text-[9px] font-mono font-bold tracking-widest text-green-400 uppercase">
                  {getThemeTag()}
                </span>
              </div>
            </div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold mt-0.5">
              End-to-End Encrypted • Zero-Knowledge
            </p>
          </div>
        </div>
      </div>

      {/* Center status: Cryptographic verification indicator */}
      <div className="hidden lg:flex items-center gap-3 bg-[#0F0F0F] border border-white/10 px-3.5 py-1.5 rounded-sm text-xs font-mono">
        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Target:</span>
        <span className="font-bold text-white uppercase tracking-tight">
          {activePeerName}
        </span>
        <span className="text-zinc-700">/</span>
        <button
          id="btn-safety-verify-nav"
          onClick={onOpenSafetyNumber}
          title="Verify Cryptographic Safety Number"
          className="flex items-center gap-1 text-green-400 hover:text-green-300 font-bold transition-colors uppercase tracking-wider text-[11px] cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-green-400" />
          <span>KEY: {activePeerFingerprint || "VERIFIED"}</span>
        </button>
        {burnedCount > 0 && (
          <>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase text-[10px]">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{burnedCount} PURGED</span>
            </div>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Global Phone Search Shortcut Button */}
        <button
          id="btn-nav-global-phone"
          onClick={onOpenPhoneSearch || onOpenDirectory}
          title="Global Phone Number Search & Direct E2EE Connect"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-bold font-mono uppercase bg-[#141414] border border-white/15 text-green-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-green-400" />
          <span className="hidden md:inline">GLOBAL PHONE</span>
        </button>

        {/* Ephemeral Mode Selector */}
        <div className="relative group">
          <button
            id="btn-ephemeral-quick-selector"
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold font-mono uppercase bg-[#141414] border border-white/15 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:text-black" />
            <span>{getEphemeralLabel()}</span>
          </button>
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#0F0F0F] border border-white/20 rounded-sm shadow-2xl p-2 hidden group-hover:block hover:block z-50">
            <div className="text-[9px] font-black tracking-[0.2em] text-zinc-500 uppercase px-2 py-1 border-b border-white/10 mb-1">
              EPHEMERAL BURN MODE
            </div>
            <button
              id="opt-ephemeral-off"
              onClick={() => onSelectEphemeral("off", 0)}
              className={`w-full text-left px-3 py-2 text-xs rounded-sm font-bold uppercase transition-colors flex items-center justify-between cursor-pointer ${
                globalEphemeral === "off"
                  ? "bg-white text-black"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>MANUAL RETENTION (OFF)</span>
            </button>
            <button
              id="opt-ephemeral-burn"
              onClick={() => onSelectEphemeral("burn_on_read", 5)}
              className={`w-full text-left px-3 py-2 text-xs rounded-sm font-bold uppercase transition-colors flex items-center justify-between cursor-pointer ${
                globalEphemeral === "burn_on_read"
                  ? "bg-white text-black"
                  : "text-amber-300 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>BURN ON READ (5S)</span>
              </span>
              <span className="text-[9px] font-mono bg-amber-500/20 px-1 py-0.5 rounded-xs">STEALTH</span>
            </button>
            <div className="border-t border-white/10 my-1"></div>
            {[
              { label: "10 SECONDS", type: "timed" as EphemeralType, dur: 10 },
              { label: "30 SECONDS", type: "timed" as EphemeralType, dur: 30 },
              { label: "1 MINUTE", type: "timed" as EphemeralType, dur: 60 },
              { label: "5 MINUTES", type: "timed" as EphemeralType, dur: 300 },
              { label: "1 HOUR", type: "timed" as EphemeralType, dur: 3600 },
              { label: "24 HOURS", type: "timed" as EphemeralType, dur: 86400 },
            ].map((opt) => (
              <button
                key={opt.dur}
                id={`opt-ephemeral-${opt.dur}s`}
                onClick={() => onSelectEphemeral(opt.type, opt.dur)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-sm font-bold font-mono uppercase transition-colors flex items-center justify-between cursor-pointer ${
                  globalEphemeral === "timed" && globalDuration === opt.dur
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Multi-User Room Button */}
        <button
          id="btn-live-room-relay"
          onClick={onOpenLiveRoom}
          title="Create or Join Live Encrypted Relay Room"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold font-mono uppercase transition-colors border cursor-pointer ${
            isLiveRoom
              ? "bg-white text-black border-white"
              : "bg-[#141414] border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isLiveRoom ? "text-black animate-pulse" : "text-zinc-400"}`} />
          <span className="hidden sm:inline">{isLiveRoom ? "ROOM ACTIVE" : "RELAY"}</span>
        </button>

        {/* User Account / Enclave Vault Badge */}
        {userIdentity.isRegistered ? (
          <button
            id="btn-nav-user-account"
            onClick={onOpenProfile}
            title="View Authenticated Operative Profile & Enclave Keys"
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-black font-mono uppercase bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-green-600"></span>
            <span>@{userIdentity.username}</span>
          </button>
        ) : (
          <button
            id="btn-nav-authenticate"
            onClick={onOpenAuth}
            title="Register or Log In to Host-Proof Cryptographic Enclave"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-black font-mono uppercase bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>AUTHENTICATE</span>
          </button>
        )}

        {/* User Settings & High-Contrast Themes Button */}
        {onOpenSettings && (
          <button
            id="btn-open-settings-modal"
            onClick={onOpenSettings}
            title="Appearance, High-Contrast Themes & Global Phone Settings"
            className="p-1.5 rounded-sm bg-[#141414] border border-white/15 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Palette className="w-4 h-4 text-zinc-300" />
          </button>
        )}

        {/* Crypto Inspector Button */}
        <button
          id="btn-open-crypto-inspector"
          onClick={onOpenInspector}
          title="Inspect AES-GCM Ciphertext & WebCrypto Keys"
          className="p-1.5 rounded-sm bg-[#141414] border border-white/15 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Camouflage / Privacy Veil Anti-Shoulder Surfing */}
        <button
          id="btn-toggle-privacy-veil"
          onClick={onTogglePrivacyVeil}
          title={privacyVeilActive ? "Disable Camouflage Shield" : "Enable Anti-Screen Capture Camouflage"}
          className={`p-1.5 rounded-sm transition-colors border cursor-pointer ${
            privacyVeilActive
              ? "bg-white text-black border-white"
              : "bg-[#141414] border-white/15 text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          {privacyVeilActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Panic Wipe / Emergency Vault Vaporizer */}
        <button
          id="btn-emergency-panic-wipe"
          onClick={onOpenPanicWipe}
          title="Emergency Panic Nuke: Instant Memory Zeroing & Vault Purge"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden md:inline">PANIC WIPE</span>
        </button>
      </div>
    </header>
  );
};


