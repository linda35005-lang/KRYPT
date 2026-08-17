import React, { useState } from "react";
import {
  Sliders,
  Palette,
  Eye,
  Check,
  X,
  Phone,
  Monitor,
  Sparkles,
  Zap,
  Terminal,
  ShieldCheck,
  Save,
  Volume2,
  VolumeX,
  Bell,
  Play,
  Radio,
} from "lucide-react";
import { AppTheme, UserSettings, UserIdentity, SoundType } from "../types";
import { playIncomingMessageSound } from "../lib/soundFx";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  currentUser: UserIdentity | null;
  onUpdatePhoneNumber: (phone: string) => Promise<void>;
}

const THEME_OPTIONS: {
  id: AppTheme;
  name: string;
  subtitle: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  accentHex: string;
  previewClass: string;
}[] = [
  {
    id: "stealth-dark",
    name: "Stealth Dark",
    subtitle: "Default high-contrast obsidian canvas with green cryptographic accents",
    bgHex: "#0A0A0A",
    borderHex: "#3F3F46",
    textHex: "#FFFFFF",
    accentHex: "#22C55E",
    previewClass: "bg-[#0A0A0A] border-white/20 text-white",
  },
  {
    id: "terminal-green",
    name: "Terminal Green",
    subtitle: "Retro matrix phosphor CRT terminal with vivid emerald green glow",
    bgHex: "#020A04",
    borderHex: "#00FF66",
    textHex: "#00FF66",
    accentHex: "#00FF66",
    previewClass: "bg-[#020A04] border-[#00FF66]/50 text-[#00FF66]",
  },
  {
    id: "monochrome",
    name: "Monochrome (B&W)",
    subtitle: "Pure stark black and white with 21:1 ultra high contrast ratio",
    bgHex: "#000000",
    borderHex: "#FFFFFF",
    textHex: "#FFFFFF",
    accentHex: "#FFFFFF",
    previewClass: "bg-black border-white text-white",
  },
  {
    id: "amber-crt",
    name: "Amber Phosphor",
    subtitle: "Tactical command center vintage amber CRT phosphor display",
    bgHex: "#0A0600",
    borderHex: "#FFB000",
    textHex: "#FFB000",
    accentHex: "#FFB000",
    previewClass: "bg-[#0A0600] border-[#FFB000]/50 text-[#FFB000]",
  },
  {
    id: "cyber-cyan",
    name: "Cyber Cyan",
    subtitle: "Ice blueprint military HUD with electric neon cyan highlights",
    bgHex: "#030712",
    borderHex: "#00F0FF",
    textHex: "#00F0FF",
    accentHex: "#00F0FF",
    previewClass: "bg-[#030712] border-[#00F0FF]/50 text-[#00F0FF]",
  },
];

const SOUND_PROFILES: {
  id: SoundType;
  name: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: "stealth-sonar",
    name: "Stealth Sonar",
    desc: "Subtle tactical lowpass harmonic frequency pulse",
    badge: "520Hz SUB-SONAR",
  },
  {
    id: "crypto-chirp",
    name: "Crypto Chirp",
    desc: "Dual-tone high-frequency cryptographic handshake ping",
    badge: "1760Hz DUAL CHIRP",
  },
  {
    id: "quantum-pulse",
    name: "Quantum Pulse",
    desc: "Clean digital saw-sine hybrid transient blip",
    badge: "880Hz QUANTUM",
  },
  {
    id: "minimal-click",
    name: "Minimal Click",
    desc: "Dry tactile mechanical switch micro-burst",
    badge: "TACTILE CLICK",
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentUser,
  onUpdatePhoneNumber,
}) => {
  const [phoneNumberInput, setPhoneNumberInput] = useState(currentUser?.phoneNumber || "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    setPhoneSaveSuccess(false);
    try {
      await onUpdatePhoneNumber(phoneNumberInput.trim());
      setPhoneSaveSuccess(true);
      setTimeout(() => setPhoneSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update phone:", err);
    } finally {
      setIsSavingPhone(false);
    }
  };

  return (
    <div
      id="modal-user-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in font-sans select-none overflow-y-auto"
    >
      <div className="relative max-w-xl w-full bg-[#0F0F0F] border border-white/20 rounded-sm shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-white text-black flex items-center justify-center font-black">
              <Sliders className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                USER SETTINGS & APPEARANCE
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                HIGH-CONTRAST THEMES & GLOBAL PHONE DISCOVERY
              </p>
            </div>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Color Themes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                  HIGH-CONTRAST COLOR THEMES
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                SELECT OPTICAL PROFILE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    id={`btn-theme-${theme.id}`}
                    onClick={() => onUpdateSettings({ theme: theme.id })}
                    className={`text-left p-3.5 rounded-sm border transition-all flex flex-col justify-between relative cursor-pointer ${
                      isSelected
                        ? "border-white bg-[#1A1A1A] ring-1 ring-white shadow-lg"
                        : "border-white/10 bg-[#121212] hover:border-white/30 hover:bg-[#161616]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        {/* Swatch */}
                        <div
                          className="w-4 h-4 rounded-full border border-white/30 shadow-xs"
                          style={{ backgroundColor: theme.accentHex }}
                        />
                        <span className="font-black text-sm uppercase tracking-tight text-white">
                          {theme.name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-white text-black px-1.5 py-0.5 rounded-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {theme.subtitle}
                    </p>

                    {/* Visual mini specimen */}
                    <div
                      className={`mt-2.5 px-2.5 py-1 rounded-xs border text-[10px] font-mono uppercase font-bold flex items-center justify-between ${theme.previewClass}`}
                    >
                      <span>E2EE DISPATCH</span>
                      <span className="tracking-widest">● AES-256</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Display & Typography Modifiers */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                DISPLAY & OPTICAL MODIFIERS
              </span>
            </div>

            <div className="space-y-2">
              {/* Scanlines Option */}
              <div className="p-3 bg-[#141414] border border-white/10 rounded-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-xs uppercase text-white">CRT SCANLINES OVERLAY</div>
                  <div className="text-[11px] text-zinc-400">
                    Simulate retro high-contrast cathode ray scanlines and phosphor bloom
                  </div>
                </div>
                <button
                  id="toggle-scanlines"
                  onClick={() => onUpdateSettings({ scanlines: !settings.scanlines })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.scanlines ? "bg-white" : "bg-zinc-800 border border-white/20"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform absolute top-1 ${
                      settings.scanlines ? "right-1 bg-black" : "left-1 bg-zinc-500"
                    }`}
                  />
                </button>
              </div>

              {/* Full Monospace Mode */}
              <div className="p-3 bg-[#141414] border border-white/10 rounded-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-xs uppercase text-white">PURE MONOSPACE FONT</div>
                  <div className="text-[11px] text-zinc-400">
                    Render entire interface using JetBrains Mono tactical glyphs
                  </div>
                </div>
                <button
                  id="toggle-monospace"
                  onClick={() => onUpdateSettings({ monospaceMode: !settings.monospaceMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.monospaceMode ? "bg-white" : "bg-zinc-800 border border-white/20"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform absolute top-1 ${
                      settings.monospaceMode ? "right-1 bg-black" : "left-1 bg-zinc-500"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Encrypted Event Audio Alerts */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                  ENCRYPTED EVENT NOTIFICATION SOUNDS
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase bg-white/10 text-white px-1.5 py-0.5 rounded-xs font-bold">
                SYNTHESIZED OFFLINE
              </span>
            </div>

            {/* Master Toggle */}
            <div className="p-3 bg-[#141414] border border-white/10 rounded-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-black text-xs uppercase text-white flex items-center gap-2">
                  {settings.soundAlerts ? (
                    <Volume2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span>INCOMING DISPATCH AUDIO ALERTS</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Play subtle hardware-synthesized acoustic cues for incoming messages and encrypted calls
                </div>
              </div>
              <button
                type="button"
                id="toggle-sound-alerts"
                onClick={() => onUpdateSettings({ soundAlerts: !settings.soundAlerts })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  settings.soundAlerts ? "bg-white" : "bg-zinc-800 border border-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-transform absolute top-1 ${
                    settings.soundAlerts ? "right-1 bg-black" : "left-1 bg-zinc-500"
                  }`}
                />
              </button>
            </div>

            {/* Sound Profiles & Volume (only if enabled) */}
            {settings.soundAlerts && (
              <div className="space-y-3 p-3.5 bg-[#101010] border border-white/10 rounded-sm animate-fade-in">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400 uppercase">
                  <span>SELECT ACOUSTIC PROFILE</span>
                  <button
                    type="button"
                    id="btn-test-sound-alert"
                    onClick={() =>
                      playIncomingMessageSound(
                        settings.soundType || "stealth-sonar",
                        settings.soundVolume ?? 70
                      )
                    }
                    className="px-2 py-1 rounded-xs bg-white text-black font-black text-[10px] uppercase hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Play className="w-2.5 h-2.5 fill-black" />
                    <span>TEST SOUND</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SOUND_PROFILES.map((profile) => {
                    const isSelected = (settings.soundType || "stealth-sonar") === profile.id;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        id={`btn-sound-profile-${profile.id}`}
                        onClick={() => {
                          onUpdateSettings({ soundType: profile.id });
                          playIncomingMessageSound(profile.id, settings.soundVolume ?? 70);
                        }}
                        className={`text-left p-2.5 rounded-sm border transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-green-400 bg-green-950/20 text-white"
                            : "border-white/10 bg-[#141414] text-zinc-300 hover:border-white/30 hover:bg-[#181818]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-xs uppercase">{profile.name}</span>
                          <span className="text-[9px] font-mono bg-black px-1.5 py-0.5 rounded-xs text-zinc-400 border border-white/10">
                            {profile.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{profile.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Volume Slider */}
                <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 flex-shrink-0">
                    VOLUME: {settings.soundVolume ?? 70}%
                  </span>
                  <input
                    type="range"
                    id="input-settings-sound-volume"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.soundVolume ?? 70}
                    onChange={(e) =>
                      onUpdateSettings({ soundVolume: parseInt(e.target.value, 10) })
                    }
                    className="flex-1 accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Global Phone Number Registry */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                  GLOBAL PHONE NUMBER DISCOVERY
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-xs font-bold">
                E.164 GLOBAL
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Link a global phone number or alias to your cryptographic identity. Other operatives worldwide can search and initiate direct E2EE tunnels with you using just your phone number.
            </p>

            <form onSubmit={handleSavePhone} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="input-settings-phone"
                    type="text"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    placeholder="+1 (555) 019-2834 or +44 20 7946 0912"
                    className="w-full bg-black border border-white/15 rounded-sm pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase font-bold"
                  />
                </div>
                <button
                  type="submit"
                  id="btn-save-phone-settings"
                  disabled={isSavingPhone}
                  className="px-4 py-2.5 rounded-sm bg-white text-black font-black uppercase text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPhone ? "SAVING..." : "UPDATE"}</span>
                </button>
              </div>

              {phoneSaveSuccess && (
                <div className="p-2.5 rounded-sm bg-green-950/60 border border-green-500/50 text-green-300 text-xs font-mono flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Global phone number linked. Ready for phone-based searches!</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>Theme & preferences cached locally in encrypted storage</span>
          </div>

          <button
            id="btn-done-settings"
            onClick={onClose}
            className="px-5 py-2 rounded-sm bg-white text-black font-black uppercase text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
