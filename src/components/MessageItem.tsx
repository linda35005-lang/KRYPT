import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Clock,
  Calendar,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Play,
  Pause,
  Sliders,
  Trash2,
  Sparkles,
  AlertTriangle,
  Smile,
  Plus,
  X,
  Check,
  Video,
  Maximize2,
  Volume2,
} from "lucide-react";
import { EncryptedMessage, UserIdentity, CipherAuditData, ReactionEntry } from "../types";
import { base64ToHex, shredMemory } from "../lib/crypto";

const QUICK_REACTION_EMOJIS = ["🔥", "🔒", "⚡", "👍", "❤️", "👀", "💀", "🛡️"];

const EXTENDED_REACTION_EMOJIS = [
  "🔥", "🔒", "⚡", "👍", "❤️", "👀", "💀", "🛡️",
  "🚀", "💯", "🤝", "🎯", "🔑", "📡", "🧠", "🕶️",
  "💥", "🚨", "🤫", "🤐", "⚠️", "💣", "🦾", "🧪",
  "🎉", "👏", "🙌", "😂", "🥳", "✨", "🛸", "🏆"
];

interface MessageItemProps {
  message: EncryptedMessage;
  userIdentity: UserIdentity;
  dayHeaderLabel?: string;
  searchTerm?: string;
  isSearchFocused?: boolean;
  matchCase?: boolean;
  onBurnMessage: (messageId: string) => void;
  onRevealBurnOnRead: (messageId: string) => void;
  onOpenInspector: (auditData: CipherAuditData) => void;
  onOpenViewOnceModal: (message: EncryptedMessage) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

function highlightText(text: string, query?: string, matchCase: boolean = false): React.ReactNode {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const flags = matchCase ? "g" : "gi";
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, flags);
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = matchCase ? part === q : part.toLowerCase() === q.toLowerCase();
      if (isMatch) {
        return (
          <mark
            key={index}
            className="bg-yellow-400 text-black font-black px-1 py-0.5 rounded-xs shadow-xs"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch {
    return text;
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userIdentity,
  dayHeaderLabel,
  searchTerm,
  isSearchFocused,
  matchCase = false,
  onBurnMessage,
  onRevealBurnOnRead,
  onOpenInspector,
  onOpenViewOnceModal,
  onToggleReaction,
}) => {
  const isMe = message.senderId === userIdentity.id;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(message.decrypted?.audioDuration || 0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showExtendedPicker, setShowExtendedPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Stop audio if message decrypted data is wiped or component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync duration if message.decrypted changes
  useEffect(() => {
    if (message.decrypted?.audioDuration && !audioDuration) {
      setAudioDuration(message.decrypted.audioDuration);
    }
  }, [message.decrypted?.audioDuration]);

  // Audio Playback handler
  const handleToggleAudio = () => {
    if (!message.decrypted?.mediaData) return;

    if (!audioRef.current) {
      const audio = new Audio(message.decrypted.mediaData);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        setAudioCurrentTime(Math.round(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
      };

      audio.onpause = () => {
        setIsPlayingAudio(false);
      };

      audio.onplay = () => {
        setIsPlayingAudio(true);
      };
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Audio play error:", err);
        setIsPlayingAudio(false);
      });
      setIsPlayingAudio(true);
    }
  };

  const handleSeekAudio = (fraction: number) => {
    if (audioRef.current && audioDuration > 0) {
      const seekTo = fraction * audioDuration;
      audioRef.current.currentTime = seekTo;
      setAudioCurrentTime(Math.round(seekTo));
    }
  };

  const formatAudioTime = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Exact timestamp formatting
  const msgDate = new Date(message.createdAt);
  const exactDateFormatted = msgDate.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const exactTimeFormatted = msgDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const fullExactDateTime = `${exactDateFormatted} • ${exactTimeFormatted}`;
  const isoTimestamp = msgDate.toISOString();
  const localizedFullString = msgDate.toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  // Build audit data for inspector
  const auditData: CipherAuditData = {
    messageId: message.id,
    algorithm: "AES-GCM (Galois/Counter Mode)",
    keyLength: 256,
    ivHex: base64ToHex(message.iv),
    ciphertextBase64: message.ciphertext,
    ciphertextLengthBytes: Math.round(message.ciphertext.length * 0.75),
    senderFingerprint: message.senderName,
    recipientFingerprint: isMe ? "Peer" : userIdentity.name,
    ephemeralMode:
      message.ephemeralType === "burn_on_read"
        ? "Burn-on-Read"
        : message.ephemeralType === "timed"
        ? `Timed (${message.ephemeralDuration}s)`
        : message.ephemeralType === "view_once"
        ? "View-Once Media"
        : "Standard Manual",
    timestamp: fullExactDateTime,
  };

  // Render Vaporized / Burned message tombstone
  if (message.isBurned) {
    return (
      <div
        id={`message-burned-${message.id}`}
        className={`flex ${isMe ? "justify-end" : "justify-start"} my-3 select-none animate-fade-in w-full`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#141414] border border-white/10 text-zinc-500 text-xs font-mono font-bold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-red-500" />
          <span>[MESSAGE VAPORIZED • CRYPTOGRAPHIC MEMORY SHREDDED • {exactDateFormatted} {exactTimeFormatted}]</span>
        </div>
      </div>
    );
  }

  // Calculate active reactions with counts
  const activeReactions: Record<string, ReactionEntry[]> = message.reactions || {};
  const activeReactionEntries: [string, ReactionEntry[]][] = (
    Object.entries(activeReactions) as [string, ReactionEntry[]][]
  ).filter(([_, users]) => users && users.length > 0);

  return (
    <div
      id={`message-${message.id}`}
      className={`flex flex-col ${isMe ? "items-end" : "items-start"} my-4 group/msg w-full relative`}
    >
      {/* Header Tag with Bold Monospace Metadata & Exact Date/Time */}
      <div
        className={`flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
          isMe ? "text-green-400" : "text-zinc-500"
        }`}
      >
        <span>{isMe ? "YOU" : message.senderName}</span>
        <span>•</span>
        <span
          className="flex items-center gap-1 cursor-default hover:text-white transition-colors"
          title={`Exact Timestamp: ${localizedFullString} (${isoTimestamp})`}
        >
          <Clock className="w-3 h-3 opacity-70" />
          <span>{exactDateFormatted}</span>
          <span>{exactTimeFormatted}</span>
        </span>

        {message.ephemeralType === "burn_on_read" && (
          <>
            <span>•</span>
            <span className="text-amber-400 font-black">BURN ON READ</span>
          </>
        )}

        {message.ephemeralType === "timed" && message.burnRemainingSec !== undefined && (
          <>
            <span>•</span>
            <span className="text-green-400 font-black">
              EPHEMERAL ({message.burnRemainingSec}S)
            </span>
          </>
        )}

        {message.ephemeralType === "view_once" && (
          <>
            <span>•</span>
            <span className="text-purple-400 font-black">VIEW-ONCE</span>
          </>
        )}
      </div>

      {/* Message Box */}
      <div
        className={`w-full max-w-2xl relative transition-all ${
          isSearchFocused
            ? "ring-2 sm:ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#0A0A0A] shadow-2xl shadow-yellow-400/20"
            : ""
        } ${
          isMe
            ? "bg-white text-black p-4 sm:p-6 rounded-sm shadow-xl"
            : "bg-[#0F0F0F] text-white border-l-4 border-white pl-4 sm:pl-6 pr-4 sm:pr-6 py-4 sm:py-5 rounded-sm border-y border-r border-white/5 shadow-xl"
        }`}
      >
        {/* Floating Emoji Picker Popover */}
        {isPickerOpen && (
          <div
            ref={pickerRef}
            id={`emoji-picker-popover-${message.id}`}
            className={`absolute z-30 ${
              isMe ? "right-2" : "left-2"
            } -top-12 sm:-top-14 bg-[#0A0A0A] border border-white/20 rounded-sm shadow-2xl p-1.5 flex items-center gap-1 animate-fade-in select-none max-w-xs sm:max-w-sm`}
          >
            {/* Quick preset emojis */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {(showExtendedPicker ? EXTENDED_REACTION_EMOJIS : QUICK_REACTION_EMOJIS).map((emoji) => {
                const userReacted = (activeReactions[emoji] || []).some(
                  (u) => u.userId === userIdentity.id || u.userName === userIdentity.name
                );

                return (
                  <button
                    key={emoji}
                    id={`btn-react-${message.id}-${emoji}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleReaction?.(message.id, emoji);
                      setIsPickerOpen(false);
                      setShowExtendedPicker(false);
                    }}
                    title={`React ${emoji}`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-sm text-base sm:text-lg hover:scale-125 transition-transform hover:bg-white/10 ${
                      userReacted ? "bg-green-500/20 border border-green-500/40" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Toggle extended emojis */}
            <button
              id={`btn-toggle-more-emojis-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowExtendedPicker(!showExtendedPicker);
              }}
              title={showExtendedPicker ? "Show less" : "More reactions"}
              className="px-1.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm bg-[#141414] border border-white/15 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              {showExtendedPicker ? "LESS" : "MORE"}
            </button>

            {/* Close button */}
            <button
              id={`btn-close-picker-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsPickerOpen(false);
                setShowExtendedPicker(false);
              }}
              className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Decryption Error Fallback */}
        {message.decryptError && (
          <div className="flex items-center gap-2 text-red-500 text-xs font-mono font-bold uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>CIPHERTEXT DECRYPTION FAILED (CORRUPTED TAG)</span>
          </div>
        )}

        {/* 1. BURN-ON-READ INTERACTIVE CARD */}
        {message.ephemeralType === "burn_on_read" && !message.isRevealed && (
          <div
            id={`btn-reveal-burn-${message.id}`}
            onClick={() => onRevealBurnOnRead(message.id)}
            className={`cursor-pointer border p-4 text-center space-y-2.5 rounded-sm transition-all hover:scale-[1.01] ${
              isMe
                ? "bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200"
                : "bg-[#141414] border-white/20 text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center justify-center gap-2 font-black uppercase text-xs tracking-wider">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>CONFIDENTIAL • BURN ON READ</span>
            </div>
            <p className="text-xs font-mono uppercase text-zinc-500">
              CLICK TO DECRYPT & REVEAL. WILL VAPORIZE FROM MEMORY IN 5 SECONDS.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-black text-white font-black text-xs uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>REVEAL PLAINTEXT</span>
            </div>
          </div>
        )}

        {/* 1.1 BURN-ON-READ REVEALED STATE WITH ACTIVE COUNTDOWN BAR */}
        {message.ephemeralType === "burn_on_read" && message.isRevealed && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase pb-1 border-b border-current opacity-60">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>BURNING FROM MEMORY</span>
              </span>
              <span>{message.burnRemainingSec ?? 5}S LEFT</span>
            </div>

            {/* Content with Bold Typography */}
            <p className="text-lg sm:text-2xl font-bold tracking-tight leading-tight uppercase select-text break-words">
              {highlightText(message.decrypted?.text || "", searchTerm, matchCase)}
            </p>

            {/* Countdown progress line */}
            <div className="w-full bg-zinc-800 h-1.5 overflow-hidden rounded-xs">
              <div
                className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(((message.burnRemainingSec ?? 5) / (message.ephemeralDuration || 5)) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* 2. VIEW-ONCE PHOTO / MEDIA CARD */}
        {message.ephemeralType === "view_once" && (
          <div>
            {message.viewOnceOpened ? (
              <div className="flex items-center gap-2 py-2 px-3 rounded-sm bg-zinc-900 border border-white/10 text-zinc-500 text-xs font-mono font-bold uppercase">
                <EyeOff className="w-4 h-4 text-zinc-500" />
                <span>[VIEW-ONCE MEDIA EXPIRED & SHREDDED]</span>
              </div>
            ) : (
              <div
                id={`btn-open-view-once-${message.id}`}
                onClick={() => onOpenViewOnceModal(message)}
                className={`cursor-pointer border p-4 text-center space-y-2 rounded-sm transition-all hover:scale-[1.01] ${
                  isMe
                    ? "bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200"
                    : "bg-[#141414] border-white/20 text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>VIEW-ONCE ENCRYPTED MEDIA</span>
                </div>
                <p className="text-xs font-mono uppercase text-zinc-500">
                  TAP TO VIEW ENCRYPTED ATTACHMENT. SHREDS IMMEDIATELY UPON CLOSING.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-purple-600 text-white font-black text-xs uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>OPEN CONFIDENTIAL MEDIA</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. STANDARD / TIMED TEXT MESSAGE */}
        {message.ephemeralType !== "burn_on_read" && message.ephemeralType !== "view_once" && (
          <div className="space-y-3">
            {/* Standard Image if any */}
            {message.decrypted?.mediaType === "image" && message.decrypted.mediaData && (
              <div className="rounded-sm overflow-hidden border border-white/20 max-h-72 bg-black">
                <img
                  src={message.decrypted.mediaData}
                  alt="Encrypted attachment"
                  className="w-full h-auto object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Video Memo if any */}
            {message.decrypted?.mediaType === "video" && message.decrypted.mediaData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase opacity-80">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <Video className="w-3.5 h-3.5" />
                    <span>ENCRYPTED VIDEO DISPATCH</span>
                  </span>
                  {message.decrypted.videoDuration && (
                    <span>{message.decrypted.videoDuration}S CLIP</span>
                  )}
                </div>

                <div className="rounded-sm overflow-hidden border border-purple-500/40 bg-black max-h-80 relative group">
                  <video
                    src={message.decrypted.mediaData}
                    controls
                    playsInline
                    className="w-full h-auto max-h-72 object-contain mx-auto"
                  />
                </div>
              </div>
            )}

            {/* Audio Memo */}
            {message.decrypted?.mediaType === "audio" && message.decrypted.mediaData && (
              <div
                className={`flex items-center gap-3 p-3 rounded-sm border select-none ${
                  isMe
                    ? "bg-zinc-100 border-zinc-300 text-black"
                    : "bg-[#141414] border-white/15 text-white"
                }`}
              >
                <button
                  type="button"
                  id={`btn-play-audio-${message.id}`}
                  onClick={handleToggleAudio}
                  title={isPlayingAudio ? "Pause Audio" : "Play Encrypted Audio"}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-transform hover:scale-105 cursor-pointer flex-shrink-0 ${
                    isMe ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs font-mono font-bold uppercase">
                    <span className="flex items-center gap-1.5 truncate">
                      <span>VOICE DISPATCH</span>
                      {isPlayingAudio && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] opacity-80 flex-shrink-0 ml-2">
                      {audioDuration > 0
                        ? `${formatAudioTime(audioCurrentTime)} / ${formatAudioTime(audioDuration)}`
                        : `${formatAudioTime(audioCurrentTime)}`}
                    </span>
                  </div>

                  {/* Interactive Waveform bars with click-to-seek */}
                  <div
                    className="flex items-center gap-1 h-6 mt-1.5 cursor-pointer group/wave py-1"
                    title="Click bar to seek audio position"
                  >
                    {[35, 65, 90, 60, 30, 80, 100, 50, 40, 85, 95, 60, 40, 75, 50, 90, 45, 70].map(
                      (h, idx) => {
                        const barCount = 18;
                        const fraction = idx / barCount;
                        const activeFraction = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                        const isPlayed = fraction <= activeFraction;

                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeekAudio(fraction);
                            }}
                            className={`w-1.5 rounded-xs transition-all hover:scale-y-125 ${
                              isPlayed
                                ? isMe
                                  ? "bg-black"
                                  : "bg-green-400"
                                : isPlayingAudio
                                ? isMe
                                  ? "bg-zinc-400"
                                  : "bg-zinc-500 animate-pulse"
                                : isMe
                                ? "bg-zinc-300"
                                : "bg-zinc-700"
                            }`}
                            style={{ height: `${h}%` }}
                          ></div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Plaintext with Bold Display Typography */}
            {message.decrypted?.text && (
              <p
                className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight leading-tight uppercase select-text break-words ${
                  isMe ? "text-black" : "text-white"
                }`}
              >
                {highlightText(message.decrypted.text, searchTerm, matchCase)}
              </p>
            )}

            {/* Timed countdown indicator bar */}
            {message.ephemeralType === "timed" && message.burnRemainingSec !== undefined && (
              <div className="pt-1.5 space-y-1">
                <div className="w-full bg-zinc-800 rounded-xs h-1 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${((message.burnRemainingSec / (message.ephemeralDuration || 10)) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Interactive Emoji Reaction Pills Row */}
        {activeReactionEntries.length > 0 && (
          <div
            id={`message-reactions-row-${message.id}`}
            className="flex flex-wrap items-center gap-1.5 pt-2.5 select-none"
          >
            {activeReactionEntries.map(([emoji, users]) => {
              const hasReacted = users.some(
                (u) => u.userId === userIdentity.id || u.userName === userIdentity.name
              );
              const userNamesList = users
                .map((u) => (u.userId === userIdentity.id ? "You" : u.userName))
                .join(", ");

              return (
                <button
                  key={emoji}
                  id={`reaction-pill-${message.id}-${emoji}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction?.(message.id, emoji);
                  }}
                  title={`Reacted by: ${userNamesList} (Click to toggle)`}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer ${
                    hasReacted
                      ? isMe
                        ? "bg-black text-white border border-black shadow-xs font-bold"
                        : "bg-green-500/20 text-green-300 border border-green-500/50 shadow-xs font-bold"
                      : isMe
                      ? "bg-zinc-200 text-zinc-800 border border-zinc-300 hover:bg-zinc-300"
                      : "bg-[#141414] text-zinc-300 border border-white/15 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span className="text-[11px] font-mono font-bold leading-none">{users.length}</span>
                </button>
              );
            })}

            {/* Quick add inline reaction pill button */}
            <button
              id={`btn-add-inline-reaction-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsPickerOpen(!isPickerOpen);
              }}
              title="Add emoji reaction"
              className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs transition-colors cursor-pointer ${
                isMe
                  ? "border-zinc-300 text-zinc-600 hover:bg-zinc-200 hover:text-black"
                  : "border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Message Footer: Security Tag, IV, Exact Timestamp, Inspector, Emoji React, Burn */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-3 border-t text-[10px] font-mono font-bold uppercase tracking-wider ${
            isMe
              ? "border-zinc-300 text-zinc-600"
              : "border-white/10 text-zinc-500"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span>AES-256-GCM</span>
            </span>
            <span>/</span>
            <span>IV: {message.iv.substring(0, 6)}</span>
            <span>/</span>
            <span
              className="flex items-center gap-1 hover:text-white transition-colors cursor-default"
              title={`Sent at exact local time: ${localizedFullString} • ISO: ${isoTimestamp}`}
            >
              <Clock className="w-3 h-3 opacity-80" />
              <span>{exactDateFormatted}</span>
              <span>{exactTimeFormatted}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Add Reaction Button */}
            <button
              id={`btn-react-message-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsPickerOpen(!isPickerOpen);
              }}
              className={`p-1 rounded-sm transition-colors cursor-pointer ${
                isPickerOpen
                  ? isMe
                    ? "bg-zinc-300 text-black"
                    : "bg-white/20 text-white"
                  : isMe
                  ? "hover:bg-zinc-200 text-zinc-700 hover:text-black"
                  : "hover:bg-white/10 text-zinc-400 hover:text-white"
              }`}
              title="Add emoji reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Cryptographic Inspector Button */}
            <button
              id={`btn-inspect-message-${message.id}`}
              onClick={() => onOpenInspector(auditData)}
              className={`p-1 rounded-sm transition-colors cursor-pointer ${
                isMe ? "hover:bg-zinc-200 text-black" : "hover:bg-white/10 text-white"
              }`}
              title="Inspect raw ciphertext and cryptographic audit details"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Burn / Shred Message Button */}
            <button
              id={`btn-burn-message-${message.id}`}
              onClick={() => onBurnMessage(message.id)}
              className={`p-1 rounded-sm transition-colors cursor-pointer ${
                isMe ? "hover:bg-zinc-200 text-red-600" : "hover:bg-white/10 text-red-400"
              }`}
              title="Burn & permanently shred this message from memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


